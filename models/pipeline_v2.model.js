module.exports = ({ GenerateID, Connection, DataTypes, DatabaseModel }) => {
	const PipelineV2Model = Connection.define(
		"pipeline_v2",
		{
			pipeline_v2_id: {
				type: DataTypes.STRING(50),
				primaryKey: true,
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
			src_database_id: {
				type: DataTypes.STRING(50),
				allowNull: false,
			},
			dst_database_id: {
				type: DataTypes.STRING(50),
				allowNull: false,
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
			tableName: "pipeline_v2",
			timestamps: false,
			underscored: true,
			hooks: {
				beforeCreate: (record) => {
					record.pipeline_v2_id = GenerateID("pln");
				},
			},
		}
	);

	// Relasi dengan Source Database
	PipelineV2Model.belongsTo(DatabaseModel, {
		foreignKey: "src_database_id",
		targetKey: "database_id",
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
		as: "src_db",
	});

	DatabaseModel.hasMany(PipelineV2Model, {
		foreignKey: "src_database_id",
		sourceKey: "database_id",
		as: "src_db_pipeline_v2",
	});

	// Relasi dengan Destination Database
	PipelineV2Model.belongsTo(DatabaseModel, {
		foreignKey: "dst_database_id",
		targetKey: "database_id",
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
		as: "dst_db",
	});

	DatabaseModel.hasMany(PipelineV2Model, {
		foreignKey: "dst_database_id",
		sourceKey: "database_id",
		as: "dst_db_pipeline_v2",
	});

	return PipelineV2Model;
};
