module.exports = ({ GenerateID, Connection, DataTypes }) => {
	const DatabaseModel = Connection.define(
		"database",
		{
			database_id: {
				type: DataTypes.STRING(50),
				primaryKey: true,
			},
			database: {
				type: DataTypes.STRING(100),
				allowNull: false,
			},
			dialect: {
				type: DataTypes.ENUM("mysql", "postgres", "mongodb"),
				allowNull: false,
			},
			host: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			port: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			username: {
				type: DataTypes.STRING(100),
				allowNull: false,
			},
			password: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			schema: {
				type: DataTypes.STRING(100),
				allowNull: true, // hanya untuk postgres
			},
			connection_uri: {
				type: DataTypes.TEXT,
				allowNull: true, // khusus mongodb jika menggunakan URI
			},
			options: {
				type: DataTypes.JSON,
				allowNull: true,
			},
			is_active: {
				type: DataTypes.BOOLEAN,
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
					record.database_id = GenerateID("dtb");
				},
			},
		}
	);

	return DatabaseModel;
};
