// Middleware untuk mengonversi query parameters ke number jika sesuai
const convertQueryParams = (req, res, next) => {
	Object.keys(req.query).forEach((key) => {
		if (!isNaN(req.query[key]) && req.query[key].trim() !== "") {
			req.query[key] = Number(req.query[key]); // Konversi ke number
		}
	});
	next();
};

module.exports = convertQueryParams;
