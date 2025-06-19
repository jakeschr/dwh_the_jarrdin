module.exports = ({ GenerateID, Connection, DataTypes, DatabaseModel }) => {
	const PipelineModel = Connection.define(
		"pipeline",
		{
			pipeline_id: {
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
			src_configs: {
				type: DataTypes.JSON,
				allowNull: false,
			},
			dst_database_id: {
				type: DataTypes.STRING(50),
				allowNull: false,
			},
			dst_configs: {
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
					record.timestamp = Date.now();
				},
				beforeUpdate: (record) => {
					record.timestamp = Date.now();
				},
			},
		}
	);

	// Relasi dengan Source Database
	PipelineModel.belongsTo(DatabaseModel, {
		foreignKey: "src_database_id",
		targetKey: "database_id",
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	});

	DatabaseModel.hasMany(PipelineModel, {
		foreignKey: "src_database_id",
		sourceKey: "database_id",
	});

	return PipelineModel;
};
