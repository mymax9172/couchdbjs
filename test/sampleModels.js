import { StandardTypes } from "../src/model/standardTypes.js";

const CapitalizedPropertyType = {
	...StandardTypes.BasePropertyType,

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
	...StandardTypes.BasePropertyType,

	name: "ZipcodeText",

	rules: [
		(value) =>
			/^[0-9]{5}$/.test(value) || value === "EE" || "Zip code is not correct",
	],
};

const User1 = {
	typeName: "user1",
	service: "collection",
	properties: {
		username: {},
		password: {
			default: "welcome1a",
		},
	},
};

const User2 = {
	typeName: "user2",
	service: "collection",
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
	service: "collection",
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
	service: "collection",
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
	service: "collection",
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
	service: "collection",
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
	service: "collection",
	properties: {
		company: {
			model: "company",
		},
	},
};

const Project = {
	typeName: "project",
	service: "collection",
	properties: {},
};

const Contract = {
	typeName: "contract",
	service: "collection",
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
		default: {
			title: "Default",
			description: "Default namespace",
			models: [
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
	},

	relationships: {
		companyProjects: {
			type: "one-to-many",
			left: "default.company",
			right: "default.project",
			required: true,
		},

		organizationProjects: {
			type: "one-to-many",
			left: {
				typeName: "default.company",
				queryName: "myProjects",
			},
			right: {
				typeName: "default.project",
				propertyName: "organization",
			},
		},

		projectsAuthors: {
			type: "many-to-many",
			left: "default.project",
			right: "default.user",
		},
	},
};
