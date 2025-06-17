module.exports = ({ Connection, DataTypes, PipelineModel, DatabaseModel }) => {
	const PipelineDatabaseModel = Connection.define(
		"pipeline_database",
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
			tableName: "pipeline_database",
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
	PipelineDatabaseModel.belongsTo(PipelineModel, {
		foreignKey: "pipeline_id",
		targetKey: "pipeline_id",
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	});

	PipelineModel.hasMany(PipelineDatabaseModel, {
		foreignKey: "pipeline_id",
		sourceKey: "pipeline_id",
	});

	// Relasi dengan Database
	PipelineDatabaseModel.belongsTo(DatabaseModel, {
		foreignKey: "database_id",
		targetKey: "database_id",
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	});

	DatabaseModel.hasMany(PipelineDatabaseModel, {
		foreignKey: "database_id",
		sourceKey: "database_id",
	});

	return PipelineDatabaseModel;
};
