async function createTable(data) {
	let connection;
	try {
		const config = await DatabaseRepository.findForConnection(data.database_id);

		if (config.type !== "lake") {
			throw Object.assign(
				new Error(
					"Hanya database dengan tipe 'lake' yang diperbolehkan membuat tabel."
				),
				{ code: 400 }
			);
		}

		if (config.password) {
			config.password = passwordHandler.decryptSymmetric(config.password);
		}

		connection = await connectionHandler.open(config);

		// Gabungkan semua query tabel
		const tableQueries = data.tables.map((table) =>
			buildCreateTableQuery(table)
		);

		const fullQuery = ["START TRANSACTION;", ...tableQueries, "COMMIT;"].join(
			"\n\n"
		);

		await connection.query(fullQuery);

		await connectionHandler.close(connection, config.dialect);

		return {
			status: "success",
			message: `Berhasil membuat ${data.tables.length} tabel di database lake.`,
			query: fullQuery,
		};
	} catch (error) {
		if (connection) {
			await connection.query("ROLLBACK");
		}
		throw error;
	}
}

async function databaseInfo(connection, dialect, databaseName) {
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
	} catch (err) {
		throw new Error(`Gagal mengambil metadata: ${err.message}`);
	}
}

async function databaseInfo(connection, dialect, databaseName) {
	if (!connection || !dialect) {
		throw new Error("Koneksi dan dialect harus diberikan.");
	}

	let result = {
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

			case "sybase":
				const resTablesX = await connection.query(`
	  SELECT table_id, table_name
	  FROM systable
	  WHERE table_type = 'BASE' AND creator = USER_ID()
 `);

				const tablesX = resTablesX.map((row) => ({
					id: row.table_id,
					name: row.table_name,
				}));

				result.tables = [];

				for (const { id: tableId, name: tableName } of tablesX) {
					// Ambil kolom
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
						// Buat type + width jika applicable
						const typeLower = col.type ? col.type.toLowerCase() : "unknown";
						let typeString;
						if (["varchar", "char", "nvarchar", "nchar"].includes(typeLower)) {
							typeString = `${typeLower}(${col.width})`;
						} else if (
							["bigint", "int", "integer", "smallint"].includes(typeLower)
						) {
							typeString = `${typeLower}(${col.width})`; // sesuai konvensi, atau hilangkan jika ingin simple
						} else {
							typeString = typeLower;
						}

						return {
							name: col.column_name,
							type: typeString,
							null: col.nulls === "Y",
						};
					});

					// Ambil pk
					let resPKCols = [];
					try {
						resPKCols = await connection.query(
							`
							  SELECT COLUMN_NAME FROM sp_pkeys(?);
							 `,
							[tableName]
						);
					} catch (err) {
						console.warn(`Gagal ambil PK untuk tabel ${tableName}:`, err);
					}
					const pk = resPKCols.map((col) => col.COLUMN_NAME);

					result.tables.push({
						name: tableName,
						pk,
						columns,
					});
				}
				break;

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
}

const BATCH_SIZE = 500;

async function load({ database, configs, data }) {
	const results = {};
	const { connection, dialect, driver } = database;
	const type = `${dialect}-${driver}`;

	for (const config of configs.sort((a, b) => a.order - b.order)) {
		const { table, columns } = config;
		const rows = data[table];

		if (!Array.isArray(rows) || rows.length === 0) {
			results[table] = { data: [], error: [] };
			continue;
		}

		const batches = splitIntoChunks(rows, BATCH_SIZE);
		const loadedData = [];
		const errors = [];

		for (const batch of batches) {
			try {
				await insertData({ type, connection, table, columns, batch });
				loadedData.push(...batch);
			} catch (err) {
				errors.push(err);
			}
		}

		results[table] = {
			data: loadedData,
			error: errors,
		};
	}

	return results;
}

async function insertData({ type, connection, table, columns, data }) {
	switch (type) {
		case "mysql-native": {
			const placeholders = "(" + columns.map(() => "?").join(", ") + ")";
			const query =
				`INSERT INTO ${table} (${columns.join(", ")}) VALUES ` +
				data.map(() => placeholders).join(", ");
			const values = data.flatMap((row) => columns.map((col) => row[col]));
			await connection.query(query, values);
			break;
		}

		case "mysql-odbc": {
			const values = data.flatMap((row) => columns.map((col) => row[col]));
			const query =
				`INSERT INTO ${table} (${columns.join(", ")}) VALUES ` +
				data
					.map(() => "(" + columns.map(() => "?").join(", ") + ")")
					.join(", ");
			await connection.query(query, values);
			break;
		}

		case "postgres-native": {
			const values = data.flatMap((row) => columns.map((col) => row[col]));
			const query =
				`INSERT INTO ${table} (${columns.join(", ")}) VALUES ` +
				data
					.map(() => "(" + columns.map(() => "?").join(", ") + ")")
					.join(", ");
			await connection.query(query, values);
			break;
		}

		case "postgres-odbc": {
			const values = data.flatMap((row) => columns.map((col) => row[col]));
			const query =
				`INSERT INTO ${table} (${columns.join(", ")}) VALUES ` +
				data
					.map(() => "(" + columns.map(() => "?").join(", ") + ")")
					.join(", ");
			await connection.query(query, values);
			break;
		}

		case "sqlserver-odbc": {
			const values = data.flatMap((row) => columns.map((col) => row[col]));
			const query =
				`INSERT INTO ${table} (${columns.join(", ")}) VALUES ` +
				data
					.map(() => "(" + columns.map(() => "?").join(", ") + ")")
					.join(", ");
			await connection.query(query, values);
			break;
		}

		case "sqlserver-native": {
			const request = connection.request();
			const values = data
				.map(
					(row) =>
						"(" +
						columns.map((col) => formatValueSQL(row[col])).join(", ") +
						")"
				)
				.join(", ");
			const query = `INSERT INTO ${table} (${columns.join(
				", "
			)}) VALUES ${values}`;
			await request.query(query);
			break;
		}

		case "oracle-native": {
			await connection.executeMany(
				`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns
					.map((_, i) => `:${i + 1}`)
					.join(", ")})`,
				data.map((row) => columns.map((col) => row[col]))
			);
			break;
		}

		case "oracle-odbc": {
			const values = data.flatMap((row) => columns.map((col) => row[col]));
			const query =
				`INSERT INTO ${table} (${columns.join(", ")}) VALUES ` +
				data
					.map(() => "(" + columns.map(() => "?").join(", ") + ")")
					.join(", ");
			await connection.query(query, values);
			break;
		}

		case "sybase-odbc": {
			const valueStrings = data.map((row) => {
				const formatted = columns.map((col) => formatValueSQL(row[col]));
				return `(${formatted.join(", ")})`;
			});
			const query = `INSERT INTO ${table} (${columns.join(
				", "
			)}) VALUES ${valueStrings.join(", ")}`;
			await connection.query(query);
			break;
		}

		case "mongodb-native": {
			const db = connection.db();
			const collection = db.collection(table);
			await collection.insertMany(data);
			break;
		}

		default:
			throw new Error(`Unsupported combination dialect and driver: ${type}`);
	}
}

