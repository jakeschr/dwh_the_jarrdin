const { timeHandler } = require("../time-handler.util");

async function extract({ database, configs, time_threshold }) {
	const results = {};

	for (const config of configs) {
		try {
			let query;

			let extractedData;

			const { connection, dialect, driver } = database;
			const dialect_driver = dialect + "-" + driver;

			if (database.dialect === "mongodb") {
				query = buildMongoQuery(config, time_threshold);
			} else {
				query = buildSQLQuery(config, time_threshold, dialect_driver);
			}

			switch (dialect_driver) {
				case "mysql-native": {
					const [rows] = await connection.query(query);
					extractedData = rows;
					break;
				}
				case "mysql-odbc": {
					const rows = await connection.query(query);
					extractedData = rows;
					break;
				}
				case "postgres-native": {
					const res = await connection.query(query);
					extractedData = res.rows;
					break;
				}
				case "postgres-odbc": {
					const rows = await connection.query(query);
					extractedData = rows;
					break;
				}
				case "sqlserver-native": {
					const res = await connection.request().query(query);
					extractedData = res.recordset;
					break;
				}
				case "sqlserver-odbc": {
					const rows = await connection.query(query);
					extractedData = rows;
					break;
				}
				case "oracle-native": {
					const res = await connection.execute(query);
					extractedData = res.rows;
					break;
				}
				case "oracle-odbc": {
					const rows = await connection.query(query);
					extractedData = rows;
					break;
				}
				case "sybase-odbc": {
					const rows = await connection.query(query);
					extractedData = rows;
					break;
				}
				case "mongodb-native": {
					const db = connection.db();
					const collection = db.collection(config.table);
					extractedData = await collection.find(query).toArray();
					break;
				}

				default:
					throw new Error("Unsupported combination dialect and driver :", type);
			}

			results[config.table] = extractedData;
		} catch (error) {
			results[
				config.table
			] = `Extract failed for ${config.table}: ${error.message}`;
		}
	}

	return results;
}

function buildSQLQuery(config, time_threshold, dialect_driver) {
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
					return buildSQLFilter(singleFilter, time_threshold, dialect_driver);
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

function buildMongoQuery(config, time_threshold) {
	try {
		if (!Array.isArray(config.filters) || config.filters.length === 0) {
			return {};
		}

		const andGroups = config.filters.map((filter) => {
			const orGroup = filter.columns.map((field) => {
				let val = filter.value;

				if (typeof val === "string" && /^DYNAMIC\((.+)\)$/.test(val)) {
					if (!time_threshold) {
						throw new Error("Missing time_threshold for DYNAMIC filter value.");
					}

					let extracted = val.match(/^DYNAMIC\((.+)\)$/)[1];
					const isNumeric = !isNaN(extracted) && !isNaN(parseFloat(extracted));
					if (isNumeric) extracted = Number(extracted);

					const format = timeHandler.getFormat(extracted);

					if (format === "epoch_ms") {
						val = time_threshold;
					} else if (format === "epoch_s") {
						val = Math.floor(time_threshold / 1000);
					} else {
						val = timeHandler.epochToString(time_threshold, format);
					}
				}

				// Bangun 1 kondisi berdasarkan operator
				switch (filter.operator) {
					case "eq":
						return { [field]: val };
					case "ne":
					case "not":
						return { [field]: { $ne: val } };
					case "gt":
						return { [field]: { $gt: val } };
					case "gte":
						return { [field]: { $gte: val } };
					case "lt":
						return { [field]: { $lt: val } };
					case "lte":
						return { [field]: { $lte: val } };
					case "in":
						return { [field]: { $in: val } };
					case "not_in":
						return { [field]: { $nin: val } };
					case "like":
						return { [field]: { $regex: val, $options: "i" } };
					case "not_like":
						return { [field]: { $not: { $regex: val, $options: "i" } } };
					case "between":
						return { [field]: { $gte: val[0], $lte: val[1] } };
					case "not_between":
						return { [field]: { $not: { $gte: val[0], $lte: val[1] } } };
					case "is":
						return { [field]: val };
					default:
						throw new Error(`Unsupported MongoDB operator: ${filter.operator}`);
				}
			});

			// Gabungkan setiap OR group dalam 1 $or
			return orGroup.length === 1 ? orGroup[0] : { $or: orGroup };
		});

		return andGroups.length === 1 ? andGroups[0] : { $and: andGroups };
	} catch (error) {
		throw error;
	}
}

function buildSQLFilter(filter, time_threshold, dialect_driver) {
	try {
		const { column, operator, value } = filter;

		// Tentukan nama kolom final (colExpr)
		const colExpr = column;

		// Tangani nilai DYNAMIC(...) jika ada
		let val = value;

		if (typeof val === "string" && /^DYNAMIC\((.+)\)$/.test(val)) {
			let extracted = val.match(/^DYNAMIC\((.+)\)$/)[1];

			const isNumeric = !isNaN(extracted) && !isNaN(parseFloat(extracted));
			if (isNumeric) extracted = Number(extracted);

			const format = timeHandler.getFormat(extracted);

			if (time_threshold != null) {
				if (format === "epoch_ms") {
					val = time_threshold;
				} else if (format === "epoch_s") {
					val = Math.floor(time_threshold / 1000);
				} else {
					val = timeHandler.epochToString(time_threshold, format);
				}
			} else {
				val =
					format === "epoch_ms" || format === "epoch_s"
						? Number(extracted)
						: extracted;
			}
		}

		// Format nilai SQL
		if (typeof val === "string") {
			val = `'${val}'`;
		} else if (val === null) {
			val = "NULL";
		}

		// Khusus operator IN dan BETWEEN gunakan value asli (tanpa overwrite val)
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
			case "like": {
				const keyword = dialect_driver.includes("postgres") ? "ILIKE" : "LIKE";
				return `${colExpr} ${keyword} ${val}`;
			}
			case "not_like": {
				const keyword = dialect_driver.includes("postgres")
					? "NOT ILIKE"
					: "NOT LIKE";
				return `${colExpr} ${keyword} ${val}`;
			}
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

module.exports = { extract };
