const { Connection, Sequelize, Op, UserModel } = require("../models");
const { timeHandler } = require("../utils/time-handler.util.js");

class UserRepository {
	async handleTransaction(dbTrxGlobal) {
		if (dbTrxGlobal) {
			return dbTrxGlobal;
		}
		return await Connection.transaction();
	}

	async findMany(filters, pagination) {
		try {
			const options = {
				where: filters,
			};

			const formatResult = (rows) => {
				return rows.map((item) => {
					return {
						user_id: item.user_id,
						name: item.name,
						email: item.email,
						role: item.role,
						is_active: item.is_active,
					};
				});
			};

			if (pagination) {
				const { page, limit } = pagination;
				const offset = (page - 1) * limit;

				const count = await UserModel.count({ where: filters });

				options.limit = limit;
				options.offset = offset;

				const rows = await UserModel.findAll(options);

				return {
					data: formatResult(rows),
					meta: {
						total_record: count,
						current_page: page,
						total_page: Math.ceil(count / limit),
						size_page: limit,
					},
				};
			} else {
				const rows = await UserModel.findAll(options);

				return { data: formatResult(rows), meta: null };
			}
		} catch (error) {
			throw error;
		}
	}

	async findOne(userId) {
		try {
			const row = await UserModel.findOne({
				where: { user_id: userId },
			});

			if (!row) {
				throw Object.assign(new Error("user not found."), {
					code: 404,
				});
			}

			const formatResult = (row) => {
				return {
					user_id: row.user_id,
					name: row.name,
					email: row.email,
					role: row.role,
					is_active: row.is_active,
					timestamp: timeHandler.epochToString(row.timestamp),
				};
			};

			return formatResult(row);
		} catch (error) {
			throw error;
		}
	}

	async findExisting(filters) {
		try {
			const row = await UserModel.findOne({
				where: filters,
			});

			const formatResult = (row) => {
				return {
					user_id: row.user_id,
					name: row.name,
					email: row.email,
					role: row.role,
					password: row.password,
					is_active: row.is_active,
					timestamp: timeHandler.epochToString(row.timestamp),
				};
			};

			return row ? formatResult(row) : null;
		} catch (error) {
			throw error;
		}
	}

	async create(data, dbTrxGlobal) {
		let dbTrx;
		try {
			dbTrx = await this.handleTransaction(dbTrxGlobal);

			data.timestamp = timeHandler.nowEpoch();

			const row = await UserModel.create(data, { transaction: dbTrx });

			if (!dbTrxGlobal) await dbTrx.commit();

			return row;
		} catch (error) {
			if (dbTrx && !dbTrxGlobal) await dbTrx.rollback();

			if (error instanceof Sequelize.UniqueConstraintError) {
				throw Object.assign(new Error(error.errors[0].message), { code: 400 });
			}

			throw error;
		}
	}

	async update(data, dbTrxGlobal) {
		let dbTrx;
		try {
			dbTrx = await this.handleTransaction(dbTrxGlobal);

			const { user_id, ...user } = data;

			const row = await UserModel.findByPk(user_id);

			if (!row) {
				throw Object.assign(new Error("User not found."), {
					code: 404,
				});
			}

			await row.update(user, { transaction: dbTrx });

			if (!dbTrxGlobal) await dbTrx.commit();

			return row;
		} catch (error) {
			if (dbTrx && !dbTrxGlobal) await dbTrx.rollback();

			if (error instanceof Sequelize.UniqueConstraintError) {
				throw Object.assign(new Error(error.errors[0].message), { code: 400 });
			}

			throw error;
		}
	}

	async delete(userId, dbTrxGlobal) {
		let dbTrx;
		try {
			dbTrx = await this.handleTransaction(dbTrxGlobal);

			const count = await UserModel.destroy({
				where: { user_id: userId },
				transaction: dbTrx,
			});

			if (!dbTrxGlobal) await dbTrx.commit();

			return count;
		} catch (error) {
			if (dbTrx && !dbTrxGlobal) await dbTrx.rollback();
			throw error;
		}
	}
}

module.exports = { UserRepository: new UserRepository() };