function splitIntoChunks(array, size = 500) {
	const chunks = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
}

function formatValue(val) {
	if (val === null || val === undefined) return "NULL";
	if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
	return val;
}

async function checkTableExists({ connection, dialect, table }) {
	switch (dialect) {
		case "mysql":
			const [mysqlTables] = await connection.query(
				`SHOW TABLES LIKE '${table}'`
			);
			return mysqlTables.length > 0;

		case "postgres":
			const pgResult = await connection.query(
				`SELECT EXISTS (
					SELECT FROM information_schema.tables 
					WHERE table_schema = 'public' AND table_name = $1
				)`,
				[table]
			);
			return pgResult.rows[0].exists;

		case "sqlserver":
			const sqlRes = await connection
				.request()
				.query(
					`SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${table}'`
				);
			return sqlRes.recordset.length > 0;

		case "oracle":
			const oraRes = await connection.execute(
				`SELECT table_name FROM user_tables WHERE table_name = :table`,
				[table.toUpperCase()]
			);
			return oraRes.rows.length > 0;

		case "sybase":
			const sybRes = await connection.query(
				`SELECT name FROM sysobjects WHERE type='U' AND name='${table}'`
			);
			return sybRes.length > 0;

		default:
			throw new Error(`Unsupported dialect: ${dialect}`);
	}
}

async function checkTableColumnsMatch({
	connection,
	dialect,
	table,
	expectedColumns,
}) {
	let actualColumns = [];

	switch (dialect) {
		case "mysql": {
			const [rows] = await connection.query(`DESCRIBE ${table}`);
			actualColumns = rows.map((row) => row.Field);
			break;
		}

		case "postgres": {
			const result = await connection.query(
				`SELECT column_name FROM information_schema.columns 
				 WHERE table_schema = 'public' AND table_name = $1`,
				[table]
			);
			actualColumns = result.rows.map((r) => r.column_name);
			break;
		}

		case "sqlserver": {
			const result = await connection
				.request()
				.query(
					`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}'`
				);
			actualColumns = result.recordset.map((r) => r.COLUMN_NAME);
			break;
		}

		case "oracle": {
			const result = await connection.execute(
				`SELECT column_name FROM user_tab_columns WHERE table_name = :table`,
				[table.toUpperCase()]
			);
			actualColumns = result.rows.map((r) => r[0]);
			break;
		}

		case "sybase": {
			const result = await connection.query(
				`SELECT c.name FROM syscolumns c 
				 JOIN sysobjects t ON c.id = t.id 
				 WHERE t.name = '${table}'`
			);
			actualColumns = result.map((r) => r.name);
			break;
		}

		default:
			throw new Error(`Unsupported dialect: ${dialect}`);
	}

	// Cek apakah semua kolom yang diharapkan ada di tabel
	const missing = expectedColumns.filter((col) => !actualColumns.includes(col));
	const extra = actualColumns.filter((col) => !expectedColumns.includes(col));

	return {
		match: missing.length === 0 && extra.length === 0,
		missing,
		extra,
	};
}

function detectTypeSQL(value) {
	if (value === null || value === undefined) return "TEXT";
	if (typeof value === "number")
		return Number.isInteger(value) ? "INTEGER" : "FLOAT";
	if (typeof value === "boolean") return "BOOLEAN";
	if (typeof value === "string") {
		if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "DATE";
		if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return "TIMESTAMP";
		return "TEXT";
	}
	if (value instanceof Date) return "TIMESTAMP";
	return "TEXT";
}

function createTableSQL(table, rows) {
	if (!Array.isArray(rows) || rows.length === 0)
		throw new Error("No data to infer schema.");

	const sample = rows[0];
	const columns = Object.keys(sample);
	const columnDefs = columns.map((col) => {
		const type = detectSQLType(sample[col]);
		return `${col} ${type}`;
	});

	return `CREATE TABLE ${table} (\n  ${columnDefs.join(",\n  ")}\n);`;
}

module.exports = { load };
