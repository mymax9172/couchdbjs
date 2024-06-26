const BooleanPropertyType = {
	name: "Boolean",

	rules: [
		(val) => typeof val === "boolean" || "Value " + val + " is not a boolean",
	],
};

const DateTimePropertyType = {
	name: "DateTime",

	rules: [
		(val) => val instanceof Date || "Value " + val + " is not a Date object",
	],

	/**
	 * Hook before writing on the document
	 * @param {*} value Value read from the UI
	 * @returns {*} Trasformed value
	 */
	beforeWrite(value) {
		if (!value) return value;
		return value.getTime();
	},

	/**
	 * Hook after reading from the document
	 * @param {*} value Value read from the document
	 * @returns {*} Trasformed value for the UI
	 */
	afterRead(value) {
		if (!value) return value;
		return new Date(value);
	},
};

const IntegerPropertyType = {
	name: "Integer",

	rules: [
		(val) => Number.isInteger(val) || "Value " + val + " is not an integer",
	],
};

const TextPropertyType = {
	name: "Text",

	rules: [
		(val) => typeof val === "string" || "Value " + val + " is not a string",
	],
};

const NumberPropertyType = {
	name: "Number",

	rules: [
		(val) => typeof val === "number" || "Value " + val + " is not a number",
	],
};

export const StandardTypes = {
	BooleanPropertyType,
	DateTimePropertyType,
	IntegerPropertyType,
	NumberPropertyType,
	TextPropertyType,
};
