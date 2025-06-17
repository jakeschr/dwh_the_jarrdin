const axios = require("axios");
const { timeHandler } = require("../time-handler.util");
const xss = require("xss");

async function extract({ api, configs, time_threshold }) {
	const headers = await buildHeaders(api);
	const results = {};

	await Promise.allSettled(
		configs.map(async (config) => {
			try {
				const data = await extractData(api, config, headers, time_threshold);
				results[config.name] = data;
			} catch (error) {
				results[
					config.name
				] = `Extract failed for ${config.target}: ${error.message}`;
			}
		})
	);

	return results;
}

async function extractData(api, config, headers, time_threshold) {
	const url = normalizeUrl(api.base_url, config.target);
	const fields = config.fields;
	const method = (config.http_method || "post").toLowerCase();
	const pagination = config.pagination || undefined;

	let res;

	switch (method) {
		case "post": {
			const filters = buildFilter(config.filters, time_threshold);
			const body = { filters, ...(pagination && { pagination }) };
			res = await axios.post(url, body, { headers });
			break;
		}
		case "get": {
			res = await axios.get(url, { headers, params: pagination || {} });
			break;
		}
		default:
			throw new Error(`Unsupported HTTP method: ${method}`);
	}

	const rawData = res.data.data;
	return Array.isArray(rawData)
		? rawData.map((row) => {
				const cleaned = {};
				for (const key of fields) {
					if (row.hasOwnProperty(key)) {

						const val = row[key];
						if (typeof val === "string" && val !== xss(val)) {
							throw new Error("XSS detected in extracted data");
						}
						cleaned[key] = val;
					}
				}
				return cleaned;
		  })
		: [];
}

async function buildHeaders(api) {
	const headers = { ...(api.headers || {}) };

	try {
		switch (api.auth_type) {
			case "bearer":
				const authUrl = normalizeUrl(api.base_url, api.auth_url);
				const res = await axios.post(
					authUrl,
					{ auth_key: api.auth_key },
					{ headers }
				);
				const token = res.data.data.token;
				if (!token) {
					throw new Error("Token not found in bearer response");
				}
				headers["Authorization"] = `Bearer ${token}`;
				break;

			case "api_key":
				headers["x-api-key"] = api.auth_key;
				break;

			case "basic":
				headers["Authorization"] = `Basic ${Buffer.from(api.auth_key).toString(
					"base64"
				)}`;
				break;

			default:
				throw new Error(`Unsupported auth type: ${api.auth_type}`);
		}

		return headers;
	} catch (error) {
		console.error(error);
		throw new Error(`buildHeaders error: ${error.message}`);
	}
}

function buildFilter(filters = [], time_threshold) {
	const finalFilters = [];

	for (const filter of filters) {
		let { type = "static", fields, operator, value } = filter;

		if (type === "dynamic" && time_threshold) {
			try {
				let format = timeHandler.getFormat(value);
				if (format === "epoch_ms") {
					value = time_threshold;
				} else if (format === "epoch_s") {
					value = Math.floor(time_threshold / 1000);
				} else {
					value = timeHandler.epochToString(time_threshold, format);
				}
			} catch (error) {
				throw error;
			}
		}

		finalFilters.push({ fields, operator, value });
	}

	return finalFilters;
}

function normalizeUrl(base, path) {
	return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}


module.exports = { extract };
