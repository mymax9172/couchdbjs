const ownerModel = {
	typeName: "owner",
	service: "singleton",
	properties: {
		firstName: {
			default: "anonymous",
		},
		lastName: {},
		fullName: {
			computed() {
				return this.firstName + " " + this.lastName;
			},
		},
	},
};

const userModel = {
	typeName: "user",
	service: "collection",
	properties: {
		firstName: {
			default: "anonymous",
		},
		lastName: {},
		fullName: {
			computed() {
				return this.firstName + " " + this.lastName;
			},
		},
	},
};

export const SampleDbSchema = {
	version: 1,

	namespaces: {
		default: {
			title: "Default",
			description: "Default namespace",
			models: [ownerModel, userModel],
		},
	},
};
