const { Op } = require("../models");

const mapOperator = (op) => {
	const map = {
		eq: Op.eq,
		ne: Op.ne,
		gt: Op.gt,
		gte: Op.gte,
		lt: Op.lt,
		lte: Op.lte,
		in: Op.in,
		is: Op.is,
		like: Op.like,
		between: Op.between,
		not: Op.not,
		not_in: Op.notIn,
		not_like: Op.notLike,
		not_between: Op.notBetween,
	};
	return map[op] || null;
};

function filterHandler(complexFilter, simpleFilter) {
	let filters = {};
	const andConditions = [];

	// --- CASE 1: Array of conditions (complex filter)
	if (Array.isArray(complexFilter)) {
		for (const condition of complexFilter) {
			const { fields, operator, value } = condition;
			if (!fields || !operator) continue;

			const attrArray = Array.isArray(fields) ? fields : [fields];
			const sequelizeOp = mapOperator(operator);
			if (!sequelizeOp) throw new Error(`Unsupported operator: ${operator}`);

			const orConditions = attrArray.map((attr) => ({
				[attr]: { [sequelizeOp]: value },
			}));

			andConditions.push({ [Op.or]: orConditions });
		}
	}

	// --- CASE 2: Plain object (simple filter)
	if (typeof simpleFilter === "object" && simpleFilter !== null) {
		for (const key in simpleFilter) {
			if (!Object.hasOwn(simpleFilter, key)) continue;

			andConditions.push({
				[key]: { [Op.like]: simpleFilter[key] },
			});
		}
	}

	if (andConditions.length > 0) {
		filters = { [Op.and]: andConditions };
	}

	return filters;
}

module.exports = { filterHandler };
