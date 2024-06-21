import { CouchDatabase } from "../src/couchDatabase.js";
import { Namespace } from "../src/model/namespace.js";

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

class SecurityNamespace extends Namespace {
	constructor() {
		super();

		this.name = "default";
		this.useModel(ownerModel);
		this.useModel(userModel);
	}
}

export class SampleDb extends CouchDatabase {
	constructor(nanoDb) {
		super(nanoDb);

		this.useNamespace(new SecurityNamespace());
	}
}
