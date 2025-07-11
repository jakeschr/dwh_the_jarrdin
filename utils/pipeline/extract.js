const { timeHandler } = require("../time-handler.util");

async function extract({ database, configs, time_threshold }) {
	const results = {};
	const { connection, dialect, driver } = database;

	for (const config of configs) {
		try {
			results[table] = { data: [], error: [] };

			const query = buildQuery(config, time_threshold, dialect);

			let extractedData;

			if (driver === "odbc") {
				const rows = await connection.query(query);
				extractedData = rows;
			} else if (driver === "native") {
				switch (dialect) {
					case "mysql": {
						const [rows] = await connection.query(query);
						extractedData = rows;
						break;
					}
					case "oracle": {
						const res = await connection.execute(query);
						extractedData = res.rows;
						break;
					}
					case "postgres": {
						const res = await connection.query(query);
						extractedData = res.rows;
						break;
					}
					case "sqlserver": {
						const res = await connection.request().query(query);
						extractedData = res.recordset;
						break;
					}
					default:
						throw new Error("Unsupported dialect:", dialect);
				}
			} else {
				throw new Error("Unsupported driver:", driver);
			}

			results[table].data.push(...extractedData);
		} catch (error) {
			results[table].error.push(error);
		}
	}

	return results;
}

function buildQuery(config, time_threshold, dialect) {
	try {
		const { table, columns, filters } = config;

		let whereClause = "";
		if (Array.isArray(filters) && filters.length > 0) {
			// Setiap objek di filters adalah AND
			const andGroups = filters.map((filter) => {
				// Setiap kolom dalam satu objek dianggap OR
				const orGroup = filter.columns.map((column) => {
					const singleFilter = {
						column: column,
						operator: filter.operator,
						value: filter.value,
					};
					return buildFilter(singleFilter, time_threshold, dialect);
				});
				return `(${orGroup.join(" OR ")})`;
			});

			whereClause = `WHERE ${andGroups.join(" AND ")}`;
		}

		const selectColumns = columns.join(", ");
		const baseQuery = `SELECT ${selectColumns} FROM ${table} ${whereClause}`;

		return baseQuery;
	} catch (error) {
		throw error;
	}
}

function buildFilter(filter, time_threshold, dialect) {
	try {
		let { column, operator, value } = filter;
		const colExpr = column;

		// 1. Jika value adalah objek dinamis
		if (typeof value === "object" && value?.source === "time_threshold") {
			// Tentukan nilai default
			const defaultVal = value.default;

			// Jika time_threshold tersedia, gunakan sesuai format default
			if (time_threshold != null) {
				const format = timeHandler.getFormat(defaultVal);
				if (format === "epoch_ms") {
					value = time_threshold;
				} else if (format === "epoch_s") {
					value = Math.floor(time_threshold / 1000);
				} else {
					value = timeHandler.epochToString(time_threshold, format);
				}
			} else {
				// Gunakan nilai default langsung
				value = defaultVal;
			}
		}

		// 2. Format value untuk SQL (kecuali untuk BETWEEN/IN yang nanti ditangani khusus)
		let formattedVal = value;
		if (typeof value === "string") {
			formattedVal = `'${value}'`;
		} else if (value === null) {
			formattedVal = "NULL";
		}

		// 3. Bangun filter SQL
		switch (operator) {
			case "eq":
				return `${colExpr} = ${formattedVal}`;
			case "ne":
				return `${colExpr} != ${formattedVal}`;
			case "gt":
				return `${colExpr} > ${formattedVal}`;
			case "lt":
				return `${colExpr} < ${formattedVal}`;
			case "gte":
				return `${colExpr} >= ${formattedVal}`;
			case "lte":
				return `${colExpr} <= ${formattedVal}`;
			case "like": {
				const keyword = dialect.includes("postgres") ? "ILIKE" : "LIKE";
				return `${colExpr} ${keyword} ${formattedVal}`;
			}
			case "not_like": {
				const keyword = dialect.includes("postgres") ? "NOT ILIKE" : "NOT LIKE";
				return `${colExpr} ${keyword} ${formattedVal}`;
			}
			case "is":
				return `${colExpr} IS ${formattedVal}`;
			case "not":
				return `${colExpr} IS NOT ${formattedVal}`;
			case "in":
				return `${colExpr} IN (${value.map((v) => `'${v}'`).join(", ")})`;
			case "not_in":
				return `${colExpr} NOT IN (${value.map((v) => `'${v}'`).join(", ")})`;
			case "between":
				return `${colExpr} BETWEEN '${value[0]}' AND '${value[1]}'`;
			case "not_between":
				return `${colExpr} NOT BETWEEN '${value[0]}' AND '${value[1]}'`;
			default:
		}
	} catch (error) {
		throw error;
	}
}

module.exports = { extract };
