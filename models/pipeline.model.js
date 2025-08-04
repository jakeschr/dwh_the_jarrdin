module.exports = ({ GenerateID, Connection, DataTypes, DatabaseModel }) => {
	const PipelineModel = Connection.define(
		"pipeline",
		{
			pipeline_id: {
				type: DataTypes.STRING(50),
				primaryKey: true,
			},
			src_db_id: {
				type: DataTypes.STRING(50),
				allowNull: false,
			},
			dst_db_id: {
				type: DataTypes.STRING(50),
				allowNull: false,
			},
			name: {
				type: DataTypes.STRING(100),
				allowNull: false,
				unique: true,
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			pipelines: {
				type: DataTypes.JSON,
				allowNull: false,
			},
			timestamp: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
		},
		{
			tableName: "pipeline",
			timestamps: false,
			underscored: true,
			hooks: {
				beforeCreate: (record) => {
					record.pipeline_id = GenerateID("pln");
				},
			},
		}
	);

	// Relasi dengan Source Database
	PipelineModel.belongsTo(DatabaseModel, {
		foreignKey: "src_db_id",
		targetKey: "database_id",
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
		as: "src_db",
	});

	DatabaseModel.hasMany(PipelineModel, {
		foreignKey: "src_db_id",
		sourceKey: "database_id",
		as: "src_db_pipeline",
	});

	// Relasi dengan Destination Database
	PipelineModel.belongsTo(DatabaseModel, {
		foreignKey: "dst_db_id",
		targetKey: "database_id",
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
		as: "dst_db",
	});

	DatabaseModel.hasMany(PipelineModel, {
		foreignKey: "dst_db_id",
		sourceKey: "database_id",
		as: "dst_db_pipeline",
	});

	return PipelineModel;
};
