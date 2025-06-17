const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

const app = express();

dotenv.config();

const { Synchronize, ClearSession } = require("./models");
const { scheduleHandler } = require("./utils/schedule-handler.util");
const { router } = require("./routes");
const convertQueryParams = require("./middlewares/convert-query-params.middleware");
const sessionConfig = require("./configs/session.config");
const corsConfig = require("./configs/cors.config");

(async () => {
	try {
		// Menyesuaikan tabel database dengan model terbaru
		// await Synchronize({ force: false, alter: true });
		//
		// Menghapus semua session di database agar memulai dari sesi yang bersih
		// await ClearSession();
		//
		// Menjalankan ulang semua job yang aktif
		// await scheduleHandler.reloadTask();
	} catch (error) {
		console.error(error);
		process.exit(1); // Jika terjadi error saat sinkronisasi atau pembersihan session, hentikan aplikasi
	}
})();

// Middleware untuk menangani request body dalam berbagai format
app.use(express.json()); // Mengizinkan Express memproses request dalam format JSON
app.use(express.urlencoded({ extended: true })); // Mengizinkan parsing data dalam format URL-encoded

// Menggunakan body-parser untuk mengatur batas ukuran request body agar tidak terlalu besar
app.use(bodyParser.json({ limit: "50mb" })); // Membatasi ukuran request body JSON maksimal 50MB

// Middleware untuk menangani cookie dalam request
app.use(cookieParser(process.env.SECRET_KEY)); // Menggunakan SECRET_KEY dari .env untuk parsing cookie yang terenkripsi

// Middleware untuk menangani session pengguna menggunakan konfigurasi dari session.config.js
app.use(sessionConfig);

// Middleware untuk menangani CORS menggunakan konfigurasi dari cors.config.js
app.use(corsConfig);

// Middleware custom untuk mengubah query params dalam request (jika ada aturan khusus dalam aplikasi)
app.use(convertQueryParams);

// Menerapkan semua route dari folder "routes"
app.use("/", router);

// Menentukan port server berdasarkan environment variable atau default ke 3000
const port = process.env.PORT || 3000;

// Menjalankan server Express pada port yang telah ditentukan
app.listen(port, () => {
	console.log(`🚀 Server ready at http://localhost:${port}`);
});
