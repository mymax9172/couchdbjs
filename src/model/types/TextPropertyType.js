import { PropertyType } from "../propertyType.js";

export class TextPropertyType extends PropertyType {
	constructor() {
		super();

		this.name = "Text";
		this.rules.push(
			(val) => typeof val === "string" || "Value " + val + " is not a string"
		);
	}
}
