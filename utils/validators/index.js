const { logSchema } = require("./log.schema");
const { userSchema } = require("./user.schema");
const { apiSchema } = require("./database.schema");
const { pipelineSchema } = require("./pipeline.schema");
const { jobSchema } = require("./job.schema");
const { templateSchema } = require("./template.schema");

const Validator = {
	Description: "Input Validator",
};

Object.assign(
	Validator,
	logSchema,
	userSchema,
	apiSchema,
	pipelineSchema,
	jobSchema,
	templateSchema
);

module.exports = { Validator };
