import { Entity } from "./entity.js";
import {
	checkMandatoryArgument,
	getValueOrFunction,
} from "../helpers/tools.js";
import { security } from "../helpers/security.js";
import { Attachment } from "./attachment.js";
import { Reference, ReferenceList } from "./reference.js";

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

		// Create a brand new entity
		const entity = new Entity(this.namespace, model);

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

		// Internal function to write a value to the inner document
		function writeValue(value) {
			var updatedValue = value;

			if (propertyDefinition.beforeWrite)
				updatedValue = propertyDefinition.beforeWrite(updatedValue);

			// Check if a property type is defined
			if (propertyDefinition.type) {
				const propertyType = propertyDefinition.type;
				if (propertyType.beforeWrite)
					updatedValue = propertyType.beforeWrite(updatedValue);
			}

			// Check if it must be decrypted or hashed
			if (propertyDefinition.encrypted) {
				updatedValue = security.encryption(updatedValue);
			} else if (propertyDefinition.hashed)
				updatedValue = security.hash(updatedValue);

			entity._content.properties[name] = updatedValue;
		}

		// Internal function to read a value from the inner document
		function readValue(value) {
			// Check if a property type is defined
			var updatedValue = value;

			// Nothing to do if the value has been hashed
			if (propertyDefinition.hashed) return updatedValue;

			// Decrypt the value if encrypted
			if (propertyDefinition.encrypted)
				updatedValue = security.decryption(updatedValue);

			// Check trasformations
			if (propertyDefinition.type) {
				const propertyType = propertyDefinition.type;
				if (propertyType.afterRead)
					updatedValue = propertyType.afterRead(updatedValue);
			}

			if (propertyDefinition.afterRead) {
				updatedValue = propertyDefinition.afterRead(updatedValue);
			}

			return updatedValue;
		}

		// Internal function to get the default value
		function getDefault(propertyDefinition) {
			if (propertyDefinition.hasOwnProperty("default")) {
				// Retrive the default value
				return getValueOrFunction(propertyDefinition.default);
			} else {
				// Default value is not defined
				if (propertyDefinition.multiple) return [];
				else return null;
			}
		}

		// Get the default value
		if (!propertyDefinition.computed) {
			const defaultValue = getDefault(propertyDefinition);
			writeValue(defaultValue);
		}

		// Define getters and setters
		Object.defineProperty(entity, name, {
			// Getter
			get() {
				// Check if property is computed
				if (propertyDefinition.computed) {
					return propertyDefinition.computed.bind(entity)();
				} else {
					const value = readValue(entity._content.properties[name]);

					// Return empty value as it is
					return value;
				}
			},

			// Setter
			set(value) {
				let readonly = false;

				if (propertyDefinition.readonly)
					readonly = getValueOrFunction(propertyDefinition.readonly, entity);

				// Check if for this property 'set' is allowed
				if (propertyDefinition.computed || readonly) {
					throw new Error(
						"Couldn't assign a value to a computed/readonly property"
					);
				}

				// Check if an array has been assigned
				if (Array.isArray(value) && !propertyDefinition.multiple) {
					throw new Error(
						"Couldn't assign an array when multiple values are not allowed"
					);
				}
				if (!Array.isArray(value) && propertyDefinition.multiple) {
					throw new Error(
						"Couldn't assign a single value when multiple values are required"
					);
				}

				// Store value in the document
				writeValue(value);
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
