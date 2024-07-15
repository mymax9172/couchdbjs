import { Reference, ReferenceList } from "./reference.js";

class RelationshipSide {
	namespaceName;
	typeName;
	queryName;
	propertyName;

	constructor(type) {
		const split = type.split("/");
		if (split.length != 2)
			throw new Error("Invalid type name [namespace.typename]");

		this.namespaceName = split[0];
		this.typeName = split[1];
	}
}

export class Relationship {
	name;
	type;
	required;

	title;
	description;

	left = null;
	right = null;

	constructor(definition) {
		this.name = definition.name;
		this.type = definition.type;
		this.required = definition.required;

		this.title = definition.title;
		this.description = definition.description;

		this.left = new RelationshipSide(
			typeof definition.left === "string"
				? definition.left
				: definition.left.typeName
		);
		this.right = new RelationshipSide(
			typeof definition.right === "string"
				? definition.right
				: definition.right.typeName
		);

		if (definition.type === "one-to-many") {
			this.left.queryName =
				"get" +
				this.capitilize(
					definition.left?.queryName || this.right.typeName + "List"
				);
			this.right.propertyName =
				definition.right?.propertyName || this.left.typeName;
		}

		if (definition.type === "many-to-many") {
			this.left.propertyName =
				definition.left?.propertyName || this.right.typeName + "List";
			this.right.queryName =
				"get" +
				this.capitilize(
					definition.right?.queryName || this.left.typeName + "List"
				);
		}
	}

	contains(entity) {
		const namespace = entity._definition.namespace.name;
		const typeName = entity._definition.model.typeName;

		if (
			this.left.namespaceName === namespace &&
			this.left.typeName === typeName
		)
			return true;
		if (
			this.right.namespaceName === namespace &&
			this.right.typeName === typeName
		)
			return true;
		return false;
	}

	getSide(entity) {
		const namespace = entity._definition.namespace.name;
		const typeName = entity._definition.model.typeName;

		if (
			this.left.namespaceName === namespace &&
			this.left.typeName === typeName
		)
			return "left";
		if (
			this.right.namespaceName === namespace &&
			this.right.typeName === typeName
		)
			return "right";
	}

	getIndex() {
		if (this.type === "one-to-many")
			return {
				name: this.name,
				fields: [this.right.propertyName],
			};
		else if (this.type === "many-to-many")
			return {
				name: this.name,
				fields: [this.left.propertyName],
			};
	}

	capitilize(text) {
		return text[0].toUpperCase() + text.slice(1);
	}

	getFullType(value) {
		var typeName;
		if (typeof value === "string") typeName = value;
		else typeName = value.typeName;

		const split = typeName.split("/");
		if (split.length != 2)
			throw new Error("Invalid full typename [namespace.typename]");

		return {
			namespace: split[0],
			typeName: split[1],
		};
	}
}
