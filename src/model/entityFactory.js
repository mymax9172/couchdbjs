import { Entity } from "./entity.js";
import {
	checkMandatoryArgument,
	getValueOrFunction,
	validateRule,
} from "../helpers/tools.js";
import { security } from "../helpers/security.js";
import { Namespace } from "./namespace.js";
import { Reference, createReference } from "./reference.js";

export class EntityFactory {
	typeName;
	namespace;

	constructor(namespace, typeName) {
		// Check mandatory arguments
		checkMandatoryArgument("namespace", namespace);
		checkMandatoryArgument("typeName", typeName);

		this.namespace = namespace;
		this.typeName = typeName;
	}

	/**
	 * Create and instance a new entity class
	 */
	create() {
		// Retrieve the model
		const model = this.namespace.getModel(this.typeName);

		// Create a blank entity
		const entity = new Entity(this.namespace, model);

		// Create all properties
		Object.keys(model.properties).forEach((propertyName) => {
			const propertyDefinition = model.properties[propertyName];
			this.createProperty(entity, propertyName, propertyDefinition);
		});

		// Create relationships
		if (model.relationships) {
			Object.keys(model.relationships).forEach((relationshipName) => {
				const relationshipDefinition = model.relationships[relationshipName];
				this.createRelationship(
					entity,
					relationshipName,
					relationshipDefinition
				);
			});
		}

		// return the entity
		return entity;
	}

	// Create a new property
	createProperty(entity, name, propertyDefinition) {
		// Check mandatory arguments
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
					} else if (propertyDefinition.reference) {
						// Return the proxy reference
						return entity.refs[name];
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

				if (propertyDefinition.reference) {
					// In case of references
					// Recreate the entity / array of entity
					const namespaceName =
						propertyDefinition.namespace || factory.namespace.name;
					const namespace =
						factory.namespace.database.namespaces[namespaceName];
					const typeName = propertyDefinition.reference;

					if (propertyDefinition.multiple) {
						entity.refs[name] = [];
						// Array
						updValue.forEach((element) => {
							entity.refs[name].push(
								createReference(element, namespace, typeName)
							);
						});
					} else {
						// Single value
						entity.refs[name] = createReference(updValue, namespace, typeName);
					}
				}

				// Store value in the document
				writeValue(updValue);
			},
		});
	}

	createRelationship(entity, name, relationshipDefinition) {
		switch (relationshipDefinition.kind) {
			case "one-to-many":
				// Name of the method
				const functionName = "get" + name[0].toUpperCase() + name.slice(1);

				// Retrieve the type name
				const typeName = relationshipDefinition.typeName;

				// Retrieve the right namespace
				const namespaceName =
					relationshipDefinition.namespace || this.namespace.name;

				// Create the method
				entity[functionName] = async function () {
					// Define the query
					const query = {};
					query[relationshipDefinition.property] = this.id;

					return await this.namespace.database.data[namespaceName][
						typeName
					].find(query);
				};

				// Create the index
				const indexName =
					name[0].toUpperCase() +
					name.slice(1) +
					"By" +
					relationshipDefinition.property[0].toUpperCase() +
					relationshipDefinition.property.slice(1);

				this.namespace.database.data[namespaceName][typeName].defineIndex(
					indexName,
					[relationshipDefinition.property]
				);

				break;

			default:
				break;
		}
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
					throw new Error("Missing required value, null or undefined");
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
