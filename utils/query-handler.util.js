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
		if (!connection || !dialect)
			throw new Error("Koneksi dan dialect harus diberikan.");

		const result = {
			database: databaseName || null,
			tables: [],
		};

		let tables = [];

		const getTableListQuery = {
			mysql: `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE';`,
			postgres: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`,
			sqlserver: `SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE';`,
			oracle: `SELECT table_name FROM user_tables`,
			sybase: `SELECT name as table_name FROM sysobjects WHERE type = 'U';`,
			odbc: `SELECT table_name FROM information_schema.tables WHERE table_type = 'TABLE';`,
			mongodb: null,
		};

		const getColumnInfoQuery = {
			mysql: `SELECT column_name, column_type as type, is_nullable FROM information_schema.columns WHERE table_schema = ? AND table_name = ?;`,
			postgres: `SELECT column_name, data_type as type, is_nullable FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public';`,
			sqlserver: `SELECT column_name, data_type as type, is_nullable FROM information_schema.columns WHERE table_name = ?;`,
			oracle: `SELECT column_name, data_type as type, nullable as is_nullable FROM user_tab_columns WHERE table_name = :1`,
			sybase: `SELECT c.name AS column_name, t.name AS type, c.isnullable AS is_nullable FROM syscolumns c JOIN systypes t ON c.usertype = t.usertype WHERE c.id = object_id(?)`,
			odbc: `SELECT column_name, type_name as type, is_nullable FROM information_schema.columns WHERE table_name = ?;`,
			mongodb: null,
		};

		const getPrimaryKeyQuery = {
			mysql: `SELECT column_name FROM information_schema.key_column_usage WHERE table_schema = ? AND table_name = ? AND constraint_name = 'PRIMARY';`,
			postgres: `SELECT a.attname AS column_name FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = $1::regclass AND i.indisprimary;`,
			sqlserver: `SELECT column_name FROM information_schema.key_column_usage WHERE table_name = ? AND constraint_name LIKE 'PK_%';`,
			oracle: `SELECT cols.column_name FROM all_constraints cons JOIN all_cons_columns cols ON cons.constraint_name = cols.constraint_name WHERE cons.constraint_type = 'P' AND cons.table_name = :1`,
			sybase: `SELECT c.name FROM sysindexes i JOIN sysindexkeys ik ON i.id = ik.id AND i.indid = ik.indid JOIN syscolumns c ON ik.id = c.id AND ik.colid = c.colid WHERE i.id = object_id(?) AND (i.status & 2048) = 2048`,
			odbc: `SELECT column_name FROM information_schema.key_column_usage WHERE table_name = ?;`,
			mongodb: null,
		};

		try {
			if (dialect === "mongodb") {
				const db = connection.db(databaseName);
				tables = await db.listCollections().toArray();
				for (const table of tables) {
					const sample = await db.collection(table.name).findOne();
					const columns = Object.entries(sample || {}).map(([key, val]) => ({
						name: key,
						type: typeof val,
						null: val === null,
					}));
					result.tables.push({ name: table.name, pk: [], columns });
				}
				result.database = databaseName;
				return result;
			}

			const listQuery = getTableListQuery[dialect] || getTableListQuery.odbc;
			tables = await connection.query(listQuery, [databaseName]);
			if (Array.isArray(tables[0])) tables = tables[0]; // mysql2

			for (const row of tables) {
				const tableName = row.table_name || row.TABLE_NAME || row.name;

				const columnQuery =
					getColumnInfoQuery[dialect] || getColumnInfoQuery.odbc;
				const colRes = await connection.query(
					columnQuery,
					[tableName, databaseName].filter(Boolean)
				);
				const columns = (Array.isArray(colRes[0]) ? colRes[0] : colRes).map(
					(col) => ({
						name: col.column_name || col.COLUMN_NAME,
						type: col.type || col.DATA_TYPE,
						null:
							(col.is_nullable || col.NULLABLE || "").toUpperCase() !== "NO"
								? true
								: false,
					})
				);

				const pkQuery = getPrimaryKeyQuery[dialect] || getPrimaryKeyQuery.odbc;
				const pkRes = await connection.query(
					pkQuery,
					[tableName, databaseName].filter(Boolean)
				);
				const pk = (Array.isArray(pkRes[0]) ? pkRes[0] : pkRes).map(
					(col) => col.column_name || col.COLUMN_NAME || col.name
				);

				result.tables.push({ name: tableName, pk, columns });
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
