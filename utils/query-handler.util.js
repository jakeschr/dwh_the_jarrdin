const mysql = require("mysql2/promise");
const { Client: PgClient } = require("pg");
const { MongoClient } = require("mongodb");
const sql = require("mssql");
const odbc = require("odbc");
const oracledb = require("oracledb");
const fs = require("fs");

const queryHandler = {
	async openConnection(config) {
		const { dialect, driver } = config;
		const type = `${dialect}-${driver}`;

		const connectODBC = async (config) => {
			try {
				if (!config.dsn) throw new Error("ODBC connection requires 'dsn'");
				let connStr = `DSN=${config.dsn}`;
				if (config.username) connStr += `;UID=${config.username}`;
				if (config.password) connStr += `;PWD=${config.password}`;
				return await odbc.connect(connStr);
			} catch (error) {
				throw error;
			}
		};

		try {
			switch (type) {
				// --- MySQL ---
				case "mysql-native":
					return await mysql.createConnection({
						multipleStatements: true,
						host: config.host,
						port: config.port,
						user: config.username,
						password: config.password,
						database: config.database,
						...config.options,
					});

				case "mysql-odbc":
					return await connectODBC(config);

				// --- PostgreSQL ---
				case "postgres-native": {
					const connection = new PgClient({
						host: config.host,
						port: config.port,
						user: config.username,
						password: config.password,
						database: config.database,
						...config.options,
					});
					await connection.connect();
					return connection;
				}

				case "postgres-odbc":
					return await connectODBC(config);

				// --- SQL Server ---
				case "sqlserver-native":
					return await sql.connect({
						server: config.host,
						port: config.port,
						user: config.username,
						password: config.password,
						database: config.database,
						options: {
							enableArithAbort: true,
							trustServerCertificate: true,
							...config.options,
						},
					});

				case "sqlserver-odbc":
					return await connectODBC(config);

				// --- Oracle ---
				case "oracle-native":
					return await oracledb.getConnection({
						user: config.username,
						password: config.password,
						connectString: `${config.host}:${config.port}/${config.database}`,
						...config.options,
					});

				case "oracle-odbc":
					return await connectODBC(config);

				// --- Sybase via ODBC ---
				case "sybase-odbc":
					return await connectODBC(config);

				// --- MongoDB ---
				case "mongodb-native":
					if (!config.connection_uri)
						throw new Error("MongoDB requires 'connection_uri'");
					const mongo = new MongoClient(config.connection_uri);
					await mongo.connect();
					return mongo;

				default:
					throw new Error(
						`Unsupported combination: dialect=${dialect}, driver=${driver}`
					);
			}
		} catch (err) {
			console.error(err);

			throw new Error(`Failed to connect to ${dialect} (${driver}):`, err);
		}
	},

	async closeConnection(connection, dialect) {
		try {
			if (dialect === "mysql" || dialect === "postgres") {
				await connection.end();
			} else if (dialect === "mongodb") {
				await connection.close();
			} else if (typeof connection.close === "function") {
				await connection.close();
			} else if (typeof connection.disconnect === "function") {
				await connection.disconnect();
			}
		} catch (error) {
			console.error(`Error closing ${dialect} connection:`, error.message);
		}
	},

	async databaseInfo(connection, dialect, databaseName) {
		if (!connection || !dialect) {
			throw new Error("Koneksi dan dialect harus diberikan.");
		}

		const result = [];

		try {
			switch (dialect) {
				case "mysql": {
					const [tables] = await connection.query(
						`SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
						[databaseName]
					);

					for (const row of tables) {
						const table = row.table_name;
						const [cols] = await connection.query(
							`SELECT column_name AS name, column_type AS type, is_nullable FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`,
							[databaseName, table]
						);

						result.push({
							name: table,
							columns: cols.map((c) => ({
								name: c.name,
								type: c.type,
								null: c.is_nullable !== "NO",
							})),
						});
					}
					break;
				}

				case "postgres": {
					const tables = await connection.query(
						`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
					);

					for (const row of tables.rows) {
						const table = row.table_name;
						const cols = await connection.query(
							`SELECT column_name AS name, data_type AS type, is_nullable FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
							[table]
						);

						result.push({
							name: table,
							columns: cols.rows.map((c) => ({
								name: c.name,
								type: c.type,
								null: c.is_nullable !== "NO",
							})),
						});
					}
					break;
				}

				case "sqlserver": {
					const tables = await connection
						.request()
						.query(
							`SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE'`
						);

					for (const row of tables.recordset) {
						const table = row.table_name;
						const cols = await connection
							.request()
							.query(
								`SELECT column_name AS name, data_type AS type, is_nullable FROM information_schema.columns WHERE table_name = '${table}'`
							);

						result.push({
							name: table,
							columns: cols.recordset.map((c) => ({
								name: c.name,
								type: c.type,
								null: c.is_nullable !== "NO",
							})),
						});
					}
					break;
				}

				case "oracle": {
					const tables = await connection.execute(
						`SELECT table_name FROM user_tables`
					);
					for (const [table] of tables.rows) {
						const cols = await connection.execute(
							`SELECT column_name AS name, data_type AS type, nullable FROM user_tab_columns WHERE table_name = :1`,
							[table]
						);

						result.push({
							name: table,
							columns: cols.rows.map(([name, type, nullable]) => ({
								name,
								type,
								null: nullable === "Y",
							})),
						});
					}
					break;
				}

				case "sybase": {
					const resTables = await connection.query(`
							 SELECT table_id, table_name
							 FROM systable
							 WHERE table_type = 'BASE' AND creator = USER_ID()
						`);

					const tables = resTables.map((row) => ({
						id: row.table_id,
						name: row.table_name,
					}));

					for (const { id: tableId, name: tableName } of tables) {
						const resCols = await connection.query(
							`
								  SELECT c.column_name, c."nulls", d.domain_name AS type, CAST(c.width AS int) AS width
								  FROM syscolumn c
								  LEFT JOIN sysdomain d ON c.domain_id = d.domain_id
								  WHERE c.table_id = ?
								  ORDER BY c.column_id
							 `,
							[tableId]
						);

						const columns = resCols.map((col) => {
							const typeLower = col.type ? col.type.toLowerCase() : "unknown";
							let typeString;
							if (
								["varchar", "char", "nvarchar", "nchar"].includes(typeLower)
							) {
								typeString = `${typeLower}(${col.width})`;
							} else if (
								["bigint", "int", "integer", "smallint"].includes(typeLower)
							) {
								typeString = `${typeLower}(${col.width})`;
							} else {
								typeString = typeLower;
							}

							return {
								name: col.column_name,
								type: typeString,
								null: col.nulls === "Y",
							};
						});

						result.push({
							name: tableName,
							columns,
						});
					}
					break;
				}

				case "mongodb": {
					const db = connection.db(databaseName);
					const collections = await db.listCollections().toArray();
					for (const col of collections) {
						const sample = await db.collection(col.name).findOne();
						const columns = Object.entries(sample || {}).map(([key, val]) => ({
							name: key,
							type: typeof val,
							null: val === null,
						}));
						result.push({
							name: col.name,
							columns,
						});
					}
					break;
				}

				default:
					throw new Error(
						`Dialect '${dialect}' belum didukung secara eksplisit.`
					);
			}

			return result;
		} catch (error) {
			throw error;
		}
	},

	async createTable(tables, connection) {
		try {
			const createQuery = tables.map((table) => {
				const { name, columns } = table;

				let hasLoadTimestamp = false;

				const adjustedColumns = columns.map((col) => {
					if (col.name === "load_timestamp") {
						hasLoadTimestamp = true;
						// Langsung paksa sesuai ketentuan tanpa cek
						return `  \`load_timestamp\` BIGINT(20) NOT NULL`;
					} else {
						const nullable = col.null === false ? "NOT NULL" : "NULL";
						return `  \`${col.name}\` ${col.type} ${nullable}`;
					}
				});

				if (!hasLoadTimestamp) {
					adjustedColumns.push(`  \`load_timestamp\` BIGINT(20) NOT NULL`);
				}
				

				const tableDef = adjustedColumns;

				return `CREATE TABLE IF NOT EXISTS \`${name}\` (\n${tableDef.join(
					",\n"
				)}\n);`;
			});

			const fullQuery = ["START TRANSACTION;", ...createQuery, "COMMIT;"].join(
				"\n\n"
			);

			await connection.query(fullQuery);

			return fullQuery;
		} catch (error) {
			throw error;
		}
	},
};

module.exports = { queryHandler };
