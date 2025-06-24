const math = require("mathjs");
const { timeHandler } = require("../time-handler.util");

function transform({ data, configs, is_preview }) {
	data.getTableByPath = function (path) {
		const [scope, table, column] = path.split(".");

		if (!this[scope]) {
			throw new Error(
				`Invalid scope: '${scope}' (expected "src', 'dst', or 'rst')`
			);
		}

		if (!this[scope][table]) {
			throw new Error(`Table '${table}' not found in '${scope}'`);
		}

		const rows = this[scope][table];
		return rows;
	};

	for (const config of configs.sort((a, b) => a.order - b.order)) {
		const { table, columns, transforms: actions, init_value } = config;

		// Ambil data awal
		data.dst[table] = data.getTableByPath(init_value);

		if (Array.isArray(actions) && actions.length > 0) {
			try {
				// Eksekusi setiap action sesuai urutan
				for (const action of actions.sort((a, b) => a.order - b.order)) {
					const type = action.type;

					switch (type) {
						case "map":
							data.dst[table] = map({
								data: data.dst[table],
								column: action.column,
								mapping: action.mapping,
							});
							break;
						case "join":
							data.dst[table] = join({
								left_data: data.getTableByPath(action.left),
								right_data: data.getTableByPath(action.right),
								left_key: action.left.split(".").pop(),
								right_key: action.right.split(".").pop(),
								join_type: action.join_type,
							});
							break;
						case "filter":
							data.dst[table] = filter({
								data: data.dst[table],
								column: action.column,
								operator: action.operator,
								value: action.value,
							});
							break;
						case "rename":
							data.dst[table] = rename({
								data: data.dst[table],
								rename_from: action.rename_from,
								rename_to: action.rename_to,
							});

							break;
						case "formula":
							data.dst[table] = formula({
								data: data.dst[table],
								expression: action.expression,
								as: action.as,
							});
							break;
						case "aggregate":
							data.dst[table] = aggregate({
								data: data.dst[table],
								operation: action.operation,
								column_target: action.target,
								column_group_by: action.group_by,
								as: action.as,
							});
						case "time-format":
							data.dst[table] = timeFormat({
								data: data.dst[table],
								column: action.column,
								old_format: action.old_format,
								new_format: action.new_format,
							});
							break;
						default:
							throw new Error(`Unsupported transform type: ${type}`);
					}
				}

				// Bersihkan kolom agar hanya sesuai columns (jika ada)
				if (columns && Array.isArray(columns)) {
					data.dst[table] = (data.dst[table] || []).map((row) => {
						const cleaned = {};
						for (const key of columns) {
							if (row.hasOwnProperty(key)) {
								cleaned[key] = row[key];
							}
						}
						return cleaned;
					});
				}

				// Tentukan batas limit jika modenya adalah preview
				if (is_preview) {
					data.dst[table] = (data.dst[table] || []).slice(0, 25);
				}
			} catch (error) {
				data.dst[table] = error.message;
			}
		}
	}
	return data.dst;
}

/**
 * Melakukan pemetaan nilai dari sebuah column berdasarkan objek mapping yang diberikan.
 * Cocok untuk konversi nilai seperti kode ke label, status ke teks, dsb.
 *
 * Contoh penggunaan:
 *  map({
 *    data: [{ status: 1 }, { status: 0 }],
 *    column: "status",
 *    mapping: { 1: "Active", 0: "Inactive" },
 *    as: "status_label"
 *  })
 *  // Hasil: [{ status: 1, status_label: "Active" }, { status: 0, status_label: "Inactive" }]
 *
 * @param {Object} param0 - Objek parameter.
 * @param {Array<Object>} param0.data - Data array yang ingin diproses.
 * @param {string} param0.column - Field path yang nilainya akan dipetakan.
 * @param {Object} param0.mapping - Objek pemetaan nilai (key: original value, value: mapped value).
 * @param {string} param0.as - Nama column baru untuk menyimpan hasil pemetaan.
 * @returns {Array<Object>} - Data dengan column hasil pemetaan.
 */
function map({ data = [], column, mapping }) {
	try {
		const result = data.map((row) => {
			// Ambil nilai asli dari column yang ditentukan
			const rawValue = row[column];

			// Pemetaan berdasarkan nilai asli, default ke null jika tidak ditemukan
			const mappedValue = mapping[rawValue] ?? null;

			// Kembalikan baris dengan column tambahan hasil pemetaan
			return {
				...row,
				[column]: mappedValue,
			};
		});

		// Kembalikan semua data yang sudah dipetakan
		return result;
	} catch (error) {
		throw new Error(`MAP ERROR: ${error}`);
	}
}

