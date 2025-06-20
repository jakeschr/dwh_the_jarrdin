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
		const type = `${dialect}-${driver}`;

		if (type === "mongodb-native") {
			const db = connection.db();
			const collection = db.collection(config.table);

			let mongoFilter = {};
			if (config.filters && config.filters.length > 0) {
				for (const filter of config.filters) {
					const field = filter.columns[0]; // MongoDB hanya 1 kolom per filter
					const operator = filter.operator;
					let val = filter.value;

					if (typeof val === "string" && /^DYNAMIC\((.+)\)$/.test(val)) {
						if (!time_threshold)
							throw new Error(
								"Missing time_threshold for DYNAMIC filter value."
							);
						const extracted = val.match(/^DYNAMIC\((.+)\)$/)[1];
						const format = timeHandler.getFormat(extracted);
						val = timeHandler.epochToString(time_threshold, format);
					}

					// Map operator ke MongoDB
					const mongoOps = {
						eq: val,
						ne: { $ne: val },
						gt: { $gt: val },
						gte: { $gte: val },
						lt: { $lt: val },
						lte: { $lte: val },
						in: { $in: val },
						not_in: { $nin: val },
					};
					mongoFilter[field] = mongoOps[operator] ?? val;
				}
			}

			result = await collection.find(mongoFilter).toArray();
			return result;
		}

		// Untuk SQL-based
		const finalQuery = buildQuery({ dialect, driver, config, time_threshold });

		switch (type) {
			case "mysql-native": {
				const [rows] = await connection.query(finalQuery);
				result = rows;
				break;
			}
			case "mysql-odbc":
			case "postgres-odbc":
			case "sqlserver-odbc":
			case "oracle-odbc":
			case "sybase-odbc": {
				const rows = await connection.query(finalQuery);
				result = rows;
				break;
			}
			case "postgres-native": {
				const res = await connection.query(finalQuery);
				result = res.rows;
				break;
			}
			case "sqlserver-native": {
				const res = await connection.request().query(finalQuery);
				result = res.recordset;
				break;
			}
			case "oracle-native": {
				const res = await connection.execute(finalQuery);
				result = res.rows;
				break;
			}
			default:
				throw new Error(`Unsupported combination dialect and driver: ${type}`);
		}

		return result;
	} catch (error) {
		throw error;
	}
}

function buildQuery({ dialect, driver, config, time_threshold }) {
	const table = config.table;
	const columns = config.columns.join(", ");

	let whereClause = "";
	if (config.filters && config.filters.length > 0) {
		const conditions = config.filters.map((filter) =>
			buildFilterCondition(filter, time_threshold)
		);
		whereClause = `WHERE ${conditions.join(" AND ")}`;
	}

	const baseQuery = `SELECT ${columns} FROM ${table} ${whereClause}`;

	// dialect-driver specific tweak (optional)
	if (dialect === "sqlserver" && driver === "odbc") {
		// Bisa tambahkan TOP, dsb jika dibutuhkan
	}

	return baseQuery;
}

function buildFilterCondition(filter, time_threshold) {
	const { columns, operator, value } = filter;
	const colExpr =
		columns.length > 1 ? `CONCAT(${columns.join(", ') || ('")})` : columns[0];
	let val = value;

	if (typeof value === "string" && /^DYNAMIC\((.+)\)$/.test(value)) {
		if (!time_threshold) {
			throw new Error("Missing time_threshold for DYNAMIC filter value.");
		}
		const extracted = value.match(/^DYNAMIC\((.+)\)$/)[1];
		const dynamicFormat = timeHandler.getFormat(extracted);
		val = timeHandler.epochToString(time_threshold, dynamicFormat);
		if (typeof extracted === "string") val = `'${val}'`;
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
}

module.exports = { extract };
