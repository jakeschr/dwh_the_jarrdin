const BATCH_SIZE = 500;

async function load({ database, configs, data }) {
	const results = {};
	const { connection, dialect, driver } = database;
	const type = `${dialect}-${driver}`;

	for (const config of configs.sort((a, b) => a.order - b.order)) {
		const { table, columns } = config;
		const rows = data[table];

		if (!Array.isArray(rows) || rows.length === 0) {
			results[table] = [];
			continue;
		}

		const batches = splitIntoChunks(rows, BATCH_SIZE);
		const successfulInserts = [];
		const failedBatches = [];

		for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
			const batch = batches[batchIndex];

			try {
				const placeholders = "(" + columns.map(() => "?").join(", ") + ")";
				const query =
					`INSERT INTO ${table} (${columns.join(", ")}) VALUES ` +
					batch.map(() => placeholders).join(", ");
				const values = batch.flatMap((row) => columns.map((col) => row[col]));

				switch (type) {
					case "mysql-native":
					case "mysql-odbc":
					case "postgres-native":
					case "postgres-odbc":
					case "sqlserver-odbc":
					case "oracle-odbc":

					case "sybase-odbc":
						await connection.query(query, values);
						break;

					case "sqlserver-native": {
						const request = connection.request();
						const sqlserverValues = batch
							.map(
								(row) =>
									"(" +
									columns.map((col) => formatSQLValue(row[col])).join(", ") +
									")"
							)
							.join(", ");
						const finalQuery = `INSERT INTO ${table} (${columns.join(
							", "
						)}) VALUES ${sqlserverValues}`;
						await request.query(finalQuery);
						break;
					}

					case "oracle-native":
						await connection.executeMany(
							`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns
								.map((_, i) => `:${i + 1}`)
								.join(", ")})`,
							batch.map((row) => columns.map((col) => row[col]))
						);
						break;

					case "mongodb-native": {
						const db = connection.db();
						const collection = db.collection(table);
						await collection.insertMany(batch);
						break;
					}

					default:
						throw new Error(
							`Unsupported combination dialect and driver: ${type}`
						);
				}

				successfulInserts.push(...batch);
			} catch (err) {
				failedBatches.push(batchIndex + 1);
				console.log(err);
			}
		}

		if (failedBatches.length > 0 && successfulInserts.length === 0) {
			results[table] = `Load failed for ${table}. All batches failed.`;
		} else if (failedBatches.length > 0) {
			results[table] = successfulInserts;
		} else {
			results[table] = successfulInserts;
		}
	}

	return results;
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
