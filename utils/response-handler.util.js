const codes = require("../configs/json/response-codes.json");

const responseHandler = (res, payload) => {
	res.status(payload.code).json({
		status: codes[payload.code]?.status || null,
		message: codes[payload.code]?.message || null,
		data: payload.data || null,
		meta: payload.meta || null,
		errors: payload.errors || null,
	});
};

module.exports = { responseHandler };
