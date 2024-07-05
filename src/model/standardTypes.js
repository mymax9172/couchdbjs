const BasePropertyType = {
	name: "",

	rules: [],

	format(value, options) {
		return value;
	},

	/**
	 * Hook before writing on the document
	 * @param {*} value Value read from the UI
	 * @returns {*} Trasformed value
	 */
	beforeWrite(value) {
		return value;
	},

	/**
	 * Hook after reading from the document
	 * @param {*} value Value read from the document
	 * @returns {*} Trasformed value for the UI
	 */
	afterRead(value) {
		return value;
	},
};

const BooleanPropertyType = {
	...BasePropertyType,

	name: "Boolean",

	rules: [
		(val) => typeof val === "boolean" || "Value " + val + " is not a boolean",
	],
};

const DateTimePropertyType = {
	...BasePropertyType,

	name: "DateTime",

	rules: [
		(val) => val instanceof Date || "Value " + val + " is not a Date object",
	],

	beforeWrite(value) {
		if (!value) return value;
		return value.getTime();
	},

	afterRead(value) {
		if (!value) return value;
		return new Date(value);
	},

	format(value, options) {
		const formatter = new Intl.DateTimeFormat(options.locale, options.format);
		return formatter.format(value);
	},
};

const IntegerPropertyType = {
	...BasePropertyType,

	name: "Integer",

	rules: [
		(val) => Number.isInteger(val) || "Value " + val + " is not an integer",
	],
};

const TextPropertyType = {
	...BasePropertyType,

	name: "Text",

	rules: [
		(val) => typeof val === "string" || "Value " + val + " is not a string",
	],
};

const NumberPropertyType = {
	...BasePropertyType,

	name: "Number",

	rules: [
		(val) => typeof val === "number" || "Value " + val + " is not a number",
	],
};

export const StandardTypes = {
	BasePropertyType,
	BooleanPropertyType,
	DateTimePropertyType,
	IntegerPropertyType,
	NumberPropertyType,
	TextPropertyType,
};
