const { responseHandler } = require("../utils/response-handler.util.js");

/**
 * Middleware otorisasi untuk memverifikasi apakah sesi pengguna valid.
 * Jika tidak ada sesi pengguna, permintaan akan ditolak dengan kode 401.
 * Jika ada, data pengguna ditambahkan ke objek req untuk digunakan di controller.
 *
 * @param {import('express').Request} req - Objek permintaan Express.
 * @param {import('express').Response} res - Objek respons Express.
 * @param {import('express').NextFunction} next - Fungsi next middleware.
 */
const authorization = async (req, res, next) => {
	try {
		const { user } = req.session;

		// Jika tidak login
		if (!user) {
			if (req.path.startsWith("/page")) {
				// Jika akses ke /page tanpa login, redirect ke login
				return res.redirect("/page/signin");
			}

			// Jika akses ke endpoint selain /page, kirim respons JSON 401
			return responseHandler(res, {
				code: 401,
				errors: "Unauthorized. Please signin.",
			});
		}

		// Lanjutkan dengan menambahkan data user ke request
		req.user = user;

		next();
	} catch (error) {
		console.error("Authorization Error:", error);
		return responseHandler(res, {
			code: 500,
			errors: "Internal Server Error.",
		});
	}
};

module.exports = { authorization };
