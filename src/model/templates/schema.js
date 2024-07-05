export const Schema = {
	// Version of the schema (number 1,2, ...)
	version: 1,

	// Namespaces
	namespaces: {
		// Name of the namespace and array of models
		security: {
			title: "Security",
			description: "Manage data security, authentication and authoization",
			models: [Model1, Model2],
		},
	},

	// Relationships
	relationships: {
		companyEmployees: {
			type: "one-to-many",
			left: "company",
			right: "employee",
			required: true,
		},
	},
};
