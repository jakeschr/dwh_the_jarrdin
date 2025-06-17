const { UserRepository } = require("../repositories/user.repository.js");
const { LogRepository } = require("../repositories/log.repository");
const { passwordHandler } = require("../utils/password-handler.util.js");

const { Connection } = require("../models");
const { timeHandler } = require("../utils/time-handler.util.js");

class AuthService {
	async signup(data, session) {
		let dbTrx;
		try {
			dbTrx = await Connection.transaction();

			const existing = await UserRepository.findExisting({
				email: data.email,
			});

			if (existing) {
				throw Object.assign(new Error("User with this email already exists."), {
					code: 409,
				});
			}

			const timestamp = timeHandler.nowEpoch();

			data.password = await passwordHandler.encrypt(data.password);
			data.timestamp = timestamp;

			const createdRow = await UserRepository.create(data, dbTrx);

			await LogRepository.create(
				{
					user_id: createdRow.user_id,
					details: {
						model: "user",
						ids: createdRow.user_id,
					},
					action: "create",
					type: "user",
					timestamp: timestamp,
				},
				dbTrx
			);

			await dbTrx.commit();

			const result = await UserRepository.findOne(createdRow.user_id);

			return result;
		} catch (error) {
			if (dbTrx) await dbTrx.rollback();
			throw error;
		}
	}

	async signin(data, req) {
		try {
			const existing = await UserRepository.findExisting({
				email: data.email,
			});

			if (!existing) {
				throw Object.assign(new Error("User not found."), {
					code: 404,
				});
			}

			if (existing.status === "inactive") {
				throw Object.assign(new Error("Your account is inactive"), {
					code: 400,
				});
			}

			const isValid = await passwordHandler.verify(
				existing.password,
				data.password
			);

			if (!isValid) {
				throw Object.assign(new Error("Invalid password."), { code: 401 });
			}

			req.session.user = {
				user_id: existing.user_id,
				email: existing.email,
				role: existing.role,
			};

			return { message: "Signin successful", session: req.session };
		} catch (error) {
			throw error;
		}
	}

	async signout(req, res) {
		try {
			return new Promise((resolve, reject) => {
				req.session.destroy((err) => {
					if (err) {
						return reject(
							Object.assign(new Error("Signout failed."), { code: 500 })
						);
					}

					res.clearCookie(process.env.SESSION_NAME || "connect.sid");

					resolve({ message: "Signout successful." });
				});
			});
		} catch (error) {
			throw error;
		}
	}
}

module.exports = { AuthService: new AuthService() };
