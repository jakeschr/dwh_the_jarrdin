const cors = require("cors"); // Mengimpor middleware CORS untuk mengatur akses lintas domain

/**
 * Konfigurasi CORS untuk API Express
 */
module.exports = cors({
	/**
	 * `origin` menentukan domain mana yang diizinkan untuk mengakses API.
	 * Bisa berupa:
	 * - "*" -> Mengizinkan semua domain (tidak disarankan untuk produksi).
	 * - "https://example.com" -> Hanya mengizinkan domain tertentu.
	 * - [/\.example\.com$/, "https://sub.example.com"] -> Bisa menggunakan regex untuk subdomain tertentu.
	 */
	origin: [],

	/**
	 * `credentials` menentukan apakah browser akan mengirimkan cookie dan header autentikasi.
	 * - true -> Izinkan pengiriman cookie (harus digunakan jika menggunakan session-based auth).
	 * - false -> Tidak mengizinkan pengiriman cookie dan header autentikasi.
	 */
	credentials: true,

	/**
	 * `methods` menentukan metode HTTP mana yang diizinkan dalam permintaan lintas domain.
	 * Jika tidak ditentukan, defaultnya adalah ["GET", "HEAD", POST"].
	 */
	methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

	/**
	 * `allowedHeaders` menentukan header HTTP apa saja yang boleh dikirimkan dalam request.
	 * Biasanya header ini berisi token autentikasi atau format konten.
	 */
	allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],

	/**
	 * `exposedHeaders` menentukan header mana yang bisa diakses oleh frontend setelah response diterima.
	 * Ini berguna jika kita ingin mengekspos header tertentu seperti token atau informasi lainnya.
	 */
	exposedHeaders: ["Content-Length", "X-Access-Token", "X-Refresh-Token"],

	/**
	 * `maxAge` menentukan berapa lama hasil preflight request akan disimpan oleh browser.
	 * - 600 berarti browser akan mengingat izin CORS selama 10 menit, sehingga tidak perlu preflight berulang.
	 */
	// maxAge: 600,

	/**
	 * `preflightContinue` menentukan apakah request preflight OPTIONS akan diteruskan ke handler berikutnya.
	 * - true -> Middleware CORS akan meneruskan preflight request ke handler lain.
	 * - false -> Middleware akan langsung mengirimkan response untuk preflight request.
	 */
	// preflightContinue: false,

	/**
	 * `optionsSuccessStatus` menentukan status kode HTTP yang dikembalikan untuk preflight request.
	 * Beberapa browser lebih suka 204, sementara yang lain menggunakan 200.
	 */
	// optionsSuccessStatus: 204,
});