/**
 * Melakukan operasi join (inner, left, right, outer) antara dua array of object.
 *
 * @param {Object} param0 - Objek parameter.
 * @param {string} param0.left_key - Path key pada data kiri (bisa nested, misalnya "user.id").
 * @param {Array<Object>} param0.left_data - Array objek data sisi kiri.
 * @param {string} param0.right_key - Path key pada data kanan (bisa nested).
 * @param {Array<Object>} param0.right_data - Array objek data sisi kanan.
 * @param {string} [param0.join_type="inner"] - Jenis join yang diinginkan: "inner", "left", "right", "outer".
 * @returns {Array<Object>} - Hasil array join dari kedua data.
 */
function join({
	left_data = [],
	right_data = [],
	left_key,
	right_key,
	join_type = "inner",
}) {
	/**
	 * Menggabungkan dua objek (baris data) dari hasil join, dengan penanganan konflik key.
	 *
	 * Jika ada key yang sama antara left_row dan right_row, maka key dari right_row
	 * akan ditambahkan prefix "right_" agar tidak menimpa data dari left_row.
	 *
	 * Contoh:
	 *    left_row: { id: 1, name: "A" }
	 *    right_row: { id: 2, price: 100 }
	 *    hasil: { id: 1, name: "A", right_id: 2, price: 100 }
	 *
	 * @param {Object} left_row - Objek baris dari data kiri (bisa kosong/null).
	 * @param {Object} right_row - Objek baris dari data kanan (bisa kosong/null).
	 * @returns {Object} Objek hasil penggabungan yang aman dari konflik key.
	 */
	const mergeRowsSafely = (left_row = {}, right_row = {}) => {
		const merged = {};
		const left_keys = Object.keys(left_row || {});
		const right_keys = Object.keys(right_row || {});

		// Salin semua key dari left_row ke merged
		for (const key of left_keys) {
			merged[key] = left_row[key];
		}

		// Salin semua key dari right_row, dengan prefix jika terjadi konflik
		for (const key of right_keys) {
			if (merged.hasOwnProperty(key)) {
				// Jika key sudah ada dari left_row, beri prefix "right_"
				merged[`right_${key}`] = right_row[key];
			} else {
				merged[key] = right_row[key];
			}
		}

		return merged;
	};

	/**
	 * Mengambil nilai dari sebuah objek menggunakan path bertingkat (dot notation).
	 *
	 * Contoh:
	 *    const obj = { user: { profile: { name: "John" } } };
	 *    getByPath(obj, "user.profile.name") // Hasil: "John"
	 *
	 * @param {Object} obj - Objek yang ingin diakses nilainya.
	 * @param {string} path - Path string yang menunjukkan lokasi properti, dipisahkan dengan titik (misalnya "user.id").
	 * @returns {*} Nilai dari path yang diberikan, atau undefined jika tidak ditemukan.
	 */
	const getByPath = (obj, path) => {
		if (!path) return undefined;

		// Pisahkan path menjadi array berdasarkan titik, lalu navigasi ke dalam objek secara bertingkat
		return path.split(".").reduce((o, k) => (o || {})[k], obj);
	};

	try {
		// Validasi tipe join
		if (!["inner", "left", "right", "outer"].includes(join_type)) {
			throw new Error(
				`Invalid join type '${join_type}'. Must be one of: ${[
					"inner",
					"left",
					"right",
					"outer",
				].join(", ")}`
			);
		}

		// Menampung hasil akhir join
		const result = [];
		// Menyimpan index data kanan yang sudah matched (untuk keperluan right/outer join)
		const matched_right_indices = new Set();

		// Iterasi setiap data dari sisi kiri
		for (const left_row of left_data) {
			const left_val = getByPath(left_row, left_key);
			let match_found = false;

			// Coba cari kecocokan di right_data
			right_data.forEach((right_row, index) => {
				const right_val = getByPath(right_row, right_key);

				// Jika nilai cocok dan tidak undefined, gabungkan baris
				if (
					left_val === right_val &&
					left_val !== undefined &&
					right_val !== undefined
				) {
					result.push(mergeRowsSafely(left_row, right_row));
					matched_right_indices.add(index);
					match_found = true;
				}
			});

			// Jika tidak ada kecocokan dan tipe join adalah left atau outer, masukkan left_row dengan null di right
			if (!match_found && (join_type === "left" || join_type === "outer")) {
				result.push(mergeRowsSafely(left_row, null));
			}
		}

		// Jika tipe join adalah right atau outer, tambahkan baris dari right_data yang belum matched
		if (join_type === "right" || join_type === "outer") {
			right_data.forEach((right_row, index) => {
				if (!matched_right_indices.has(index)) {
					result.push(mergeRowsSafely(null, right_row));
				}
			});
		}

		// Kembalikan hasil join
		return result;
	} catch (error) {
		throw new Error(`JOIN ERROR: ${error}`);
	}
}

