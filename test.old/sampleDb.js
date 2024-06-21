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

class SecurityNamespace extends Namespace {
	constructor() {
		super();

		this.name = "default";
		this.useModel(ownerModel);
	}
}

export class SampleDb extends CouchDatabase {
	constructor(nanoDb) {
		super(nanoDb);

		this.useNamespace(new SecurityNamespace());
	}
}
