// Middleware untuk mengonversi query parameters ke tipe yang sesuai (number atau boolean)
const convertQueryParams = (req, res, next) => {
	Object.keys(req.query).forEach((key) => {
		const value = req.query[key].trim().toLowerCase();

		if (value === "true") {
			req.query[key] = true;
		} else if (value === "false") {
			req.query[key] = false;
		} else if (!isNaN(value) && value !== "") {
			req.query[key] = Number(req.query[key]);
		}
	});

	next();
};

module.exports = convertQueryParams;