/**
 * Menyaring data berdasarkan kondisi logika sederhana, seperti:
 *   - "age >= 30"
 *   - "name == 'John'"
 *   - "price < 100"
 *
 * @param {Object} param0 - Objek parameter.
 * @param {Array<Object>} param0.data - Data yang ingin difilter (array of objects).
 * @param {string} param0.column - Attribute dari data yang akan di filter.
 * @param {string} param0.operator - Operator pembanding, nilai valid ['==', '!=', '<=', '>=', '<', '>'].
 * @param {string} param0.value - Nilai untuk pembanding.
 * @returns {Array<Object>} - Data hasil filter yang memenuhi kondisi.
 */
function filter({ data = [], column, operator, value }) {
	try {
		// Lakukan filter terhadap setiap baris data
		const result = data.filter((row) => {
			// Ambil nilai kolom berdasarkan path
			const leftVal = row[column];

			switch (operator) {
				case "==":
					return leftVal == value; // Bandingkan longgar (non-strict)
				case "!=":
					return leftVal != value;
				case ">":
					return leftVal > value;
				case "<":
					return leftVal < value;
				case ">=":
					return leftVal >= value;
				case "<=":
					return leftVal <= value;
				default:
					throw new Error(`Unsupported operator: ${operator}`);
			}
		});

		// Kembalikan hasil data yang lolos filter
		return result;
	} catch (error) {
		// Lempar kembali error agar bisa ditangani oleh pemanggil
		throw error;
	}
}

/**
 * Mengubah nama column dalam data (array of objects), dari `rename_from` menjadi `rename_to`.
 * Mendukung pengambilan data dari nested path, tetapi hanya menghapus key lama jika berada di level satu.
 *
 * Contoh penggunaan:
 *  rename({
 *    data: [{ name: "John", age: 20 }],
 *    rename_from: "name",
 *    rename_to: "full_name"
 *  })
 *  // Hasil: [{ full_name: "John", age: 20 }]
 *
 * @param {Object} param0 - Parameter konfigurasi.
 * @param {Array<Object>} param0.data - Array data yang akan dimodifikasi.
 * @param {string} param0.rename_from - Nama column lama.
 * @param {string} param0.rename_to - Nama column baru.
 * @returns {Array<Object>} - Data hasil dengan column yang sudah di-rename.
 */
function rename({ data = [], rename_from, rename_to }) {
	try {
		const result = data.map((row) => {
			if (row[rename_to]) {
				throw new Error(`Attribute ${rename_to} already exist in dst.`);
			}

			// Ambil nilai dari column lama
			const value = row[rename_from] || null;

			// Tambahkan column baru dengan nama baru dan isi dari column lama
			row[rename_to] = value;

			// hapus column lama
			delete row[rename_from];

			return row;
		});

		return result;
	} catch (error) {
		throw new Error(`ERROR RENAME: ${error}`);
	}
}

/**
 * Menghitung nilai baru berdasarkan ekspresi matematika, dan menambahkannya sebagai kolom baru.
 *
 * Contoh:
 *  formula({
 *    data: [{ price: 10, qty: 2 }],
 *    expression: "price * qty",
 *    as: "total"
 *  })
 *  // Hasil: [{ price: 10, qty: 2, total: 20 }]
 *
 * @param {Object} param0 - Parameter konfigurasi.
 * @param {Array<Object>} param0.data - Data yang akan dihitung (array of objects).
 * @param {string} param0.expression - Ekspresi matematika/logika berbasis nama column.
 * @param {string} param0.as - Nama kolom baru untuk menyimpan hasil perhitungan.
 * @returns {Array<Object>} - Data dengan kolom hasil perhitungan.
 */
function formula({ data = [], expression, as }) {
	try {
		if (!Array.isArray(data)) {
			throw new Error(`'data' must be an array`);
		}

		const result = data.map((row) => {
			// Evaluasi ekspresi matematika/logika berdasarkan isi row menggunakan mathjs
			const value = math.evaluate(expression, row);

			// Kembalikan objek baru dengan kolom tambahan berisi hasil kalkulasi
			return {
				...row,
				[as]: value,
			};
		});

		return result;
	} catch (error) {
		console.error(error);

		throw new Error(`FORMULA ERROR: ${error.message}`);
	}
}

/**
 * Melakukan agregasi data berdasarkan kolom tertentu (group_by),
 * dan menerapkan operasi agregasi seperti sum, count, avg, max, min.
 *
 * Contoh penggunaan:
 *  aggregate({
 *    data: [...],
 *    operation: "sum",
 *    column_target: "price",
 *    column_group_by: "category",
 *    as: "total_price"
 *  })
 *
 * @param {Object} param0 - Parameter konfigurasi agregasi.
 * @param {Array<Object>} param0.data - Data array yang ingin diagregasi.
 * @param {string} param0.operation - Operasi agregasi: "sum", "count", "avg", "max", "min".
 * @param {string} param0.column_target - Attribute yang akan di aggregasi (tidak diperlukan untuk "count").
 * @param {string} param0.column_group_by - Attribute yang akan digunakan untuk pengelompokan (grouping).
 * @param {string} param0.as - Nama kolom hasil agregasi dalam output.
 * @returns {Array<Object>} - Array berisi hasil agregasi per grup.
 */
