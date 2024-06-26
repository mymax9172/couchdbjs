const ownerModel = {
	typeName: "owner",
	singleton: true,
	properties: {
		firstName: {
			default: "default name",
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
	singleton: false,
	properties: {
		firstName: {
			default: "default name",
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
		default: [ownerModel, userModel],
	},
};
