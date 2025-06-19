const crypto = require("crypto");

const passwordHandler = {
	// Default parameter Scrypt
	SCRYPT_OPTIONS: Object.freeze({
		N: 16384, // Cost factor (CPU/memory cost)
		r: 8, // Block size
		p: 1, // Parallelization factor
		keylen: 64, // Output key length
		saltLength: 16, // Salt length in bytes
	}),

	ENCRYPTION_KEY: crypto.scryptSync(
		process.env.SECRET_KEY || "default-key",
		"salt",
		32
	), // 256-bit key
	ENCRYPTION_ALGO: "aes-256-cbc",

	/**
	 * 🔒 Encrypts a password using Scrypt hashing (Async)
	 * @param {string} plainPassword - Password in plain text
	 * @returns {Promise<string>} - Hashed password in format "salt:hash"
	 */
	async encrypt(plainPassword) {
		if (!plainPassword || typeof plainPassword !== "string") {
			throw new Error("Invalid password: Password must be a non-empty string.");
		}

		const salt = crypto.randomBytes(this.SCRYPT_OPTIONS.saltLength); // Secure random salt

		try {
			const derivedKey = await new Promise((resolve, reject) => {
				crypto.scrypt(
					plainPassword,
					salt,
					this.SCRYPT_OPTIONS.keylen,
					{
						N: this.SCRYPT_OPTIONS.N,
						r: this.SCRYPT_OPTIONS.r,
						p: this.SCRYPT_OPTIONS.p,
					},
					(err, key) => {
						if (err) reject(err);
						else resolve(key);
					}
				);
			});
			return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
		} catch (error) {
			throw error;
		}
	},

	/**
	 * 🔍 Verifies if a plain password matches the stored hash (Async)
	 * @param {string} cipherPassword - Hashed password in format "salt:hash"
	 * @param {string} plainPassword - Password in plain text
	 * @returns {Promise<boolean>} - Returns `true` if password is valid, `false` otherwise
	 */
	async verify(cipherPassword, plainPassword) {
		if (!cipherPassword || typeof cipherPassword !== "string") {
			throw new Error(
				"Invalid input: Cipher password must be non-empty strings."
			);
		}

		if (!plainPassword || typeof plainPassword !== "string") {
			throw new Error(
				"Invalid input: Plain password must be non-empty strings."
			);
		}

		// Validate the hash format
		const parts = cipherPassword.split(":");
		if (parts.length !== 2) {
			throw new Error("Invalid cipher format: Expected 'salt:hash'.");
		}

		const [saltHex, keyHex] = parts;
		const salt = Buffer.from(saltHex, "hex");
		const key = Buffer.from(keyHex, "hex");

		try {
			const derivedKey = await new Promise((resolve, reject) => {
				crypto.scrypt(
					plainPassword,
					salt,
					this.SCRYPT_OPTIONS.keylen,
					{
						N: this.SCRYPT_OPTIONS.N,
						r: this.SCRYPT_OPTIONS.r,
						p: this.SCRYPT_OPTIONS.p,
					},
					(err, derivedKey) => {
						if (err) reject(err);
						else resolve(derivedKey);
					}
				);
			});

			// Ensure both buffers have the same length before comparing
			if (derivedKey.length !== key.length) {
				return false;
			}

			return crypto.timingSafeEqual(derivedKey, key);
		} catch (error) {
			throw error;
		}
	},

	// 🔐 Encrypt for reversible storage (e.g., db connection passwords)
	encryptSymmetric(plainText) {
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv(
			this.ENCRYPTION_ALGO,
			this.ENCRYPTION_KEY,
			iv
		);
		let encrypted = cipher.update(plainText, "utf8", "hex");
		encrypted += cipher.final("hex");
		return `${iv.toString("hex")}:${encrypted}`;
	},

	// 🔓 Decrypt symmetric encryption
	decryptSymmetric(cipherText) {
		const [ivHex, encryptedHex] = cipherText.split(":");
		const iv = Buffer.from(ivHex, "hex");
		const decipher = crypto.createDecipheriv(
			this.ENCRYPTION_ALGO,
			this.ENCRYPTION_KEY,
			iv
		);
		let decrypted = decipher.update(encryptedHex, "hex", "utf8");
		decrypted += decipher.final("utf8");
		return decrypted;
	},
};

module.exports = { passwordHandler };
