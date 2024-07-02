import { StandardTypes } from "../src/model/standardTypes.js";

const CapitalizedPropertyType = {
	name: "CapitilizedText",

	// Capitilize text before storing
	beforeWrite(value) {
		if (value != null && value.length > 0) return value.toUpperCase();
		else return value;
	},

	// Add title after reading
	afterRead(value) {
		if (value != null && value.length > 0) return "Doc. " + value;
		else return value;
	},
};

const ZipCodePropertyType = {
	name: "ZipcodeText",

	rules: [
		(value) =>
			/^[0-9]{5}$/.test(value) || value === "EE" || "Zip code is not correct",
	],
};

const User1 = {
	typeName: "user1",
	singleton: false,
	properties: {
		username: {},
		password: {
			default: "welcome1a",
		},
	},
};

const User2 = {
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

const Contact = {
	typeName: "contact",
	singleton: false,
	properties: {
		zipCode: {
			type: ZipCodePropertyType,
		},
		guid: {
			// Using function
			readonly: true,
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

const User = {
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

const House = {
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

const Company = {
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
};

const Organization = {
	typeName: "organization",
	singleton: false,
	properties: {
		company: {
			model: "company",
		},
	},
};

const Project = {
	typeName: "project",
	singleton: false,
	properties: {
		// authors: {
		// 	reference: "user",
		// 	multiple: true,
		// },
	},
};

const Contract = {
	typeName: "contract",
	singleton: false,
	properties: {
		customer: {},
	},
	attachments: {
		legalDocument: {
			filters: ["text/plain"], // Limit in terms of mime types
		},
		annexes: {
			multiple: true,
			limit: 2,
		},
		tiny: {
			size: 0.01, // Limit in terms of size (kb)
		},
	},
};

export const ExampleDbSchema = {
	version: 1,

	namespaces: {
		default: [
			User1,
			User2,
			Contact,
			User,
			House,
			Company,
			Organization,
			Project,
			Contract,
		],
	},

	relationships: {
		companyProjects: {
			type: "one-to-many",
			left: "company",
			right: "project",
			required: true,
		},
		organizationProjects: {
			type: "one-to-many",
			left: "company",
			right: {
				typeName: "project",
				propertyName: "organization",
			},
		},
		divisionProjects: {
			type: "one-to-many",
			left: {
				typeName: "company",
				methodName: "getMyProjects",
			},
			right: {
				typeName: "project",
				propertyName: "division",
			},
		},
		projectsAuthors: {
			type: "many-to-many",
			left: "project",
			right: "user",
		},
	},
};
