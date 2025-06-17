const axios = require("axios");

async function load({ api, data, configs }) {
	const headers = await buildHeaders(api);
	const results = {};

	for (const config of configs.sort((a, b) => a.order - b.order)) {
		const alias = config.name;

		try {
			if (!data.hasOwnProperty(alias)) {
				throw new Error(`Data '${alias}' not found in source.`);
			}

			if (!Array.isArray(data[alias])) {
				throw new Error(`Data for '${alias}' must be an array.`);
			}

			if (data[alias].length === 0) {
				results[alias] = [];
				continue;
			}

			let loaded = await loadData(api, data[alias], config, headers);

			results[alias] = loaded;
		} catch (err) {
			results[alias] = err.message;
		}
	}

	return results;
}

async function loadData(api, data, config, headers) {
	const url = normalizeUrl(api.base_url, config.target);
	const method = (config.http_method || "put").toLowerCase();
	const batchSize = config.batch_size || 100;

	const chunks = splitIntoChunks(data, batchSize);
	const results = [];

	for (const chunk of chunks) {
		try {
			let res;

			switch (method) {
				case "post":
					res = await axios.post(url, chunk, { headers });
					break;
				case "put":
					res = await axios.put(url, chunk, { headers });
					break;
				case "patch":
					res = await axios.patch(url, chunk, { headers });
					break;
				default:
					throw new Error(`Unsupported HTTP method: ${method}`);
			}

			const rawData = res.data.data;

			results.push(...(Array.isArray(rawData) ? rawData : [rawData]));
		} catch (err) {
			throw new Error(`LOAD ERROR ${url}: ${err.message}`);
		}
	}

	return results;
}

function splitIntoChunks(array, size = 100) {
	const chunks = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
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
					throw {
						code: 500,
						message: "Token not found in bearer response",
					};
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

		throw new Error(`ERROR BUILD HEADERS: ${error}`);
	}
}


function normalizeUrl(base, path) {
	return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

module.exports = { load };
