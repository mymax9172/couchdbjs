import { PropertyType } from "../propertyType.js";

export class IntegerPropertyType extends PropertyType {
	constructor() {
		super();

		this.name = "Boolean";
		this.rules.push(
			(val) => Number.isInteger(val) || "Value " + val + " is not an integer"
		);
	}
}
