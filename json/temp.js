async function createTable(data) {
	let connection;
	try {
		const config = await DatabaseRepository.findForConnection(data.database_id);

		if (config.type !== "lake") {
			throw Object.assign(
				new Error(
					"Hanya database dengan tipe 'lake' yang diperbolehkan membuat tabel."
				),
				{ code: 400 }
			);
		}

		if (config.password) {
			config.password = passwordHandler.decryptSymmetric(config.password);
		}

		connection = await connectionHandler.open(config);

		// Gabungkan semua query tabel
		const tableQueries = data.tables.map((table) =>
			buildCreateTableQuery(table)
		);

		const fullQuery = ["START TRANSACTION;", ...tableQueries, "COMMIT;"].join(
			"\n\n"
		);

		await connection.query(fullQuery);

		await connectionHandler.close(connection, config.dialect);

		return {
			status: "success",
			message: `Berhasil membuat ${data.tables.length} tabel di database lake.`,
			query: fullQuery,
		};
	} catch (error) {
		if (connection) {
			await connection.query("ROLLBACK");
		}
		throw error;
	}
}

async function databaseInfo(connection, dialect, databaseName) {
	if (!connection || !dialect)
		throw new Error("Koneksi dan dialect harus diberikan.");

	const result = {
		database: databaseName || null,
		tables: [],
	};

	let tables = [];

	const getTableListQuery = {
		mysql: `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE';`,
		postgres: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`,
		sqlserver: `SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE';`,
		oracle: `SELECT table_name FROM user_tables`,
		sybase: `SELECT name as table_name FROM sysobjects WHERE type = 'U';`,
		odbc: `SELECT table_name FROM information_schema.tables WHERE table_type = 'TABLE';`,
		mongodb: null,
	};

	const getColumnInfoQuery = {
		mysql: `SELECT column_name, column_type as type, is_nullable FROM information_schema.columns WHERE table_schema = ? AND table_name = ?;`,
		postgres: `SELECT column_name, data_type as type, is_nullable FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public';`,
		sqlserver: `SELECT column_name, data_type as type, is_nullable FROM information_schema.columns WHERE table_name = ?;`,
		oracle: `SELECT column_name, data_type as type, nullable as is_nullable FROM user_tab_columns WHERE table_name = :1`,
		sybase: `SELECT c.name AS column_name, t.name AS type, c.isnullable AS is_nullable FROM syscolumns c JOIN systypes t ON c.usertype = t.usertype WHERE c.id = object_id(?)`,
		odbc: `SELECT column_name, type_name as type, is_nullable FROM information_schema.columns WHERE table_name = ?;`,
		mongodb: null,
	};

	const getPrimaryKeyQuery = {
		mysql: `SELECT column_name FROM information_schema.key_column_usage WHERE table_schema = ? AND table_name = ? AND constraint_name = 'PRIMARY';`,
		postgres: `SELECT a.attname AS column_name FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = $1::regclass AND i.indisprimary;`,
		sqlserver: `SELECT column_name FROM information_schema.key_column_usage WHERE table_name = ? AND constraint_name LIKE 'PK_%';`,
		oracle: `SELECT cols.column_name FROM all_constraints cons JOIN all_cons_columns cols ON cons.constraint_name = cols.constraint_name WHERE cons.constraint_type = 'P' AND cons.table_name = :1`,
		sybase: `SELECT c.name FROM sysindexes i JOIN sysindexkeys ik ON i.id = ik.id AND i.indid = ik.indid JOIN syscolumns c ON ik.id = c.id AND ik.colid = c.colid WHERE i.id = object_id(?) AND (i.status & 2048) = 2048`,
		odbc: `SELECT column_name FROM information_schema.key_column_usage WHERE table_name = ?;`,
		mongodb: null,
	};

	try {
		if (dialect === "mongodb") {
			const db = connection.db(databaseName);
			tables = await db.listCollections().toArray();
			for (const table of tables) {
				const sample = await db.collection(table.name).findOne();
				const columns = Object.entries(sample || {}).map(([key, val]) => ({
					name: key,
					type: typeof val,
					null: val === null,
				}));
				result.tables.push({ name: table.name, pk: [], columns });
			}
			result.database = databaseName;
			return result;
		}

		const listQuery = getTableListQuery[dialect] || getTableListQuery.odbc;
		tables = await connection.query(listQuery, [databaseName]);
		if (Array.isArray(tables[0])) tables = tables[0]; // mysql2

		for (const row of tables) {
			const tableName = row.table_name || row.TABLE_NAME || row.name;

			const columnQuery =
				getColumnInfoQuery[dialect] || getColumnInfoQuery.odbc;
			const colRes = await connection.query(
				columnQuery,
				[tableName, databaseName].filter(Boolean)
			);
			const columns = (Array.isArray(colRes[0]) ? colRes[0] : colRes).map(
				(col) => ({
					name: col.column_name || col.COLUMN_NAME,
					type: col.type || col.DATA_TYPE,
					null:
						(col.is_nullable || col.NULLABLE || "").toUpperCase() !== "NO"
							? true
							: false,
				})
			);

			const pkQuery = getPrimaryKeyQuery[dialect] || getPrimaryKeyQuery.odbc;
			const pkRes = await connection.query(
				pkQuery,
				[tableName, databaseName].filter(Boolean)
			);
			const pk = (Array.isArray(pkRes[0]) ? pkRes[0] : pkRes).map(
				(col) => col.column_name || col.COLUMN_NAME || col.name
			);

			result.tables.push({ name: tableName, pk, columns });
		}

		return result;
	} catch (err) {
		throw new Error(`Gagal mengambil metadata: ${err.message}`);
	}
}

