module.exports = ({ GenerateID, Connection, DataTypes }) => {
	const LogModel = Connection.define(
		"log",
		{
			log_id: {
				type: DataTypes.STRING(50),
				primaryKey: true,
			},
			actor_id: {
				type: DataTypes.STRING(50),
				allowNull: false,
			},
			details: {
				type: DataTypes.JSON,
				allowNull: false,
			},
			action: {
				type: DataTypes.ENUM(
					"signup",
					"signin",
					"create",
					"update",
					"delete",
					"execute"
				),
				allowNull: false,
			},
			timestamp: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
		},
		{
			tableName: "log",
			timestamps: false,
			underscored: true,
			hooks: {
				beforeCreate: (record) => {
					record.log_id = GenerateID("log");
				},
			},
		}
	);

	return LogModel;
};
