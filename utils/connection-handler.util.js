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

function buildCreateTableQuery(data) {
	try {
		const { table, columns, pk = [], unique = [], fk = [] } = data;

		if (!table || !Array.isArray(columns) || columns.length === 0) {
			throw new Error("Nama tabel dan daftar kolom wajib disediakan.");
		}

		const columnDefs = columns.map((col) => {
			let colDef = `\`${col.name}\` ${col.type}`;
			colDef += col.null === false ? " NOT NULL" : " NULL";

			if (col.auto_increment) {
				colDef += " AUTO_INCREMENT";
			}

			if (col.default !== undefined && col.default !== null) {
				if (
					typeof col.default === "string" &&
					!/^CURRENT_TIMESTAMP$/i.test(col.default)
				) {
					colDef += ` DEFAULT '${col.default.replace(/'/g, "''")}'`;
				} else {
					colDef += ` DEFAULT ${col.default}`;
				}
			}

			return colDef;
		});

		// Primary key
		if (pk.length > 0) {
			columnDefs.push(`PRIMARY KEY (${pk.map((c) => `\`${c}\``).join(", ")})`);
		}

		// Unique constraints
		for (const u of unique) {
			const uCols = Array.isArray(u) ? u : [u];
			columnDefs.push(`UNIQUE (${uCols.map((c) => `\`${c}\``).join(", ")})`);
		}

		// Foreign keys
		for (const fkDef of fk) {
			if (!fkDef.column || !fkDef.references) continue;

			let fkLine = `FOREIGN KEY (\`${fkDef.column}\`) REFERENCES ${fkDef.references}`;
			if (fkDef.on_delete) fkLine += ` ON DELETE ${fkDef.on_delete}`;
			if (fkDef.on_update) fkLine += ` ON UPDATE ${fkDef.on_update}`;
			columnDefs.push(fkLine);
		}

		const query = `CREATE TABLE \`${table}\` (\n  ${columnDefs.join(
			",\n  "
		)}\n);`;

		
		return query;
	} catch (error) {
		throw error;
	}
}

module.exports = { connectionHandler, buildCreateTableQuery };
