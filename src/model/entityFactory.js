import { Entity } from "./entity.js";
import {
	checkMandatoryArgument,
	getValueOrFunction,
} from "../helpers/tools.js";
import { security } from "../helpers/security.js";
import { Attachment } from "./attachment.js";
import { Reference, ReferenceList } from "./reference.js";
import { Property } from "./property.js";

export class EntityFactory {
	typeName;
	namespace;

	constructor(namespace, typeName) {
		// Check mandatory arguments
		checkMandatoryArgument("namespace", namespace);
		checkMandatoryArgument("typeName", typeName);

		this.namespace = namespace;
		this.typeName = typeName;

		// Setup security secret key
		security.secretKey = this.namespace.database.server.config.secretKey;
	}

	/**
	 * Create and instance a new entity class
	 */
	create() {
		// Retrieve the model
		const model = this.namespace.getModel(this.typeName);

		// Create a brand new entity with the name of the model
		const className =
			model.typeName[0].toUpperCase() + model.typeName.slice(1) + "Entity";
		const subClass = "(class " + className + " extends Entity {})";
		const type = eval(subClass);
		const entity = new type(this.namespace, model);

		// Create all properties
		Object.keys(model.properties).forEach((propertyName) => {
			const propertyDefinition = model.properties[propertyName];
			this.createProperty(entity, propertyName, propertyDefinition);
		});

		// Create attachments
		if (model.attachments) {
			Object.keys(model.attachments).forEach((attachmentName) => {
				const attachmenteDefinition = model.attachments[attachmentName];
				this.createAttachment(entity, attachmentName, attachmenteDefinition);
			});
		}

		// Create relationships (if any)
		if (Object.keys(this.namespace.database.relationships).length > 0) {
			// Loop all relationships
			const relationships = Object.values(
				this.namespace.database.relationships
			);
			relationships.forEach((relationship) => {
				if (relationship.contains(entity)) {
					this.createRelationship(entity, relationship);
				}
			});
		}

		// return the entity
		return entity;
	}

	// Create a new property
	createProperty(entity, name, propertyDefinition) {
		// Check mandatory arguments
		checkMandatoryArgument("entity", entity);
		checkMandatoryArgument("name", name);
		checkMandatoryArgument("propertyDefinition", propertyDefinition);

		// Create a new Property
		propertyDefinition.name = name;
		const property = new Property(entity, propertyDefinition);

		// Define getters and setters
		Object.defineProperty(entity, name, {
			// Getter
			get() {
				return property.get();
			},

			// Setter
			set(value) {
				// Store the value in the property
				property.set(value);
			},
		});
	}

	// Create an attachment
	createAttachment(entity, name, attachmentDefinition) {
		// Check mandatory arguments
		checkMandatoryArgument("entity", entity);
		checkMandatoryArgument("name", name);
		checkMandatoryArgument("attachmentDefinition", attachmentDefinition);

		// Create an attachment object
		const attachment = new Attachment(name, entity, attachmentDefinition);
		entity._content.attachments[name] = attachment;

		// Define getters and setters
		Object.defineProperty(entity, name, {
			// Getter
			get() {
				return entity._content.attachments[name];
			},
		});
	}

	createRelationship(entity, relationship) {
		// Check mandatory arguments
		checkMandatoryArgument("entity", entity);
		checkMandatoryArgument("relationship", relationship);

		function createQueryMethod(entity, relationship, side) {
			var namespace,
				typeName,
				functionName,
				propertyName,
				multiple = false;

			if (side === "left") {
				// Namespace and typename of the right side
				namespace =
					entity._definition.namespace.database.data[
						relationship.right.namespaceName
					];
				typeName = relationship.right.typeName;
				functionName = relationship.left.queryName;
				propertyName = relationship.right.propertyName;
			} else {
				// Namespace and typename of the left side
				namespace =
					entity._definition.namespace.database.data[
						relationship.left.namespaceName
					];
				typeName = relationship.left.typeName;
				functionName = relationship.right.queryName;
				propertyName = relationship.left.propertyName;
				multiple = true;
			}

			// Create the query method
			entity[functionName] = async function () {
				// Define the query
				const query = {};

				if (!multiple) query[propertyName] = entity.id;
				else query[propertyName] = { $in: [entity.id] };
				return await namespace[typeName].find(query);
			};
		}

		function createReferenceProperty(entity, relationship, side) {
			var namespace, typeName, propertyName;

			if (side === "right") {
				// Namespace and typename of the left side
				namespace =
					entity._definition.namespace.database.namespaces[
						relationship.left.namespaceName
					];
				typeName = relationship.left.typeName;
				propertyName = relationship.right.propertyName;

				// Create the reference
				entity._content.references[relationship.name] = new Reference(
					namespace,
					typeName,
					relationship.required
				);

				// Create a new property for this entity
				Object.defineProperty(entity, propertyName, {
					get() {
						return entity._content.references[relationship.name];
					},
					set(value) {
						entity._content.references[relationship.name].set(value);
					},
				});
			} else {
				// ReferenceList property on left (for many-to-many)

				// Namespace and typename of the right side
				namespace =
					entity._definition.namespace.database.namespaces[
						relationship.right.namespaceName
					];
				typeName = relationship.right.typeName;
				propertyName = relationship.left.propertyName;

				// Create where to save references
				entity._content.references[relationship.name] = new ReferenceList(
					namespace,
					typeName,
					relationship.required
				);

				// Create a new property for this entity
				Object.defineProperty(entity, propertyName, {
					get() {
						return entity._content.references[relationship.name];
					},
					set(values) {
						entity._content.references[relationship.name].set(values);
					},
				});
			}
		}

		// Store the relationship
		entity._definition.relationships[relationship.name] = relationship;

		const side = relationship.getSide(entity);
		if (relationship.type === "one-to-many") {
			if (side === "left") {
				createQueryMethod(entity, relationship, side);
			} else {
				createReferenceProperty(entity, relationship, side);
			}
		}

		if (relationship.type === "many-to-many") {
			if (side === "left") {
				createReferenceProperty(entity, relationship, side);
			} else {
				createQueryMethod(entity, relationship, side);
			}
		}
	}
}