function aggregate({
	data = [],
	operation,
	column_target,
	column_group_by,
	as,
}) {
	try {
		if (!["sum", "count", "avg", "max", "min"].includes(operation)) {
			throw new Error(
				`Unsupported operation '${operation}'. Must be one of: sum, count, avg, max, min`
			);
		}

		// Kelompokkan data berdasarkan column_group_by
		const groups = data.reduce((acc, row) => {
			const key = row[column_group_by];
			if (!acc[key]) acc[key] = [];
			acc[key].push(row);
			return acc;
		}, {});

		// Proses setiap grup dengan map
		const result = Object.entries(groups).map(([groupKey, rows]) => {
			let value;

			switch (operation) {
				case "sum":
					value = rows.reduce(
						(acc, row) => acc + (parseFloat(row[column_target]) || 0),
						0
					);
					break;
				case "count":
					value = rows.length;
					break;
				case "avg":
					value =
						rows.reduce(
							(acc, row) => acc + (parseFloat(row[column_target]) || 0),
							0
						) / rows.length;
					break;
				case "max":
					value = Math.max(
						...rows.map((row) => parseFloat(row[column_target]) || 0)
					);
					break;
				case "min":
					value = Math.min(
						...rows.map((row) => parseFloat(row[column_target]) || 0)
					);
					break;
			}

			// Ambil data dasar dari baris pertama dalam grup
			const base = { ...rows[0] };

			// Buat column agregat baru
			base[as] = value;

			return base;
		});

		return result;
	} catch (error) {
		throw new Error(`AGGREGATE ERROR: ${error.message}`);
	}
}

/**
 * Mengubah format waktu pada kolom tertentu dalam array data.
 * Format asal dan tujuan dapat berupa format string (misal: "DD/MM/YYYY", "YYYY-MM-DD"),
 * atau format waktu numerik seperti epoch dalam milidetik (`epoch_ms`) dan detik (`epoch_s`).
 *
 * Jika `old_format` tidak diberikan, maka sistem akan otomatis mendeteksi format asal dari nilai waktu.
 *
 * Contoh penggunaan:
 *  timeFormat({
 *    data: [...],
 *    column: "created_at",
 *    old_format: "YYYY-MM-DDTHH:mm:ssZ",
 *    new_format: "DD/MM/YYYY"
 *  })
 *
 * Contoh lain (konversi ke epoch ms):
 *  timeFormat({
 *    data: [...],
 *    column: "created_at",
 *    new_format: "epoch_ms"
 *  })
 *
 * @param {Object} param0 - Parameter konfigurasi transformasi.
 * @param {Array<Object>} param0.data - Array objek data yang akan diproses.
 * @param {string} param0.column - Nama kolom yang akan diubah format waktunya.
 * @param {string} [param0.old_format] - Format waktu asal (jika tidak diberikan, akan dideteksi otomatis).
 * @param {string} param0.new_format - Format waktu tujuan (string format atau "epoch_ms"/"epoch_s").
 * @returns {Array<Object>} - Data yang telah diubah format waktu pada kolom tertentu.
 * @throws {Error} - Jika format waktu tidak valid atau tidak dikenali.
 */
function timeFormat({ data = [], column, old_format, new_format }) {
	try {
		timeHandler.isSupportedFormat(old_format);
		timeHandler.isSupportedFormat(new_format);

		let transformValue;

		const old_type = old_format.startsWith("epoch") ? "epoch" : "sting";
		const new_type = new_format.startsWith("epoch") ? "epoch" : "sting";

		if (old_type === "string" && new_type === "string") {
			transformValue = (val) =>
				timeHandler.stringToString(val, old_format, new_format);
		} else if (old_type === "string" && new_type === "epoch") {
			transformValue = (val) =>
				timeHandler.stringToEpoch(val, old_format, new_format);
		} else if (old_type === "epoch" && new_type === "epoch") {
			transformValue = (val) =>
				timeHandler.epochToString(val, new_format, old_format);
		} else if (old_type === "epoch" && new_type === "string") {
			transformValue = (val) =>
				timeHandler.epochToEpoch(val, old_format, new_format);
		}

		const result = data.map((row) => {
			const value = row[column];
			if (value === null || value === undefined) return row;

			return { ...row, [column]: transformValue(value) };
		});

		return result;
	} catch (error) {
		throw new Error(`ERROR TIME-FORMAT: ${error.message}`);
	}
}

module.exports = { transform };
