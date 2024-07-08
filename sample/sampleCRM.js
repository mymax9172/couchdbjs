import { StandardTypes } from "../src/model/standardTypes.js";

const Address = {
	typeName: "address",
	title: "Address",
	description: "Address descriptor",
	service: "none",
	properties: {
		streetName: {
			title: "Street name",
			description: "Name of the street (including street number)",
			type: StandardTypes.TextPropertyType,
			required: true,
		},
		zipCode: {
			title: "Zip code",
			description: "Postal code",
			type: StandardTypes.TextPropertyType,
		},
		location: {
			title: "Location",
			description: "City, town, place",
			type: StandardTypes.TextPropertyType,
		},
		state: {
			title: "State",
			description: "State, land or province",
			type: StandardTypes.TextPropertyType,
		},
		country: {
			title: "Country",
			description: "Name of the country, nation",
			type: StandardTypes.TextPropertyType,
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
	properties: {
		name: {
			title: "Name",
			description: "Name of the company",
			type: StandardTypes.TextPropertyType,
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
	properties: {
		firstName: {
			title: "First name",
			description: "First or given name",
			type: StandardTypes.TextPropertyType,
			required: true,
		},
		lastName: {
			title: "Last name",
			description: "Last name, family name, surname",
			type: StandardTypes.TextPropertyType,
			required: true,
		},
		fullName: {
			title: "Full name",
			description: "Full name (first and last name)",
			type: StandardTypes.TextPropertyType,
			computed() {
				return this.firstName + " " + this.lastName;
			},
		},
		active: {
			title: "Active",
			description: "Active contact can be used for interactions",
			type: StandardTypes.BooleanPropertyType,
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
	properties: {
		username: {
			title: "Username",
			description: "Unique identifier to access the software",
		},
		password: {
			title: "Password",
			description: "Secret code to access the software",
			default: "welcome1a",
			hashed: true,
		},
		active: {
			title: "Active",
			description: "Active user can login the software",
			type: StandardTypes.BooleanPropertyType,
			required: true,
			default: true,
		},
	},
	attachments: {
		avatar: {
			// title: "Avatar",
			// description: "Picture of the user",
			//filters: ["image/jpeg"],
		},
	},
};

export const SampleCRMSchema = {
	version: 1,

	namespaces: {
		business: {
			title: "Business",
			description: "Business context of sales",
			models: [Company, Contact, Address],
		},
		security: {
			title: "Security",
			description: "Data privacy, authentication and authorization",
			models: [User],
		},
	},

	relationships: {},
};
