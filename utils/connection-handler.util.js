const mysql = require("mysql2/promise");
const { Client: PgClient } = require("pg");
const { MongoClient } = require("mongodb");
const sql = require("mssql");
const odbc = require("odbc");
const oracledb = require("oracledb");

const connectionHandler = {
	async open(config) {
		const { dialect, driver } = config;
		const type = `${dialect}-${driver}`;

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

	async close(connection, dialect) {
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
};

// Fungsi bantu koneksi ODBC
async function connectODBC(config) {
	if (!config.dsn) throw new Error("ODBC connection requires 'dsn'");
	let connStr = `DSN=${config.dsn}`;
	if (config.username) connStr += `;UID=${config.username}`;
	if (config.password) connStr += `;PWD=${config.password}`;
	return await odbc.connect(connStr);
}

function buildCreateTableQuery(table) {
	const { name, columns, pk } = table;

	if (!name || typeof name !== "string") {
		throw new Error("Tabel harus memiliki nama yang valid.");
	}
	if (!Array.isArray(columns) || columns.length === 0) {
		throw new Error(`Tabel '${name}' harus memiliki setidaknya satu kolom.`);
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

	return `CREATE TABLE IF NOT EXISTS \`${name}\` (\n${[...colDefs, pkDef].join(
		",\n"
	)}\n);`;
}

module.exports = { connectionHandler, buildCreateTableQuery };
