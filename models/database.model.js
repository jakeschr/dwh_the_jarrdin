module.exports = ({ GenerateID, Connection, DataTypes }) => {
	const DatabaseModel = Connection.define(
		"database",
		{
			database_id: {
				type: DataTypes.STRING(50),
				primaryKey: true,
			},
			name: {
				type: DataTypes.STRING(100),
				allowNull: false,
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			base_url: {
				type: DataTypes.STRING(200),
				allowNull: false,
			},
			headers: {
				type: DataTypes.JSON,
				allowNull: false,
			},
			auth_key: {
				type: DataTypes.STRING(200),
				allowNull: false,
			},
			auth_url: {
				type: DataTypes.STRING(200),
				allowNull: true,
			},
			auth_type: {
				type: DataTypes.ENUM("bearer", "database_key", "basic"),
				allowNull: false,
				defaultValue: "bearer",
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
			tableName: "database",
			timestamps: false,
			underscored: true,
			hooks: {
				beforeCreate: (record) => {
					record.database_id = GenerateID("database");
					record.timestamp = Date.now();
				},
				beforeUpdate: (record) => {
					record.timestamp = Date.now();
				},
			},
		}
	);

	return DatabaseModel;
};
