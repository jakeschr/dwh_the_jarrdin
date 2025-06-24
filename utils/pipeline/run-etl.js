const { extract } = require("./extract");
const { transform } = require("./transform");
const { load } = require("./load");
const { timeHandler } = require("../time-handler.util");
const { connectionHandler } = require("../connection-handler.util");

const runETL = async ({ source, destination, time_threshold, is_preview }) => {
	const workingData = {
		src: {},
		dst: {},
		log: {
			start_time: timeHandler.nowEpoch(),
			end_time: null,
			extract_log: [],
			transform_log: [],
			load_log: [],
		},
	};

	try {
		source.database.connection = await connectionHandler.open(source.database);
		destination.database.connection = await connectionHandler.open(
			destination.database
		);

		/////////////////////////////////////////////////////////////////////////////
		// 1. EXTRACT
		const extractedData = await extract({
			database: source.database,
			configs: source.configs,
			time_threshold: time_threshold,
		});

		for (const [table, data] of Object.entries(extractedData)) {
			if (Array.isArray(data)) {
				workingData.src[table] = data;
				workingData.log.extract_log.push(
					buildLog(table, "success", data, "extract")
				);
			} else {
				workingData.src[table] = [];
				workingData.log.extract_log.push(
					buildLog(table, "error", data, "extract")
				);
			}
		}

		/////////////////////////////////////////////////////////////////////////////
		// 2. TRANSFORM
		const transformedData = await transform({
			data: workingData,
			configs: destination.configs,
			is_preview: is_preview,
		});

		for (const [table, data] of Object.entries(transformedData)) {
			if (Array.isArray(data)) {
				workingData.dst[table] = data;
				workingData.log.transform_log.push(
					buildLog(table, "success", data, "transform")
				);
			} else {
				workingData.dst[table] = [];
				workingData.log.transform_log.push(
					buildLog(table, "error", data, "transform")
				);
			}
		}

		if (is_preview === true) {
			workingData.log.end_time = timeHandler.nowEpoch();
			return workingData;
		}

		/////////////////////////////////////////////////////////////////////////////
		// 3. LOAD
		const loadedData = await load({
			database: destination.database,
			configs: destination.configs,
			data: workingData.dst,
		});

		for (const [table, data] of Object.entries(loadedData)) {
			workingData.log.load_log.push(buildLog(table, "success", data, "load"));
		}

		workingData.log.end_time = timeHandler.nowEpoch();

		return workingData;
	} catch (error) {
		throw error;
	} finally {
		if (source?.database?.connection) {
			await connectionHandler.close(
				source.database.connection,
				source.database.dialect
			);
		}
		if (destination?.database?.connection) {
			await connectionHandler.close(
				destination.database.connection,
				destination.database.dialect
			);
		}
	}
};

function buildLog(name, status, result, type) {
	if (type === "load") {
		const dataLength = result.data.length;
		const errorLength = result.error.length;

		if (dataLength > 0 && errorLength > 0) {
			status = "partial";
		} else if (dataLength > 0 && errorLength === 0) {
			status = "success";
		} else {
			status = "error";
		}

		return {
			status: status,
			name: name,
			count: dataLength,
			message: `${dataLength} records ${type}ed.`,
			error: result.error,
		};
	} else {
		const count = Array.isArray(result) ? result.length : 0;
		return {
			status: status,
			name: name,
			count: count,
			message: status === "success" ? `${count} records ${type}ed.` : result,
		};
	}
}

module.exports = { runETL };
