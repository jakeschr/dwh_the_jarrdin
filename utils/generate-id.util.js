const { v4: uuidv4 } = require("uuid");

module.exports = (modelCode, randomCodeLength = 6) => {
	if (typeof modelCode !== "string" || !/^[a-zA-Z0-9]+$/.test(modelCode)) {
		throw new Error(
			"Invalid modelCode: It must be a non-empty alphanumeric string."
		);
	}

	// Validasi randomCodeLength: minimal 6, maksimal 12
	const validatedRandomCodeLength = Math.min(Math.max(randomCodeLength, 6), 12);

	// Generate timestamp (base-36)
	const timestamp = Date.now().toString(36).toLowerCase();

	// Generate random alphanumeric code
	const uuid = uuidv4().replace(/-/g, "").toLowerCase();
	const randomCode = uuid.substring(0, validatedRandomCodeLength);

	// Format final ID
	return `${modelCode}-${timestamp}-${randomCode}`;
};
