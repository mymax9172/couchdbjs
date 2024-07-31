const BasePropertyType = {
	// Name of the PropertyType
	name: "",

	// Data type
	// Must be equale to the data type of the property or the data type returned by afterRead() method
	contentType: "string",

	// Validation rules
	rules: [],

	/**
	 * String version of the value
	 * @param {*} value Value to be stringified
	 * @param {object} options Options
	 * @returns {String} Stringified property value
	 */
	toString(value, options) {
		return value?.toString?.() || value;
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
	contentType: "boolean",

	rules: [
		(val) => typeof val === "boolean" || "Value " + val + " is not a boolean",
	],
};

const DateTimePropertyType = {
	...BasePropertyType,

	name: "DateTime",
	contentType: "Date",

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

	toString(value, options) {
		const formatter = new Intl.DateTimeFormat(options.locale, options.format);
		return formatter.format(value);
	},
};

const IntegerPropertyType = {
	...BasePropertyType,

	name: "Integer",
	contentType: "number",

	rules: [
		(val) => Number.isInteger(val) || "Value " + val + " is not an integer",
	],
};

const TextPropertyType = {
	...BasePropertyType,

	name: "Text",
	contentType: "string",

	rules: [
		(val) => typeof val === "string" || "Value " + val + " is not a string",
	],
};

const NumberPropertyType = {
	...BasePropertyType,

	name: "Number",
	contentType: "number",

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
