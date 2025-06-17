module.exports = ({ GenerateID, Connection, DataTypes }) => {
	const PipelineModel = Connection.define(
		"pipeline",
		{
			pipeline_id: {
				type: DataTypes.STRING(50),
				primaryKey: true,
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

	return PipelineModel;
};
