module.exports = ({ GenerateID, Connection, DataTypes }) => {
	const UserModel = Connection.define(
		"user",
		{
			user_id: {
				type: DataTypes.STRING(50),
				primaryKey: true,
			},
			name: {
				type: DataTypes.STRING(200),
				allowNull: false,
			},
			email: {
				type: DataTypes.STRING(200),
				allowNull: false,
				unique: true,
			},
			password: {
				type: DataTypes.TEXT,
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
			tableName: "user",
			timestamps: false,
			underscored: true,
			hooks: {
				beforeCreate: (record) => {
					record.user_id = GenerateID("usr");
				},
			},
		}
	);

	return UserModel;
};
