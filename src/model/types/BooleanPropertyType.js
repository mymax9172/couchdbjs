import { PropertyType } from "../propertyType.js";

export class BooleanPropertyType extends PropertyType {
	constructor() {
		super();

		this.name = "Boolean";
		this.rules.push(
			(val) => typeof val === "boolean" || "Value " + val + " is not a boolean"
		);
	}
}
