import { PropertyType } from "../propertyType.js";

export class NumberPropertyType extends PropertyType {
	constructor() {
		super();

		this.name = "Number";
		this.rules.push(
			(val) => typeof val === "number" || "Value " + val + " is not a number"
		);
	}
}
