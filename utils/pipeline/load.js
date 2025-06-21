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
				await insertBatch({ type, connection, table, columns, batch });
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

async function insertBatch({ type, connection, table, columns, batch }) {
	switch (type) {
		case "mysql-native": {
			const placeholders = "(" + columns.map(() => "?").join(", ") + ")";
			const query =
				`INSERT INTO ${table} (${columns.join(", ")}) VALUES ` +
				batch.map(() => placeholders).join(", ");
			const values = batch.flatMap((row) => columns.map((col) => row[col]));
			await connection.query(query, values);
			break;
		}

		case "mysql-odbc": {
			const values = batch.flatMap((row) => columns.map((col) => row[col]));
			const query =
				`INSERT INTO ${table} (${columns.join(", ")}) VALUES ` +
				batch
					.map(() => "(" + columns.map(() => "?").join(", ") + ")")
					.join(", ");
			await connection.query(query, values);
			break;
		}

		case "postgres-native": {
			const values = batch.flatMap((row) => columns.map((col) => row[col]));
			const query =
				`INSERT INTO ${table} (${columns.join(", ")}) VALUES ` +
				batch
					.map(() => "(" + columns.map(() => "?").join(", ") + ")")
					.join(", ");
			await connection.query(query, values);
			break;
		}

		case "postgres-odbc": {
			const values = batch.flatMap((row) => columns.map((col) => row[col]));
			const query =
				`INSERT INTO ${table} (${columns.join(", ")}) VALUES ` +
				batch
					.map(() => "(" + columns.map(() => "?").join(", ") + ")")
					.join(", ");
			await connection.query(query, values);
			break;
		}

		case "sqlserver-odbc": {
			const values = batch.flatMap((row) => columns.map((col) => row[col]));
			const query =
				`INSERT INTO ${table} (${columns.join(", ")}) VALUES ` +
				batch
					.map(() => "(" + columns.map(() => "?").join(", ") + ")")
					.join(", ");
			await connection.query(query, values);
			break;
		}

		case "sqlserver-native": {
			const request = connection.request();
			const values = batch
				.map(
					(row) =>
						"(" +
						columns.map((col) => formatSQLValue(row[col])).join(", ") +
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
				batch.map((row) => columns.map((col) => row[col]))
			);
			break;
		}

		case "oracle-odbc": {
			const values = batch.flatMap((row) => columns.map((col) => row[col]));
			const query =
				`INSERT INTO ${table} (${columns.join(", ")}) VALUES ` +
				batch
					.map(() => "(" + columns.map(() => "?").join(", ") + ")")
					.join(", ");
			await connection.query(query, values);
			break;
		}

		case "sybase-odbc": {
			const placeholders = "(" + columns.map(() => "?").join(", ") + ")";
			const query =
				`INSERT INTO ${table} (${columns.join(", ")}) VALUES ` +
				batch.map(() => placeholders).join(", ");
			const values = batch.flatMap((row) => columns.map((col) => row[col]));

			await connection.query(query, values);
			break;
		}

		case "mongodb-native": {
			const db = connection.db();
			const collection = db.collection(table);
			await collection.insertMany(batch);
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

function formatSQLValue(val) {
	if (val === null || val === undefined) return "NULL";
	if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
	if (val instanceof Date) return `'${val.toISOString()}'`;
	return val;
}

module.exports = { load };
