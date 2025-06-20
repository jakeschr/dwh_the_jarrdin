const mysql = require("mysql2/promise");
const { Client: PgClient } = require("pg");
const { MongoClient } = require("mongodb");
const sql = require("mssql");
const odbc = require("odbc");
const oracledb = require("oracledb");

const connectionHandler = {
	async open(config) {
		const { dialect, driver } = config;

		try {
			// --- MongoDB (native only) ---
			if (dialect === "mongodb") {
				const uri = config.connection_uri;
				if (!uri) throw new Error("MongoDB requires 'connection_uri'");
				const connection = new MongoClient(uri);
				await connection.connect();
				return connection;
			}

			// --- MySQL (native) ---
			if (dialect === "mysql" && driver === "native") {
				const connection = await mysql.createConnection({
					host: config.host,
					port: config.port,
					user: config.username,
					password: config.password,
					database: config.database,
					...config.options,
				});
				return connection;
			}

			// --- PostgreSQL (native) ---
			if (dialect === "postgres" && driver === "native") {
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

			// --- SQL Server (native) ---
			if (dialect === "sqlserver" && driver === "native") {
				const connection = await sql.connect({
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
				return connection;
			}

			// --- Oracle (native) ---
			if (dialect === "oracle" && driver === "native") {
				const connection = await oracledb.getConnection({
					user: config.username,
					password: config.password,
					connectString: `${config.host}:${config.port}/${config.database}`,
					...config.options,
				});

				return connection;
			}

			// --- Sybase / SQL Server / Oracle via ODBC ---
			if (driver === "odbc") {
				if (!config.dsn) throw new Error("ODBC connection requires 'dsn'");

				// Buat connection string dinamis
				let connStr = `DSN=${config.dsn}`;
				if (config.username) connStr += `;UID=${config.username}`;
				if (config.password) connStr += `;PWD=${config.password}`;

				const connection = await odbc.connect(connStr);

				return connection;
			}

			throw new Error(
				`Unsupported combination: dialect=${dialect}, driver=${driver}`
			);
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
			} else {
				await connection.close();
			}
		} catch (error) {
			console.error(`Error closing ${type} connection:`, error.message);
		}
	},
};

module.exports = { connectionHandler };
