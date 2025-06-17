module.exports = ({ GenerateID, Connection, DataTypes, PipelineModel }) => {
	const JobModel = Connection.define(
		"job",
		{
			job_id: {
				type: DataTypes.STRING(50),
				primaryKey: true,
			},
			pipeline_id: {
				type: DataTypes.STRING(50),
				allowNull: false,
			},
			name: {
				type: DataTypes.STRING(50),
				allowNull: false,
				unique: true,
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			cron: {
				type: DataTypes.STRING(50),
				allowNull: false,
			},
			time_threshold: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
			is_active: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			},
			timestamp: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
		},
		{
			tableName: "job",
			timestamps: false,
			underscored: true,
			hooks: {
				beforeCreate: (record) => {
					record.job_id = GenerateID("job");
				},
			},
		}
	);

	// Relasi dengan Pipeline
	JobModel.belongsTo(PipelineModel, {
		foreignKey: "pipeline_id",
		targetKey: "pipeline_id",
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	});

	PipelineModel.hasMany(JobModel, {
		foreignKey: "pipeline_id",
		sourceKey: "pipeline_id",
	});

	return JobModel;
};
