export class Reference {
	id;
	database;
	namespaceName;
	typeName;

	constructor(database, namespaceName, typeName) {
		this.database = database;
		this.namespaceName = namespaceName;
		this.typeName = typeName;
	}

	get value() {
		return this.id;
	}

	getReference() {
		return null;
	}
}
