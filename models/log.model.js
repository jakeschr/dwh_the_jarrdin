module.exports = ({
	GenerateID,
	Connection,
	DataTypes,
	UserModel,
	JobModel,
}) => {
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
					"signout",
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

					if (record.type === "user" && !record.user_id) {
						throw new Error("user_id is required when type is 'user'");
					}

					if (record.type === "job" && !record.job_id) {
						throw new Error("job_id is required when type is 'job'");
					}
				},
			},
		}
	);

	// Relasi dengan User
	LogModel.belongsTo(UserModel, {
		foreignKey: "user_id",
		targetKey: "user_id",
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	});

	UserModel.hasMany(LogModel, {
		foreignKey: "user_id",
		sourceKey: "user_id",
	});

	// Relasi dengan Job
	LogModel.belongsTo(JobModel, {
		foreignKey: "job_id",
		targetKey: "job_id",
		onDelete: "RESTRICT",
		onUpdate: "CASCADE",
	});

	JobModel.hasMany(LogModel, {
		foreignKey: "job_id",
		sourceKey: "job_id",
	});

	return LogModel;
};
