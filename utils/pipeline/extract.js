const { timeHandler } = require("../time-handler.util");

function quoteIdentifier(identifier, dialect) {
	if (dialect === "mysql") return `\`${identifier}\``;
	if (dialect === "postgres") return `"${identifier}"`;
	if (dialect === "sqlserver" || dialect === "sybase") return `[${identifier}]`;
	return identifier; // fallback
}

async function extract({ database, configs, time_threshold }) {
	const results = {};
	const { connection, dialect, driver } = database;

	for (const config of configs) {
		const table = config.table;
		results[table] = { data: [], error: [] };

		try {
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
					case "sqlserver":
					case "sybase": {
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

			if (Array.isArray(extractedData)) {
				results[table].data = results[table].data.concat(extractedData);
			} else {
				results[table].error.push(
					new Error(`Invalid data extracted for table: ${table}`)
				);
			}
		} catch (error) {
			results[table].error.push(error);
			console.error(error);
		}
	}

	return results;
}

function buildQuery(config, time_threshold, dialect) {
	try {
		const { table, columns, filters } = config;

		let whereClause = "";
		if (Array.isArray(filters) && filters.length > 0) {
			const andGroups = filters.map((filter) => {
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

		const selectColumns = columns
			.map((col) => quoteIdentifier(col, dialect))
			.join(", ");
		const baseQuery = `SELECT ${selectColumns} FROM ${quoteIdentifier(
			table,
			dialect
		)} ${whereClause}`;

		return baseQuery;
	} catch (error) {
		throw error;
	}
}

function buildFilter(filter, time_threshold, dialect) {
	try {
		let { column, operator, value } = filter;
		const colExpr = quoteIdentifier(column, dialect);

		if (typeof value === "object" && value?.source === "time_threshold") {
			const defaultVal = value.default;
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
				value = defaultVal;
			}
		}

		let formattedVal = value;
		if (typeof value === "string") {
			formattedVal = `'${value}'`;
		} else if (value === null) {
			formattedVal = "NULL";
		}

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
				if (!Array.isArray(value))
					throw new Error(`'in' operator requires array value`);
				return `${colExpr} IN (${value.map((v) => `'${v}'`).join(", ")})`;
			case "not_in":
				if (!Array.isArray(value))
					throw new Error(`'not_in' operator requires array value`);
				return `${colExpr} NOT IN (${value.map((v) => `'${v}'`).join(", ")})`;
			case "between":
				if (!Array.isArray(value) || value.length !== 2)
					throw new Error(`'between' operator requires [start, end] array`);
				return `${colExpr} BETWEEN '${value[0]}' AND '${value[1]}'`;
			case "not_between":
				if (!Array.isArray(value) || value.length !== 2)
					throw new Error(`'not_between' operator requires [start, end] array`);
				return `${colExpr} NOT BETWEEN '${value[0]}' AND '${value[1]}'`;
			default:
				throw new Error(`Unsupported operator: ${operator}`);
		}
	} catch (error) {
		throw error;
	}
}

module.exports = { extract };
