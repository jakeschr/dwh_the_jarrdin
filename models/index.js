const { Sequelize, DataTypes, Op } = require("sequelize");

const GenerateID = require("../utils/generate-id.util");

const Connection = new Sequelize(
	process.env.DB_NAME,
	process.env.DB_USER,
	process.env.DB_PASS,
	{
		host: process.env.DB_HOST,
		dialect: process.env.DB_DIAL,
		logging: false,
	}
);

const db = {};

// Simpan instance sequelize dan koneksi di dalam objek db
db.Sequelize = Sequelize;
db.Connection = Connection;
db.Op = Op;

// User
db.UserModel = require("./user.model")({
	GenerateID: GenerateID,
	Connection: Connection,
	DataTypes: DataTypes,
});

// Database
db.DatabaseModel = require("./database.model")({
	GenerateID: GenerateID,
	Connection: Connection,
	DataTypes: DataTypes,
});

// Pipeline
db.PipelineModel = require("./pipeline.model")({
	GenerateID: GenerateID,
	Connection: Connection,
	DataTypes: DataTypes,
});

// Job
db.JobModel = require("./job.model")({
	GenerateID: GenerateID,
	Connection: Connection,
	DataTypes: DataTypes,
	PipelineModel: db.PipelineModel,
});

// Log
db.LogModel = require("./log.model")({
	GenerateID: GenerateID,
	Connection: Connection,
	DataTypes: DataTypes,
	UserModel: db.UserModel,
	JobModel: db.JobModel,
});

// ##################################################################################################################################
// ##################################################################################################################################
// ##################################################################################################################################

/**
 * Fungsi untuk melakukan sinkronisasi model dengan database
 * @param {boolean} force - Jika true, maka tabel akan dihapus dan dibuat ulang
 * @param {boolean} alter - Jika true, akan menyesuaikan tabel tanpa menghapus data
 */
db.Synchronize = async ({ force = false, alter = false } = {}) => {
	try {
		await Connection.authenticate();
		console.error(">> Database authenticate before synchronize");

		if (force === true) {
			await Connection.query("SET FOREIGN_KEY_CHECKS = 0");
		}

		await Connection.sync({ force, alter });

		if (force === true) {
			await Connection.query("SET FOREIGN_KEY_CHECKS = 1");
		}

		console.error(
			`>> Database synchronized (force: ${force}, alter: ${alter})`
		);
	} catch (error) {
		console.error(error);
	}
};

// ##################################################################################################################################
// ##################################################################################################################################
// ##################################################################################################################################

/**
 * Fungsi untuk menghapus semua session di database jika tabel "session" ada
 */
db.ClearSession = async () => {
	try {
		await Connection.authenticate();
		console.error(">> Database authenticated before clearing sessions.");

		// Cek apakah tabel "session" ada
		const [result] = await Connection.query(
			`SELECT COUNT(*) AS count FROM information_schema.tables 
             WHERE table_schema = DATABASE() AND table_name = 'session'`
		);

		// Jika tabel tidak ada, skip proses penghapusan session
		if (result[0].count === 0) {
			console.error(
				'>> Table "session" does not exist. Skipping session clearance.'
			);
			return;
		}

		// Jika tabel ada, hapus semua session
		await Connection.query("TRUNCATE TABLE session");
		console.error(">> All sessions have been cleared from the database.");
	} catch (error) {
		console.error(">> Error clearing sessions:", error);
	}
};

// ##################################################################################################################################
// ##################################################################################################################################
// ##################################################################################################################################

module.exports = db;
