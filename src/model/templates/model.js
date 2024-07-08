export const Model = {
	// Name of the model
	typeName: "",

	// Title and description (abstract)
	title: "",
	description: "",

	// Service level
	// None, entity is not saved into the database but enbedded into other entities
	// Singleton, one entity can exist into the database
	// Collection, multiple entities can be saved into the database
	service: "collection",

	// Internal model is never saved as standalone document (but inside other documents)
	internal: false,

	// Properties
	properties: {
		name: {
			// Title and description (abstract)
			title: "Name",
			description: "Name of the entity...",

			// (optional) Default value, could be a static value or a function
			default: "something",
			default() {
				// return something here
			},

			// (optional) Computed property
			computed() {
				// 'this' is the entity itself
				// return something here
			},

			// (optional) Property type for storing strategy and validation at property type level
			// Type class has the following optional configurable members
			// beforeWrite() (see below)
			// afterRead() (see below)
			// rules: [] (see below)
			type: null,

			// (optional) Readonly, true if the value can be only imported not assigned (could be a static value or a function)
			readonly: false,
			readonly(entity) {
				// return true or false
			},

			// (optional) Hashed value, true if the value is hashed as soon as provided
			hashed: false,

			// (optional) Encypted value, true if the value is encrypted before store and decrypted after read (encrypted at rest)
			// Be aware decryption return always a string, use afterRead method to transform to the right type
			encypted: false,

			// (optional) Required, true if the value must not be a null, undefined, empty string, empty array nor empty object
			required: false,
			required(entity) {
				// this is the entity itself
				// return true or false
			},

			// Rules at property level, like the ones at property type level
			rules: [(value) => value != "" || "Value is null"],

			// Executed before returning a value from the document (After transformation done by the optional type class)
			afterRead(value) {
				// return a transformed value
			},

			// Executed before writing a value onto the document (Before transformation done by the optional type class)
			beforeWrite(value) {
				// return a transformed value
			},

			// (optional) Multiple, true if multiple values are accepted
			multiple: false,

			// String formatted
			toString() {
				return this;
			},
		},
	},

	// Attachments
	attachments: {
		// Named attachment (can be read as a property on the entity)
		contract: {
			// Title and description (abstract)
			title: "Contract", //
			description: "Contract with business partners",

			filters: ["application/pdf"], // Limit in terms of mime types
			size: 1000, // Limit in terms of size (kb)
			compress: true, // File compressed before saved
			multiple: false, // True if multiple file are accepted
			limit: 1, // If multiple define how many files are accepted
		},
	},
	// Indexes
	indexes: [],
};
