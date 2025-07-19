const { timeHandler } = require("../time-handler.util");

async function load({ database, configs, data }) {
	const { connection, type } = database;
	const results = {};

	for (const config of configs.sort((a, b) => a.order - b.order)) {
		let { table, columns, unique } = config;
		let rows = data[table];

		results[table] = { data: [], error: [] };

		if (!Array.isArray(rows) || rows.length === 0) continue;

		if (type === "lake") {
			const preparedData = prepareLakeData(columns, rows);
			columns = preparedData.columns;
			rows = preparedData.rows;
		}

		const batches = splitIntoChunks(rows);

		for (const batch of batches) {
			try {
				const placeholders = "(" + columns.map(() => "?").join(", ") + ")";
				const values = batch.flatMap((row) => columns.map((col) => row[col]));

				switch (type) {
					case "lake": {
						const query =
							`INSERT INTO \`${table}\` (${columns
								.map((col) => `\`${col}\``)
								.join(", ")}) VALUES ` +
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
							`INSERT INTO \`${table}\` (${columns
								.map((col) => `\`${col}\``)
								.join(", ")}) VALUES ` +
							batch.map(() => placeholders).join(", ") +
							` ON DUPLICATE KEY UPDATE ${columns
								.map((col) => `\`${col}\`=VALUES(\`${col}\`)`)
								.join(", ")}`;

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

function prepareLakeData(columns, rows) {
	const timestamp = timeHandler.nowEpoch();

	// Tambahkan kolom jika belum ada
	if (!columns.includes("load_timestamp")) {
		columns.push("load_timestamp");
	}

	// Tambahkan/ganti nilai load_timestamp pada setiap baris
	const updatedRows = rows.map((row) => ({
		...row,
		load_timestamp: timestamp,
	}));

	return { columns, rows: updatedRows };
}

module.exports = { load };
