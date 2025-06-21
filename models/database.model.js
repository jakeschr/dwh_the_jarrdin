module.exports = ({ GenerateID, Connection, DataTypes }) => {
	const DatabaseModel = Connection.define(
		"database",
		{
			database_id: {
				type: DataTypes.STRING(50),
				primaryKey: true,
			},
			label: {
				type: DataTypes.STRING(100),
				allowNull: false,
				unique: true,
			},
			database: {
				type: DataTypes.STRING(100),
				allowNull: false,
			},
			dialect: {
				type: DataTypes.ENUM(
					"mysql",
					"postgres",
					"mongodb",
					"sqlserver",
					"sybase",
					"oracle"
				),
				allowNull: false,
			},
			host: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			port: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			username: {
				type: DataTypes.STRING(100),
				allowNull: true,
			},
			password: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			driver: {
				type: DataTypes.ENUM("native", "odbc"),
				allowNull: false,
				defaultValue: "native", // misalnya MySQL pakai native, Sybase pakai odbc
			},
			dsn: {
				type: DataTypes.STRING(100),
				allowNull: true, // untuk ODBC DSN Name jika pakai ODBC
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
			type: {
				type: DataTypes.ENUM("operational", "lake", "warehouse"),
				allowNull: false,
				defaultValue: "operational",
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
