const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// Default & known formats
const DEFAULT_FORMAT = "DD/MM/YYYY HH:mm:ss";
const KNOWN_FORMATS = [
	"YYYY-MM-DDTHH:mm:ssZ",
	"YYYY-MM-DD HH:mm:ss",
	"DD/MM/YYYY HH:mm:ss",
	"YYYY-MM-DD",
	"DD/MM/YYYY",
];

const SUPPORTED_FORMATS = [...KNOWN_FORMATS, "epoch_ms", "epoch_s"];

const timeHandler = {
	// String → Epoch ms
	stringToEpoch: (string_input, string_format = DEFAULT_FORMAT) => {
		const parsed = dayjs(string_input, string_format, true);
		if (!parsed.isValid()) {
			throw new Error(
				`Invalid date string or format: "${string_input}" (${string_format})`
			);
		}
		return parsed.valueOf();
	},

	// Epoch ms → Formatted String
	epochToString: (epoch_input, string_format = DEFAULT_FORMAT) => {
		const parsed = dayjs(epoch_input);
		if (!parsed.isValid()) {
			throw new Error(`Invalid epoch input: ${epoch_input}`);
		}
		return parsed.format(string_format);
	},

	// Sekarang dalam epoch ms
	nowEpoch: () => {
		return Date.now();
	},

	// Sekarang dalam string format
	nowString: (string_format = DEFAULT_FORMAT) => {
		if (
			!SUPPORTED_FORMATS.includes(string_format) &&
			string_format !== DEFAULT_FORMAT
		) {
			throw new Error(`Unsupported format: ${string_format}`);
		}
		return dayjs().format(string_format);
	},

	// Geser waktu (epoch)
	offsetEpoch: (epoch_input, minutes = -5) => {
		const parsed = dayjs(epoch_input);
		if (!parsed.isValid()) {
			throw new Error(`Invalid epoch input: ${epoch_input}`);
		}
		return parsed.add(minutes, "minute").valueOf();
	},

	// Geser waktu (string)
	offsetString: (
		string_input,
		minutes = -5,
		string_format = DEFAULT_FORMAT
	) => {
		const parsed = dayjs(string_input, string_format, true);
		if (!parsed.isValid()) {
			throw new Error(
				`Invalid date string or format: "${string_input}" (${string_format})`
			);
		}
		return parsed.add(minutes, "minute").format(string_format);
	},

	// Deteksi format waktu dari nilai (string atau number)
	getFormat: (value) => {
		if (typeof value === "number") {
			if (value > 1e12) return "epoch_ms";
			if (value > 1e9) return "epoch_s";
			throw Object.assign(
				new Error(
					"Unrecognized numeric time format (must be epoch_s or epoch_ms)"
				),
				{
					code: 400,
				}
			);
		}

		if (typeof value === "string") {
			if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
				return "YYYY-MM-DDTHH:mm:ssZ";
			}

			for (const format of KNOWN_FORMATS) {
				const parsed = dayjs(value, format, true);
				if (parsed.isValid()) return format;
			}
		}

		throw Object.assign(new Error("Unsupported or unknown time format"), {
			code: 400,
		});
	},

	// Validasi apakah format waktu didukung sistem
	isSupportedFormat: (format) => {
		if (!SUPPORTED_FORMATS.includes(format)) {
			throw Object.assign(new Error(`Unsupported time format: ${format}`), {
				code: 400,
			});
		}
		return true;
	},
};

module.exports = { timeHandler };
