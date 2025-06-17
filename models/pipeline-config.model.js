module.exports = ({ Connection, DataTypes, PipelineModel, DatabaseModel }) => {
	const PipelineConfigModel = Connection.define(
		"pipeline_config",
		{
			pipeline_id: {
				type: DataTypes.STRING(50),
				primaryKey: true,
			},
			database_id: {
				type: DataTypes.STRING(50),
				primaryKey: true,
			},
			configs: {
				type: DataTypes.JSON,
				allowNull: false,
			},
			type: {
				type: DataTypes.ENUM("src", "dst"),
				allowNull: false,
			},
			timestamp: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
		},
		{
			tableName: "pipeline_config",
			timestamps: false,
			underscored: true,
			hooks: {
				beforeCreate: (record) => {
					record.timestamp = Date.now();
				},
				beforeUpdate: (record) => {
					record.timestamp = Date.now();
				},
			},
			primaryKey: {
				fields: ["pipeline_id", "database_id"],
			},
			indexes: [
				{
					unique: true,
					fields: ["pipeline_id", "database_id"],
				},
			],
		}
	);

	// Relasi dengan Pipeline
	PipelineConfigModel.belongsTo(PipelineModel, {
		foreignKey: "pipeline_id",
		targetKey: "pipeline_id",
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	});

	PipelineModel.hasMany(PipelineConfigModel, {
		foreignKey: "pipeline_id",
		sourceKey: "pipeline_id",
	});

	// Relasi dengan Database
	PipelineConfigModel.belongsTo(DatabaseModel, {
		foreignKey: "database_id",
		targetKey: "database_id",
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	});

	DatabaseModel.hasMany(PipelineConfigModel, {
		foreignKey: "database_id",
		sourceKey: "database_id",
	});

	return PipelineConfigModel;
};
