const crypto = require("crypto");

const passwordHandler = {
	// Default parameter Scrypt
	SCRYPT_OPTIONS: Object.freeze({
		N: 16384, // Cost factor (CPU/memory cost)
		r: 8, // Block size
		p: 1, // Parallelization factor
		keylen: 64, // Output key length
		saltLength: 16, // Default salt length in bytes
	}),

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
};

module.exports = { passwordHandler };
