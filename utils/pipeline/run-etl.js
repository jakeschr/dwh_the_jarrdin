const { extract } = require("./extract");
// const { transform } = require("./transform");
// const { load } = require("./load");
const { timeHandler } = require("../time-handler.util");
const { connectionHandler } = require("../connection-handler.util");

const runETL = async ({
	source,
	destination,
	time_threshold,
	is_preview = true,
}) => {
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
		const result = await extract({
			database: source.database,
			configs: source.configs,
			time_threshold: time_threshold,
		});

		for (const [alias, data] of Object.entries(result)) {
			if (Array.isArray(data)) {
				workingData.src[alias] = data;
				workingData.log.extract_log.push(
					buildLog(alias, "success", data, "extract")
				);
			} else {
				workingData.src[alias] = [];
				workingData.log.extract_log.push(
					buildLog(alias, "error", data, "extract")
				);
			}
		}

		// /////////////////////////////////////////////////////////////////////////////
		// // 2. TRANSFORM
		// for (const destination of destinations) {
		// 	const result = await transform({
		// 		configs: destination.configs,
		// 		data: workingData,
		// 		is_preview: is_preview,
		// 	});

		// 	for (const [alias, data] of Object.entries(result)) {
		// 		if (Array.isArray(data)) {
		// 			workingData.dst[alias] = data;
		// 			workingData.log.transform_log.push(
		// 				buildLog(alias, "success", data, "transform")
		// 			);
		// 		} else {
		// 			workingData.dst[alias] = [];
		// 			workingData.log.transform_log.push(
		// 				buildLog(alias, "error", data, "transform")
		// 			);
		// 		}
		// 	}
		// }

		// if (is_preview === true) {
		// 	workingData.log.end_time = timeHandler.nowEpoch();
		// 	return workingData;
		// }

		// /////////////////////////////////////////////////////////////////////////////
		// // 3. LOAD
		// for (const destination of destinations) {
		// 	const result = await load({
		// 		api: destination.api,
		// 		configs: destination.configs,
		// 		data: workingData.dst,
		// 	});

		// 	for (const [alias, data] of Object.entries(result)) {
		// 		if (Array.isArray(data)) {
		// 			workingData.log.load_log.push(
		// 				buildLog(alias, "success", data, "load")
		// 			);
		// 		} else {
		// 			workingData.log.load_log.push(buildLog(alias, "error", data, "load"));
		// 		}
		// 	}
		// }

		workingData.log.end_time = timeHandler.nowEpoch();

		await connectionHandler.close(
			source.database.connection,
			source.database.dialect
		);

		await connectionHandler.close(
			destination.database.connection,
			destination.database.dialect
		);

		return workingData;
	} catch (error) {
		throw error;
	}
};

function buildLog(name, status, result, type) {
	const count = Array.isArray(result) ? result.length : 0;
	return {
		status: status,
		name: name,
		count: count,
		message: status === "success" ? `${count} records ${type}ed.` : result,
	};
}

module.exports = { runETL };