async function databaseInfo(connection, dialect, databaseName) {
	if (!connection || !dialect) {
		throw new Error("Koneksi dan dialect harus diberikan.");
	}

	let result = {
		database: databaseName || null,
		tables: [],
	};

	const normalizeColumn = (col) => ({
		name: col.name,
		type: col.type,
		null: col.nullable,
	});

	try {
		switch (dialect) {
			case "mysql": {
				const [tables] = await connection.query(
					`SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
					[databaseName]
				);

				for (const row of tables) {
					const table = row.table_name;
					const [cols] = await connection.query(
						`SELECT column_name AS name, column_type AS type, is_nullable FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`,
						[databaseName, table]
					);
					const [pks] = await connection.query(
						`SELECT column_name FROM information_schema.key_column_usage WHERE table_schema = ? AND table_name = ? AND constraint_name = 'PRIMARY'`,
						[databaseName, table]
					);
					result.tables.push({
						name: table,
						pk: pks.map((r) => r.column_name),
						columns: cols.map((c) => ({
							name: c.name,
							type: c.type,
							null: c.is_nullable !== "NO",
						})),
					});
				}
				break;
			}

			case "postgres": {
				const tables = await connection.query(
					`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
				);

				for (const row of tables.rows) {
					const table = row.table_name;
					const cols = await connection.query(
						`SELECT column_name AS name, data_type AS type, is_nullable FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
						[table]
					);
					const pk = await connection.query(
						`SELECT a.attname AS column_name
						 FROM pg_index i
						 JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
						 WHERE i.indrelid = $1::regclass AND i.indisprimary`,
						[table]
					);

					result.tables.push({
						name: table,
						pk: pk.rows.map((r) => r.column_name),
						columns: cols.rows.map((c) => ({
							name: c.name,
							type: c.type,
							null: c.is_nullable !== "NO",
						})),
					});
				}
				break;
			}

			case "sqlserver": {
				const tables = await connection
					.request()
					.query(
						`SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE'`
					);

				for (const row of tables.recordset) {
					const table = row.table_name;
					const cols = await connection
						.request()
						.query(
							`SELECT column_name AS name, data_type AS type, is_nullable FROM information_schema.columns WHERE table_name = '${table}'`
						);
					const pks = await connection
						.request()
						.query(
							`SELECT column_name FROM information_schema.key_column_usage WHERE table_name = '${table}' AND constraint_name LIKE 'PK_%'`
						);
					result.tables.push({
						name: table,
						pk: pks.recordset.map((r) => r.column_name),
						columns: cols.recordset.map((c) => ({
							name: c.name,
							type: c.type,
							null: c.is_nullable !== "NO",
						})),
					});
				}
				break;
			}

			case "oracle": {
				const tables = await connection.execute(
					`SELECT table_name FROM user_tables`
				);
				for (const [table] of tables.rows) {
					const cols = await connection.execute(
						`SELECT column_name AS name, data_type AS type, nullable FROM user_tab_columns WHERE table_name = :1`,
						[table]
					);
					const pks = await connection.execute(
						`SELECT cols.column_name
						 FROM all_constraints cons
						 JOIN all_cons_columns cols ON cons.constraint_name = cols.constraint_name
						 WHERE cons.constraint_type = 'P' AND cons.table_name = :1`,
						[table]
					);
					result.tables.push({
						name: table,
						pk: pks.rows.map(([col]) => col),
						columns: cols.rows.map(([name, type, nullable]) => ({
							name,
							type,
							null: nullable === "Y",
						})),
					});
				}
				break;
			}

			case "sybase":
				const resTablesX = await connection.query(`
	  SELECT table_id, table_name
	  FROM systable
	  WHERE table_type = 'BASE' AND creator = USER_ID()
 `);

				const tablesX = resTablesX.map((row) => ({
					id: row.table_id,
					name: row.table_name,
				}));

				result.tables = [];

				for (const { id: tableId, name: tableName } of tablesX) {
					// Ambil kolom
					const resCols = await connection.query(
						`
			SELECT c.column_name, c."nulls", d.domain_name AS type, CAST(c.width AS int) AS width
			FROM syscolumn c
			LEFT JOIN sysdomain d ON c.domain_id = d.domain_id
			WHERE c.table_id = ?
			ORDER BY c.column_id
	  `,
						[tableId]
					);

					const columns = resCols.map((col) => {
						// Buat type + width jika applicable
						const typeLower = col.type ? col.type.toLowerCase() : "unknown";
						let typeString;
						if (["varchar", "char", "nvarchar", "nchar"].includes(typeLower)) {
							typeString = `${typeLower}(${col.width})`;
						} else if (
							["bigint", "int", "integer", "smallint"].includes(typeLower)
						) {
							typeString = `${typeLower}(${col.width})`; // sesuai konvensi, atau hilangkan jika ingin simple
						} else {
							typeString = typeLower;
						}

						return {
							name: col.column_name,
							type: typeString,
							null: col.nulls === "Y",
						};
					});

					// Ambil pk
					let resPKCols = [];
					try {
						resPKCols = await connection.query(
							`
							  SELECT COLUMN_NAME FROM sp_pkeys(?);
							 `,
							[tableName]
						);
					} catch (err) {
						console.warn(`Gagal ambil PK untuk tabel ${tableName}:`, err);
					}
					const pk = resPKCols.map((col) => col.COLUMN_NAME);

					result.tables.push({
						name: tableName,
						pk,
						columns,
					});
				}
				break;

			case "mongodb": {
				const db = connection.db(databaseName);
				const collections = await db.listCollections().toArray();
				for (const col of collections) {
					const sample = await db.collection(col.name).findOne();
					const columns = Object.entries(sample || {}).map(([key, val]) => ({
						name: key,
						type: typeof val,
						null: val === null,
					}));
					result.tables.push({ name: col.name, pk: [], columns });
				}
				break;
			}

			default:
				throw new Error(
					`Dialect '${dialect}' belum didukung secara eksplisit.`
				);
		}

		return result;
	} catch (error) {
		throw error;
	}
}
