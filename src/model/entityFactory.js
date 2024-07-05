import { Entity } from "./entity.js";
import {
	checkMandatoryArgument,
	getValueOrFunction,
	validateRule,
} from "../helpers/tools.js";
import { security } from "../helpers/security.js";
import { Namespace } from "./namespace.js";
import { Reference, ReferenceList } from "./reference.js";
import { Attachment } from "./attachment.js";
import { Relationship } from "../database/relationship.js";

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
		// Retrive the schema
		const schema = this.namespace.database.schema;

		// Retrieve the model
		const model = this.namespace.getModel(this.typeName);

		// Create a blank entity
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
				// Create the relationship
				if (relationship.implement(entity)) {
					// Store the relationship in the entity
					if (entity.relationships == null) entity.relationships = {};
					entity.relationships[relationship.name] = relationship;
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
			// Check if a property type is defined
			var updatedValue = value;

			if (propertyDefinition.beforeWrite)
				updatedValue = propertyDefinition.beforeWrite(updatedValue);

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

			entity.document[name] = updatedValue;
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
		if (
			!propertyDefinition.computed
			//propertyDefinition.type != "attachment"
		) {
			const defaultValue = getDefault(propertyDefinition);
			writeValue(defaultValue);
		}

		// Helper for getters/setters
		const factory = this;

		// Define getters and setters
		Object.defineProperty(entity, name, {
			// Getter
			get() {
				// Check if property is computed
				if (propertyDefinition.computed) {
					return propertyDefinition.computed.bind(entity)();
				} else {
					const value = readValue(entity.document[name]);

					// Return empty value as it is
					if (!value) return value;

					// Check if it is a model
					if (propertyDefinition.model) {
						// Recreate the entity / array of entity
						const namespaceName =
							propertyDefinition.namespace || factory.namespace.name;
						const namespace =
							factory.namespace.database.namespaces[namespaceName];
						const typeName = propertyDefinition.model;

						if (propertyDefinition.multiple) {
							// Array
							return value.map((element) =>
								factory.parseEntity(element, namespace, typeName)
							);
						} else {
							// Single value
							return factory.parseEntity(value, namespace, typeName);
						}
					} else {
						// Return as it is
						return value;
					}
				}
			},

			// Setter
			set(value) {
				let updValue = value;
				let readonly = false;

				if (propertyDefinition.hasOwnProperty("readonly"))
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

				// Check if multiple values
				if (propertyDefinition.multiple) {
					// Validation of all elements
					updValue.forEach((element) => {
						factory.validatePropertyValue(element, entity, name);
					});
				} else {
					// Validation of one element
					factory.validatePropertyValue(updValue, entity, name);
				}

				// In case of nested object
				if (propertyDefinition.model) {
					if (propertyDefinition.multiple) {
						// In case of multiple values, get the inner document for each element
						updValue = updValue.map((element) => element.export());
					} else {
						// If it is a model, get the inner document
						updValue = updValue.export();
					}
				}

				// if (propertyDefinition.reference) {
				// 	// In case of references
				// 	// Recreate the entity / array of entity
				// 	const namespaceName =
				// 		propertyDefinition.namespace || factory.namespace.name;
				// 	const namespace =
				// 		factory.namespace.database.namespaces[namespaceName];
				// 	const typeName = propertyDefinition.reference;

				// 	if (propertyDefinition.multiple) {
				// 		if (!entity.document.hasOwnProperty("_references"))
				// 			entity.document._references = {};

				// 		entity.document[name] = [];
				// 		// Array
				// 		updValue.forEach((element) => {
				// 			entity.refs[name].push(
				// 				createReference(element, namespace, typeName)
				// 			);
				// 		});
				// 	} else {
				// 		// Single value
				// 		entity.refs[name] = createReference(updValue, namespace, typeName);
				// 	}
				// }

				// Store value in the document
				writeValue(updValue);
			},
		});
	}

	// // Create a relationship
	// createRelationship(entity, relationship) {
	// 	// Check mandatory arguments
	// 	checkMandatoryArgument("entity", entity);
	// 	checkMandatoryArgument("relationship", relationship);

	// 	relationship.implement(entity);

	// 	// function createReferenceProperty(
	// 	// 	entity,
	// 	// 	propertyName,
	// 	// 	namespaceName,
	// 	// 	typeName,
	// 	// 	required = false
	// 	// ) {
	// 	// 	// Get the namespace
	// 	// 	const namespace = entity.namespace.database.namespaces[namespaceName];

	// 	// 	// Create where to save references
	// 	// 	if (!entity.document._references) entity.document._references = {};
	// 	// 	entity.document._references[propertyName] = new Reference(
	// 	// 		namespace,
	// 	// 		typeName,
	// 	// 		required
	// 	// 	);

	// 	// 	// Create a new property for this entity
	// 	// 	Object.defineProperty(entity, propertyName, {
	// 	// 		get() {
	// 	// 			return entity.document._references[propertyName];
	// 	// 		},
	// 	// 		set(value) {
	// 	// 			if (value instanceof Entity)
	// 	// 				entity.document._references[propertyName].id = value.id;
	// 	// 			else entity.document._references[propertyName].id = value;
	// 	// 		},
	// 	// 	});

	// 	// 	return propertyName;
	// 	// }
	// 	// function createReferenceListProperty(
	// 	// 	entity,
	// 	// 	propertyName,
	// 	// 	namespaceName,
	// 	// 	typeName,
	// 	// 	required = false
	// 	// ) {
	// 	// 	// Get the namespace
	// 	// 	const namespace = entity.namespace.database.namespaces[namespaceName];

	// 	// 	// Get the model
	// 	// 	const model =
	// 	// 		entity.namespace.database.namespaces[namespaceName].getModel(typeName);

	// 	// 	// Create where to save references
	// 	// 	if (!entity.document._references) entity.document._references = {};
	// 	// 	entity.document._references[propertyName] = new ReferenceList(
	// 	// 		namespace,
	// 	// 		typeName,
	// 	// 		required
	// 	// 	);

	// 	// 	// Create a new property for this entity
	// 	// 	Object.defineProperty(entity, propertyName, {
	// 	// 		get() {
	// 	// 			return entity.document._references[propertyName];
	// 	// 		},
	// 	// 	});

	// 	// 	return propertyName;
	// 	// }
	// 	// function createQueryMethod(
	// 	// 	entity,
	// 	// 	name,
	// 	// 	functionName,
	// 	// 	namespaceName,
	// 	// 	typeName,
	// 	// 	propertyName,
	// 	// 	multiple
	// 	// ) {
	// 	// 	// Name of the method
	// 	// 	var fName;
	// 	// 	if (functionName) fName = functionName;
	// 	// 	else fName = "get" + name[0].toUpperCase() + name.slice(1);

	// 	// 	// Namespace
	// 	// 	const namespace = entity.namespace.database.data[namespaceName];

	// 	// 	// Create the method
	// 	// 	entity[fName] = async function () {
	// 	// 		// Define the query
	// 	// 		const query = {};
	// 	// 		if (multiple) {
	// 	// 			query[propertyName] = { $in: this.id };
	// 	// 		} else query[propertyName] = this.id;

	// 	// 		return await namespace[typeName].find(query);
	// 	// 	};

	// 	// 	// Create the index
	// 	// 	namespace[typeName].defineIndex(name, [propertyName]);
	// 	// }

	// 	// function getFullTypeName(value) {
	// 	// 	var typeName;
	// 	// 	if (typeof value === "string") typeName = value;
	// 	// 	else typeName = value.typeName;

	// 	// 	if (typeName.indexOf(".") === -1)
	// 	// 		return {
	// 	// 			namespace: entity.namespace.name,
	// 	// 			typeName: typeName,
	// 	// 		};
	// 	// 	else
	// 	// 		return {
	// 	// 			namespace: typeName.split(".")[0],
	// 	// 			typeName: typeName.split(".")[1],
	// 	// 		};
	// 	// }

	// 	// Check if left or right side

	// 	// Implement the relationship
	// }

	// Create an attachment
	createAttachment(entity, name, attachmentDefinition) {
		// Check mandatory arguments
		checkMandatoryArgument("entity", entity);
		checkMandatoryArgument("name", name);
		checkMandatoryArgument("attachmentDefinition", attachmentDefinition);

		// Create an attachment object
		const attachment = new Attachment(name, entity);
		attachment.compress = attachmentDefinition.compress || false;
		attachment.size = attachmentDefinition.size || 0;
		attachment.filters = attachmentDefinition.filters || null;
		attachment.multiple = attachmentDefinition.multiple || false;
		attachment.limit = attachmentDefinition.limit || 0;

		if (!entity.document.hasOwnProperty("_attachments"))
			entity.document._attachments = {};
		entity.document._attachments[name] = attachment;

		// Define getters and setters
		Object.defineProperty(entity, name, {
			// Getter
			get() {
				return entity.document._attachments[name];
			},
		});
	}

	/**
	 * Validate a property value
	 * @param {*} value Value to be validated
	 * @param {*} entity Entity
	 * @param {*} name Name of the property
	 */
	validatePropertyValue(value, entity, name) {
		const propertyDefinition = entity.model.properties[name];

		// Check required attribute
		if (propertyDefinition.hasOwnProperty("required")) {
			let req = getValueOrFunction(propertyDefinition.required, entity);
			if (req) {
				if (value == null)
					throw new Error("Missing required value, null or undefined " + name);
				if (typeof value === "string" && value.length === 0)
					throw new Error("Missing required value, empty string");
				if (typeof value === "object") {
					if (Array.isArray(value) && value.length === 0)
						throw new Error("Missing required value, empty array");
					if (value.constructor === Object && Object.keys(value).length === 0)
						throw new Error("Missing required value, empty object");
				}
			}
		}

		// Validate (if not null)
		if (value == null) return;

		// Check if value is an entity
		if (propertyDefinition.model) {
			if (
				value.constructor.name != "Entity" ||
				!value.model ||
				value.model.typeName != propertyDefinition.model
			) {
				throw new Error("Model mismatch, expected " + propertyDefinition.model);
			}

			value.validate();
		} else if (propertyDefinition.reference) {
			// Value should be a reference
			if (typeof value != "string") {
				throw new Error("Expected reference (string)");
			}
		} else {
			// Static values

			// Exclude models
			if (value.constructor.name === "Entity")
				throw new Error("Not expected an entity");

			if (propertyDefinition.type) {
				// Check property type rules
				const propertyType = propertyDefinition.type;

				if (propertyType.rules && propertyType.rules.length > 0) {
					const result = validateRule(value, propertyType.rules, entity);
					if (typeof result === "string")
						throw new Error("Invalid value: " + result);
				}
			}

			// Check property rules
			if (propertyDefinition.rules && propertyDefinition.rules.length > 0) {
				const result = validateRule(value, propertyDefinition.rules, entity);
				if (typeof result === "string")
					throw new Error("Invalid value: " + result);
			}
		}
	}

	/**
	 * Rehydrate an entity from its own document
	 * @param {JSON} document Document
	 * @param {Namespace} namespace Namespace instance
	 * @param {String} typeName Name of the type
	 * @returns {Entity} Entity from the given document
	 */
	parseEntity(document, namespace, typeName) {
		const factory = new EntityFactory(namespace, typeName);
		const entity = factory.create();

		entity.import(document);

		return entity;
	}
}
