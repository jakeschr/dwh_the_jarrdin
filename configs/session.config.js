const session = require("express-session");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const { Connection } = require("../models");

/**
 * Konfigurasi session untuk aplikasi Express.
 */
module.exports = session({
	/**
	 * Nama cookie yang digunakan untuk menyimpan session ID (sid).
	 * Jika tidak ada environment variable SESSION_NAME, maka defaultnya adalah "connect.sid".
	 * Menggunakan nama yang unik dapat meningkatkan keamanan dan menghindari konflik dengan aplikasi lain.
	 */
	name: process.env.SESSION_NAME || "connect.sid",

	/**
	 * Secret key yang digunakan untuk mengenkripsi session.
	 * Session ini dienkripsi agar tidak bisa dibaca atau dimodifikasi oleh pengguna secara langsung.
	 * Jika tidak ada environment variable SECRET_KEY, maka akan menggunakan nilai default "supersecret".
	 */
	secret: process.env.SECRET_KEY || "supersecret",

	/**
	 * Mengatur apakah session akan disimpan ulang ke database walaupun tidak ada perubahan.
	 * - true  -> Setiap request akan memperbarui sesi, bahkan jika tidak ada perubahan.
	 *           Ini dapat memperpanjang masa aktif sesi, tetapi juga meningkatkan beban database.
	 * - false -> Sesi hanya akan diperbarui ke database jika ada perubahan pada session.
	 *           Ini lebih efisien dan mengurangi beban database.
	 */
	resave: false,

	/**
	 * Menentukan apakah session baru (yang belum diinisialisasi) harus disimpan ke database.
	 * - true  -> Semua session (termasuk yang kosong) akan langsung disimpan ke database.
	 *           Ini tidak efisien dan bisa memenuhi database dengan data tidak berguna.
	 * - false -> Session baru hanya akan disimpan jika sudah ada perubahan data di dalamnya.
	 *           Ini adalah pilihan terbaik untuk menghemat resource database.
	 */
	saveUninitialized: false,

	/**
	 * Mengatur agar session diperpanjang setiap kali user melakukan request.
	 * Jika diaktifkan (true), session akan terus diperpanjang selama user tetap aktif.
	 * Jika dinonaktifkan (false), session akan kedaluwarsa berdasarkan maxAge.
	 */
	rolling: true,

	/**
	 * Menghapus session dari database saat req.session = null.
	 * - "destroy" -> Session benar-benar dihapus dari database.
	 * - "keep"    -> Session tetap ada di database tetapi tidak aktif.
	 */
	unset: "destroy",

	/**
	 * Menentukan apakah aplikasi berjalan di balik proxy (misalnya Nginx, Cloudflare, atau AWS ELB).
	 * Jika diaktifkan (true), maka pengaturan secure cookie tetap berlaku meskipun aplikasi berjalan di belakang proxy.
	 * Ini penting untuk memastikan session tetap aman saat menggunakan HTTPS melalui proxy.
	 */
	// proxy: true,

	/**
	 * Konfigurasi penyimpanan session di database menggunakan SequelizeStore.
	 * Ini memungkinkan session tetap bertahan meskipun server di-restart.
	 */
	store: new SequelizeStore({
		// Menggunakan koneksi database yang telah dikonfigurasi di models/index.js
		db: Connection,

		// Nama tabel untuk menyimpan session, default name "Sessions"
		tableName: "session",

		/**
		 * Waktu kedaluwarsa session di database.
		 * Dalam hal ini, session akan otomatis dihapus setelah 24 jam = 86400000 ms
		 */
		expiration: 24 * 60 * 60 * 1000,

		/**
		 * Interval waktu untuk memeriksa dan menghapus session yang telah kedaluwarsa.
		 * Dalam hal ini, setiap 15 menit session yang expired akan dihapus dari database.
		 */
		checkExpirationInterval: 15 * 60 * 1000, // 15 menit = 900000 ms
	}),

	/**
	 * Konfigurasi cookie yang digunakan untuk menyimpan session ID di browser pengguna.
	 */
	cookie: {
		/**
		 * Mencegah JavaScript di browser membaca cookie untuk menghindari serangan XSS (Cross-Site Scripting).
		 * - true  -> Cookie hanya dapat diakses oleh server dan tidak bisa dibaca oleh JavaScript di browser.
		 * - false -> Cookie dapat diakses oleh JavaScript di browser, berisiko terhadap serangan XSS.
		 */
		httpOnly: true,

		/**
		 * Mengaktifkan cookie hanya saat menggunakan HTTPS.
		 * Jika aplikasi berjalan dalam mode production, maka cookie hanya dikirim jika menggunakan HTTPS.
		 * - true  -> Cookie hanya dikirim melalui koneksi HTTPS (direkomendasikan untuk production).
		 * - false -> Cookie bisa dikirim melalui HTTP maupun HTTPS (bisa berbahaya jika digunakan di production).
		 */
		secure: process.env.NODE_ENV === "production",

		/**
		 * Memaksa Express untuk selalu menggunakan secure: true meskipun berada di belakang proxy.
		 * Ini berguna saat aplikasi berjalan di infrastruktur yang menggunakan proxy SSL seperti Nginx.
		 * - true  -> Cookie tetap secure meskipun berada di belakang proxy.
		 * - false -> Cookie mungkin tidak secure jika tidak ada HTTPS di aplikasi langsung.
		 */
		// secureProxy: true,

		/**
		 * Waktu kedaluwarsa cookie.
		 * Dalam hal ini, cookie akan otomatis kedaluwarsa setelah 24 jam = 86400000 ms
		 */
		maxAge: 24 * 60 * 60 * 1000,

		/**
		 * Mengontrol kapan cookie akan dikirim dalam permintaan lintas situs (CSRF protection).
		 * - "strict" -> Cookie hanya dikirim untuk request dari domain yang sama (keamanan maksimal, mencegah CSRF).
		 * - "lax"    -> Cookie dikirim dalam request lintas situs jika ada interaksi user (cukup aman, masih melindungi dari CSRF).
		 * - "none"   -> Cookie dikirim dalam semua request (tidak direkomendasikan karena rentan terhadap serangan CSRF).
		 */
		sameSite: "strict",

		/**
		 * Memungkinkan cookie session berlaku di subdomain yang berbeda.
		 * Jika domain diatur ke ".sparkspos.com", maka cookie bisa digunakan di:
		 * - sparkspos.com
		 * - app.sparkspos.com
		 * - dashboard.sparkspos.com
		 * - dll.
		 * Jika tidak diatur, maka cookie hanya berlaku di domain yang sama dengan aplikasi saat ini.
		 */
		// domain: ".sparkspos.com",

		/**
		 * Membatasi penggunaan cookie hanya pada path tertentu dalam aplikasi.
		 * Dalam kasus ini, cookie hanya berlaku untuk endpoint yang ada di "/api".
		 * Jika user mengakses halaman lain di luar "/api", session tidak akan terbaca.
		 */
		// path: "/api",

		/**
		 * Menandatangani cookie dengan secret key yang telah ditentukan di konfigurasi session.
		 * Ini memastikan bahwa cookie tidak bisa dimodifikasi oleh user.
		 */
		// signed: true,
	},
});
