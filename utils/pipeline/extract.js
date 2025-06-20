const { timeHandler } = require("../time-handler.util");

async function extract({ database, configs, time_threshold }) {
	const results = {};

	for (const config of configs) {
		try {
			const extractedData = await executeQuery(
				database,
				config,
				time_threshold
			);

			results[config.table] = extractedData;
		} catch (error) {
			results[
				config.table
			] = `Extract failed for ${config.table}: ${error.message}`;
		}
	}

	return results;
}

async function executeQuery(database, config, time_threshold) {
	try {
		let result = [];

		const { connection, dialect, driver } = database;
		const type = dialect + "-" + driver;

		switch (type) {
			case "mysql-native": {
				const [rows] = await connection.query(
					buildSQLQuery(database, config, time_threshold)
				);
				result = rows;
				break;
			}
			case "mysql-odbc": {
				const rows = await connection.query(
					buildSQLQuery(database, config, time_threshold)
				);
				result = rows;
				break;
			}
			case "postgres-native": {
				const res = await connection.query(
					buildSQLQuery(database, config, time_threshold)
				);
				result = res.rows;
				break;
			}
			case "postgres-odbc": {
				const rows = await connection.query(
					buildSQLQuery(database, config, time_threshold)
				);
				result = rows;
				break;
			}
			case "sqlserver-native": {
				const res = await connection
					.request()
					.query(buildSQLQuery(database, config, time_threshold));
				result = res.recordset;
				break;
			}
			case "sqlserver-odbc": {
				const rows = await connection.query(
					buildSQLQuery(database, config, time_threshold)
				);
				result = rows;
				break;
			}
			case "oracle-native": {
				const res = await connection.execute(
					buildSQLQuery(database, config, time_threshold)
				);
				result = res.rows;
				break;
			}
			case "oracle-odbc": {
				const rows = await connection.query(
					buildSQLQuery(database, config, time_threshold)
				);
				result = rows;
				break;
			}
			case "sybase-odbc": {
				const rows = await connection.query(
					buildSQLQuery(database, config, time_threshold)
				);
				result = rows;
				break;
			}
			case "mongodb-native": {
				result = [];
				break;
			}

			default:
				throw new Error("Unsupported combination dialect and driver :", type);
		}

		return result;
	} catch (error) {
		throw error;
	}
}

function buildSQLQuery(database, config, time_threshold) {
	try {
		const { dialect, driver } = database;
		const table = config.table;
		const columns = config.columns.join(", ");

		let whereClause = "";
		if (config.filters && config.filters.length > 0) {
			const conditions = config.filters.map((filter) =>
				buildFilter(filter, time_threshold)
			);
			whereClause = `WHERE ${conditions.join(" AND ")}`;
		}

		let baseQuery = `SELECT ${columns} FROM ${table} ${whereClause}`;

		// Placeholder untuk tweak berdasarkan dialect-driver (opsional)
		if (dialect === "sqlserver" && driver === "odbc") {
			// Misalnya jika kamu mau tambahkan TOP, atau ubah LIMIT ke FETCH
		}

		return baseQuery;
	} catch (error) {
		throw error;
	}
}

function buildFilter(filter, time_threshold) {
	try {
		const { columns, operator, value } = filter;
		const colExpr =
			columns.length > 1 ? `CONCAT(${columns.join(", ') || ('")})` : columns[0];

		let val = value;

		// Tangani DYNAMIC(...) → ubah ke nilai berdasarkan time_threshold
		if (typeof val === "string" && /^DYNAMIC\((.+)\)$/.test(val)) {
			if (!time_threshold) {
				throw new Error("Missing time_threshold for DYNAMIC filter value.");
			}
			const extracted = val.match(/^DYNAMIC\((.+)\)$/)[1];
			const format = timeHandler.getFormat(extracted);
			val = timeHandler.epochToString(time_threshold, format);
			val = `'${val}'`;
		} else if (typeof val === "string") {
			val = `'${val}'`;
		} else if (val === null) {
			val = "NULL";
		}

		switch (operator) {
			case "eq":
				return `${colExpr} = ${val}`;
			case "ne":
				return `${colExpr} != ${val}`;
			case "gt":
				return `${colExpr} > ${val}`;
			case "lt":
				return `${colExpr} < ${val}`;
			case "gte":
				return `${colExpr} >= ${val}`;
			case "lte":
				return `${colExpr} <= ${val}`;
			case "like":
				return `${colExpr} LIKE ${val}`;
			case "not_like":
				return `${colExpr} NOT LIKE ${val}`;
			case "is":
				return `${colExpr} IS ${val}`;
			case "not":
				return `${colExpr} IS NOT ${val}`;
			case "in":
				return `${colExpr} IN (${value.map((v) => `'${v}'`).join(", ")})`;
			case "not_in":
				return `${colExpr} NOT IN (${value.map((v) => `'${v}'`).join(", ")})`;
			case "between":
				return `${colExpr} BETWEEN '${value[0]}' AND '${value[1]}'`;
			case "not_between":
				return `${colExpr} NOT BETWEEN '${value[0]}' AND '${value[1]}'`;
			default:
				throw new Error(`Unsupported operator: ${operator}`);
		}
	} catch (error) {
		throw error;
	}
}

function buildMongoQuery(config, time_threshold) {
	try {
		const query = {};

		if (!config.filters || config.filters.length === 0) {
			return query;
		}

		for (const filter of config.filters) {
			const field = filter.columns[0]; // Mongo hanya mendukung satu kolom per filter
			let val = filter.value;

			if (typeof val === "string" && /^DYNAMIC\((.+)\)$/.test(val)) {
				if (!time_threshold) {
					throw new Error("Missing time_threshold for DYNAMIC filter value.");
				}
				const extracted = val.match(/^DYNAMIC\((.+)\)$/)[1];
				const format = timeHandler.getFormat(extracted);
				val = timeHandler.epochToString(time_threshold, format);
			}

			// Operator mapping
			switch (filter.operator) {
				case "eq":
					query[field] = val;
					break;
				case "ne":
				case "not":
					query[field] = { $ne: val };
					break;
				case "gt":
					query[field] = { $gt: val };
					break;
				case "gte":
					query[field] = { $gte: val };
					break;
				case "lt":
					query[field] = { $lt: val };
					break;
				case "lte":
					query[field] = { $lte: val };
					break;
				case "in":
					query[field] = { $in: val };
					break;
				case "not_in":
					query[field] = { $nin: val };
					break;
				case "like":
					query[field] = { $regex: val, $options: "i" };
					break;
				case "not_like":
					query[field] = { $not: { $regex: val, $options: "i" } };
					break;
				case "between":
					query[field] = { $gte: val[0], $lte: val[1] };
					break;
				case "not_between":
					query[field] = {
						$not: { $gte: val[0], $lte: val[1] },
					};
					break;
				case "is":
					query[field] = val;
					break;
				default:
					throw new Error(`Unsupported MongoDB operator: ${filter.operator}`);
			}
		}

		return query;
	} catch (error) {
		throw error;
	}
}

module.exports = { extract };
