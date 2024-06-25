import { CouchDatabase } from "../src/couchDatabase.js";
import { Namespace } from "../src/model/namespace.js";

import { PropertyType } from "../src/model/propertyType.js";
import { StandardTypes } from "../src/model/types/index.js";

class CapitalizedPropertyType extends PropertyType {
	constructor() {
		super();
		this.name = "CapitilizedText";
	}

	// Capitilize text before storing
	beforeWrite(value) {
		if (value != null && value.length > 0) return value.toUpperCase();
		else return value;
	}

	// Add title after reading
	afterRead(value) {
		if (value != null && value.length > 0) return "Doc. " + value;
		else return value;
	}
}

class ZipCodePropertyType extends PropertyType {
	constructor() {
		super();
		this.name = "ZipcodeText";

		this.rules = [
			(value) =>
				/^[0-9]{5}$/.test(value) || value === "EE" || "Zip code is not correct",
		];
	}
}

const model1 = {
	typeName: "user1",
	singleton: false,
	properties: {
		username: {},
		password: {
			default: "welcome1a",
		},
	},
};

const model2 = {
	typeName: "user2",
	singleton: false,
	properties: {
		username: {},
		password: {
			default() {
				return "password";
			},
		},
		identifier: {
			computed() {
				return "pwd/" + this.password;
			},
		},
		lastName: {
			type: CapitalizedPropertyType,
		},
	},
};

const model3 = {
	typeName: "contact",
	singleton: false,
	properties: {
		zipCode: {
			type: ZipCodePropertyType,
		},
		guid: {
			// Using function
			readonly(e) {
				return true;
			},
			default: "11111111",
		},
		address: {
			rules: [(value) => value.startsWith("street") || "Empty value is not ok"],
		},
		city: {
			required: true,
		},
	},
};

const model4 = {
	typeName: "user",
	singleton: false,
	properties: {
		username: {},
		password: {
			default: "welcome1a",
			hashed: true,
		},
		taxCode: {
			encrypted: true,
		},
		age: {
			encrypted: true,
			afterRead(value) {
				if (!value) return value;
				return Number(value);
			},
		},
	},
};

const model5 = {
	typeName: "house",
	singleton: false,
	properties: {
		addresses: {
			type: StandardTypes.TextPropertyType,
			multiple: true,
		},
		balance: {
			type: StandardTypes.NumberPropertyType,
		},
		active: {
			type: StandardTypes.BooleanPropertyType,
		},
		age: {
			type: StandardTypes.IntegerPropertyType,
		},
		birthday: {
			type: StandardTypes.DateTimePropertyType,
		},
	},
};

const model6 = {
	typeName: "company",
	singleton: false,
	properties: {
		address: {},
		user: {
			model: "user",
		},
		managers: {
			model: "user",
			multiple: true,
		},
	},
	relationships: {
		projects: {
			typeName: "project",
			property: "company",
			kind: "one-to-many",
		},
	},
};

const model7 = {
	typeName: "organization",
	singleton: false,
	properties: {
		company: {
			model: "company",
		},
	},
};

const model8 = {
	typeName: "project",
	singleton: false,
	properties: {
		company: {
			reference: "company",
		},
		authors: {
			reference: "user",
			multiple: true,
		},
	},
};

class DefaultNamespace extends Namespace {
	constructor() {
		super();

		this.name = "default";
		this.useModel(model1);
		this.useModel(model2);
		this.useModel(model3);
		this.useModel(model4);
		this.useModel(model5);
		this.useModel(model6);
		this.useModel(model7);
		this.useModel(model8);
	}
}

export class ExampleDb extends CouchDatabase {
	constructor(nanoDb) {
		super(nanoDb);

		this.useNamespace(new DefaultNamespace());
	}
}

export default {
	model1,
	model2,
	model3,
	model4,
	model5,
	model6,
	model7,
	model8,
};
