import { Entity } from "../model/entity.js";
import { Reference, ReferenceList } from "../model/reference.js";

export class Relationship {
	name;
	type;
	leftType;
	rightType;
	required;

	leftQueryName;
	rightPropertyName;
	leftPropertyName;
	rightQueryName;

	constructor(definition) {
		this.type = definition.type;
		this.required = definition.required;
		this.name = definition.name;
		this.leftType = this.getFullType(definition.left);
		this.rightType = this.getFullType(definition.right);

		if (definition.type === "one-to-many") {
			this.leftQueryName =
				"get" +
				this.capitilize(
					definition.left?.queryName || this.rightType.typeName + "List"
				);
			this.rightPropertyName =
				definition.right?.propertyName || this.leftType.typeName;
		}

		if (definition.type === "many-to-many") {
			this.leftPropertyName =
				definition.left?.propertyName || this.rightType.typeName + "List";
			this.rightQueryName =
				"get" +
				this.capitilize(
					definition.right?.queryName || this.leftType.typeName + "List"
				);
		}
	}

	contains(entity) {
		const namespace = entity.namespace.name;
		const typeName = entity.model.typeName;

		if (
			this.leftType.namespace === namespace &&
			this.leftType.typeName === typeName
		)
			return true;
		if (
			this.rightType.namespace === namespace &&
			this.rightType.typeName === typeName
		)
			return true;
		return false;
	}

	getSide(entity) {
		const namespace = entity.namespace.name;
		const typeName = entity.model.typeName;

		if (
			this.leftType.namespace === namespace &&
			this.leftType.typeName === typeName
		)
			return "left";
		if (
			this.rightType.namespace === namespace &&
			this.rightType.typeName === typeName
		)
			return "right";
	}

	implement(entity) {
		if (!this.contains(entity)) return false;

		const side = this.getSide(entity);

		if (this.type === "one-to-many") {
			if (side === "left") {
				this.createQueryMethod(entity, side);
			} else {
				this.createReferenceProperty(entity, side);
			}
		}

		if (this.type === "many-to-many") {
			if (side === "left") {
				this.createReferenceProperty(entity, side);
			} else {
				this.createQueryMethod(entity, side);
			}
		}

		return true;
	}

	createQueryMethod(entity, side) {
		var namespace,
			typeName,
			functionName,
			propertyName,
			multiple = false;

		if (side === "left") {
			// Namespace and typename of the right side
			namespace = entity.namespace.database.data[this.rightType.namespace];
			typeName = this.rightType.typeName;
			functionName = this.leftQueryName;
			propertyName = this.rightPropertyName;
		} else {
			// Namespace and typename of the left side
			namespace = entity.namespace.database.data[this.leftType.namespace];
			typeName = this.leftType.typeName;
			functionName = this.rightQueryName;
			propertyName = this.leftPropertyName;
			multiple = true;
		}

		// Create the query method
		entity[functionName] = async function () {
			// Define the query
			const query = {};

			if (!multiple) query[propertyName] = entity.id;
			else query[propertyName] = { $in: entity.id };

			return await namespace[typeName].find(query);
		};
	}

	createReferenceProperty(entity, side) {
		var namespace, typeName, propertyName;

		if (side === "right") {
			// Namespace and typename of the left side
			namespace = entity.namespace.database.namespaces[this.leftType.namespace];
			typeName = this.leftType.typeName;
			propertyName = this.rightPropertyName;

			// Create where to save references
			if (!entity.document._references) entity.document._references = {};
			entity.document._references[propertyName] = new Reference(
				namespace,
				typeName,
				this.required
			);

			// Create a new property for this entity
			Object.defineProperty(entity, propertyName, {
				get() {
					return entity.document._references[propertyName];
				},
				set(value) {
					entity.document._references[propertyName].set(value);
				},
			});
		} else {
			// ReferenceList property on left (for many-to-many)

			// Namespace and typename of the right side
			namespace =
				entity.namespace.database.namespaces[this.rightType.namespace];
			typeName = this.rightType.typeName;
			propertyName = this.leftPropertyName;

			// Create where to save references
			if (!entity.document._references) entity.document._references = {};
			entity.document._references[propertyName] = new ReferenceList(
				namespace,
				typeName,
				this.required
			);

			// Create a new property for this entity
			Object.defineProperty(entity, propertyName, {
				get() {
					return entity.document._references[propertyName];
				},
			});
		}
	}

	getIndex() {
		if (this.type === "one-to-many")
			return {
				name: this.name,
				fields: [this.rightPropertyName],
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
