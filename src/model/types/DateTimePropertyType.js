import { PropertyType } from "../propertyType.js";

export class DateTimePropertyType extends PropertyType {
	constructor() {
		super();

		this.name = "DateTime";

		this.rules.push(
			(val) => val instanceof Date || "Value " + val + " is not a Date object"
		);
	}

	/**
	 * Hook before writing on the document
	 * @param {*} value Value read from the UI
	 * @returns {*} Trasformed value
	 */
	beforeWrite(value) {
		if (!value) return value;
		return value.getTime();
	}

	/**
	 * Hook after reading from the document
	 * @param {*} value Value read from the document
	 * @returns {*} Trasformed value for the UI
	 */
	afterRead(value) {
		if (!value) return value;
		return new Date(value);
	}
}
