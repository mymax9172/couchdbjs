import { StandardTypes } from "../src/model/standardTypes.js";

const Address = {
	typeName: "address",
	title: "Address",
	description: "Address descriptor",
	service: "none",

	toString() {
		return this.streeName + ", " + this.location + " (" + this.country + ")";
	},

	properties: {
		streetName: {
			title: "Street name",
			description: "Name of the street (including street number)",
			type: "TextPropertyType",
			required: true,
		},
		zipCode: {
			title: "Zip code",
			description: "Postal code",
			type: "TextPropertyType",
		},
		location: {
			title: "Location",
			description: "City, town, place",
			type: "TextPropertyType",
			required: true,
		},
		state: {
			title: "State",
			description: "State, land or province",
			type: "TextPropertyType",
		},
		country: {
			title: "Country",
			description: "Name of the country, nation",
			type: "TextPropertyType",
			required: true,
		},
	},
	toString() {
		return this.streetName + " (" + this.country + ")";
	},
};

const Company = {
	typeName: "company",
	title: "Company",
	description: "Business organization",
	service: "collection",

	toString() {
		return this.name;
	},

	properties: {
		name: {
			title: "Name",
			description: "Name of the company",
			type: "TextPropertyType",
			required: true,
		},
		mainAddress: {
			title: "Address",
			description: "Address of the HQ",
			model: "business/address",
		},
	},
};

const Contact = {
	typeName: "contact",
	title: "Contact",
	description: "Individual who can be contacted",
	service: "collection",

	toString() {
		return this.fullName;
	},

	properties: {
		firstName: {
			title: "First name",
			description: "First or given name",
			type: "TextPropertyType",
			required: true,
		},
		lastName: {
			title: "Last name",
			description: "Last name, family name, surname",
			type: "TextPropertyType",
			required: true,
		},
		fullName: {
			title: "Full name",
			description: "Full name (first and last name)",
			type: "TextPropertyType",
			computed() {
				return this.firstName + " " + this.lastName;
			},
		},
		active: {
			title: "Active",
			description: "Active contact can be used for interactions",
			type: "BooleanPropertyType",
			required: true,
			default: true,
		},
	},
};

const User = {
	typeName: "user",
	title: "User",
	description: "User able to access the software",
	service: "collection",

	toString() {
		return this.username;
	},

	properties: {
		username: {
			title: "Username",
			description: "Unique identifier to access the software",
			required: true,
		},
		password: {
			title: "Password",
			description: "Secret code to access the software",
			required: true,
			default: "welcome1a",
			hashed: true,
		},
		active: {
			title: "Active",
			description: "Active user can login the software",
			type: "BooleanPropertyType",
			required: true,
			default: true,
		},
		employeeNumber: {
			title: "Employee Number",
			description: "Employee number for security reasons",
			required: true,
			encrypted: true,
		},
	},
	attachments: {
		avatar: {
			title: "Avatar",
			description: "Picture of the user",
			filters: ["image/jpeg", "image/png"],
		},
	},
};

const Role = {
	typeName: "role",
	title: "Role",
	description: "Authorizaton role in the software",
	service: "collection",

	toString() {
		return this.name;
	},

	properties: {
		name: {
			title: "Name",
			description: "Name of the role",
			required: true,
		},
		description: {
			title: "Description",
			description: "Description of what is available for users with this role",
		},
		active: {
			title: "Active",
			description: "Indicates if the role is active or not",
			type: "BooleanPropertyType",
			required: true,
			default: true,
		},
	},
};

export const SampleCRMSchema = {
	version: 1,

	types: {},
	
	namespaces: {
		business: {
			title: "Business",
			description: "Business context of sales",
			models: [Company, Contact, Address],
		},
		security: {
			title: "Security",
			description: "Data privacy, authentication and authorization",
			models: [User, Role],
		},
	},

	relationships: {
		users_roles: {
			title: "Users-Roles",
			description: "Roles binded with a User",
			type: "many-to-many",
			left: "security/user",
			right: "security/role",
			required: true,
		},

		company_contacts: {
			title: "Company-Contacts",
			description: "Contacts associated with a company",
			type: "one-to-many",
			left: "business/company",
			right: "business/contact",
			required: true,
		},
	},
};
