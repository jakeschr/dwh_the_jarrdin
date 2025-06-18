const { logSchema } = require("./log.schema");
const { userSchema } = require("./user.schema");
const { databaseSchema } = require("./database.schema");
const { pipelineSchema } = require("./pipeline.schema");
const { jobSchema } = require("./job.schema");

const Validator = {
	Description: "Input Validator",
};

Object.assign(
	Validator,
	logSchema,
	userSchema,
	databaseSchema,
	pipelineSchema,
	jobSchema,
);

module.exports = { Validator };
