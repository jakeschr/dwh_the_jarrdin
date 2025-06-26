const mysql = require("mysql2/promise");
const { Client: PgClient } = require("pg");
const { MongoClient } = require("mongodb");
const sql = require("mssql");
const odbc = require("odbc");
const oracledb = require("oracledb");

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
			throw new Error(
				`Failed to connect to ${dialect} (${driver}): ${err.message}`
			);
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

		const result = {
			database: databaseName || null,
			tables: [],
		};

		const normalizeColumn = (col) => ({
			name: col.name,
			type: col.type,
			null: col.nullable,
		});

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
						const [pks] = await connection.query(
							`SELECT column_name FROM information_schema.key_column_usage WHERE table_schema = ? AND table_name = ? AND constraint_name = 'PRIMARY'`,
							[databaseName, table]
						);
						result.tables.push({
							name: table,
							pk: pks.map((r) => r.column_name),
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
						const pk = await connection.query(
							`SELECT a.attname AS column_name
							 FROM pg_index i
							 JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
							 WHERE i.indrelid = $1::regclass AND i.indisprimary`,
							[table]
						);

						result.tables.push({
							name: table,
							pk: pk.rows.map((r) => r.column_name),
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
						const pks = await connection
							.request()
							.query(
								`SELECT column_name FROM information_schema.key_column_usage WHERE table_name = '${table}' AND constraint_name LIKE 'PK_%'`
							);
						result.tables.push({
							name: table,
							pk: pks.recordset.map((r) => r.column_name),
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
						const pks = await connection.execute(
							`SELECT cols.column_name
							 FROM all_constraints cons
							 JOIN all_cons_columns cols ON cons.constraint_name = cols.constraint_name
							 WHERE cons.constraint_type = 'P' AND cons.table_name = :1`,
							[table]
						);
						result.tables.push({
							name: table,
							pk: pks.rows.map(([col]) => col),
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
						// Kolom
						let resCols;
						try {
							resCols = await connection.query(
								`
								SELECT c.column_name,
										c."nulls",
										d.domain_name AS type
								FROM syscolumn c
								LEFT JOIN sysdomain d ON c.domain_id = d.domain_id
								WHERE c.table_id = ?
							`,
								[tableId]
							);
						} catch (err) {
							// fallback jika sysdomain error
							resCols = await connection.query(
								`
								SELECT column_name, "nulls", 'unknown' AS type
								FROM syscolumn
								WHERE table_id = ?
							`,
								[tableId]
							);
						}

						const columns = resCols.map((col) => ({
							name: col.column_name,
							type: col.type || "unknown",
							null: col.nulls === "Y",
						}));

						// Ambil semua kolom yang termasuk dalam indeks, bukan hanya PK
						let resIndexedCols = [];
						try {
							resIndexedCols = await connection.query(
								`
								SELECT DISTINCT c.column_name
								FROM sysidxcol ic
								JOIN syscolumn c ON ic.table_id = c.table_id AND ic.column_id = c.column_id
								WHERE ic.table_id = ?
								ORDER BY c.column_name
								`,
								[tableId]
							);
						} catch (err) {
							console.warn(`Gagal ambil indeks untuk tabel ${tableName}:`, err);
						}

						const index = resIndexedCols.map((col) => col.column_name);

						result.tables.push({ name: tableName, index, columns });
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
						result.tables.push({ name: col.name, pk: [], columns });
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
				const { name, columns, pk } = table;

				if (!name || typeof name !== "string") {
					throw new Error("Tabel harus memiliki nama yang valid.");
				}
				if (!Array.isArray(columns) || columns.length === 0) {
					throw new Error(
						`Tabel '${name}' harus memiliki setidaknya satu kolom.`
					);
				}
				if (!Array.isArray(pk) || pk.length < 2) {
					throw new Error(
						`Tabel '${name}' harus memiliki minimal dua kolom primary key.`
					);
				}

				const colDefs = columns.map((col) => {
					if (!col.name || !col.type) {
						throw new Error(
							`Kolom di tabel '${name}' harus memiliki 'name' dan 'type'.`
						);
					}
					const nullable = col.null === false ? "NOT NULL" : "NULL";
					return `  \`${col.name}\` ${col.type} ${nullable}`;
				});

				const pkDef = `  PRIMARY KEY (${pk.map((k) => `\`${k}\``).join(", ")})`;

				return `CREATE TABLE IF NOT EXISTS \`${name}\` (\n${[
					...colDefs,
					pkDef,
				].join(",\n")}\n);`;
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
