async function load({ database, configs, data }) {
	const results = {};
	const { connection, type } = database;

	for (const config of configs.sort((a, b) => a.order - b.order)) {
		const { table, columns, unique } = config;
		const rows = data[table];

		results[table] = { data: [], error: [] };

		if (!Array.isArray(rows) || rows.length === 0) continue;

		const batches = splitIntoChunks(rows);

		for (const batch of batches) {
			try {
				const colNames = columns.join(", ");
				const placeholders = "(" + columns.map(() => "?").join(", ") + ")";
				const values = batch.flatMap((row) => columns.map((col) => row[col]));

				switch (type) {
					case "lake": {
						const query =
							`INSERT INTO ${table} (${colNames}) VALUES ` +
							batch.map(() => placeholders).join(", ");
						await connection.query(query, values);
						break;
					}

					case "warehouse": {
						if (!Array.isArray(unique) || unique.length === 0) {
							throw new Error(
								`Missing or invalid 'unique' fields for UPSERT on table ${table}`
							);
						}

						const updateSet = columns
							.filter((col) => !unique.includes(col))
							.map((col) => `${col}=VALUES(${col})`)
							.join(", ");

						if (!updateSet) {
							throw new Error(
								`No columns available to update on UPSERT for table ${table}`
							);
						}

						const query =
							`INSERT INTO ${table} (${colNames}) VALUES ` +
							batch.map(() => placeholders).join(", ") +
							` ON DUPLICATE KEY UPDATE ${updateSet}`;
						await connection.query(query, values);
						break;
					}

					default:
						throw new Error(`Unsupported database type for load: ${type}`);
				}

				results[table].data.push(...batch);
			} catch (err) {
				results[table].error.push(err);
			}
		}
	}

	return results;
}

function splitIntoChunks(data) {
	const chunks = [];
	for (let i = 0; i < data.length; i += 500) {
		chunks.push(data.slice(i, i + 500));
	}
	return chunks;
}

module.exports = { load };
