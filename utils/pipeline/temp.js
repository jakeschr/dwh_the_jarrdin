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
