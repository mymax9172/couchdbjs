import { validateRule } from "../helpers/tools.js";

/**
 * PropertyType definition
 */
export class PropertyType {
	// Name of the property type definition
	name;

	/**
	 * Hook before writing on the document
	 * @param {*} value Value read from the UI
	 * @returns {*} Trasformed value
	 */
	beforeWrite(value) {
		return value;
	}

	/**
	 * Hook after reading from the document
	 * @param {*} value Value read from the document
	 * @returns {*} Trasformed value for the UI
	 */
	afterRead(value) {
		return value;
	}

	// Validation rules
	rules = [];

	/**
	 * Validate the value before writing (even beforeWrite hook)
	 * @param {*} value Value to be validated
	 * @returns {String|Boolean} True if validation passed or a string message if failed
	 */
	validate(value) {
		return validateRule(value, this.rules);
	}
}
