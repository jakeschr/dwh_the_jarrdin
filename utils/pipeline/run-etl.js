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

		for (const [table, result] of Object.entries(extractedData)) {
			workingData.src[table] = result.data;
			workingData.log.extract_log.push(buildLog(table, result));
		}

		/////////////////////////////////////////////////////////////////////////////
		// 2. TRANSFORM
		const transformedData = transform({
			data: workingData,
			configs: destination.configs,
		});

		for (const [table, result] of Object.entries(transformedData)) {
			workingData.dst[table] = result.data;
			workingData.log.transform_log.push(buildLog(table, result));
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
			workingData.log.load_log.push(buildLog(table, data));
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

function buildLog(name, result) {
	const dataLength = result.data.length;
	const errorLength = result.error.length;

	let status = "error";
	if (dataLength > 0 && errorLength > 0) {
		status = "partial";
	} else if (dataLength >= 0 && errorLength === 0) {
		status = "success";
	}
	
	return {
		status: status,
		name: name,
		count: dataLength,
		errors: result.error,
	};
}

module.exports = { runETL };
