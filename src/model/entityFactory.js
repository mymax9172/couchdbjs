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
					return value;
				}
			},

			// Setter
			set(value) {
				// console.log("setting property " + name + " to:", value);
				let updValue = value;
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

				// Store value in the document
				writeValue(updValue);
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
		//Skipped if draft
		if (entity.draft) return;

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
				value.namespace.name != propertyDefinition.model.split("/")[0] ||
				value.model.typeName != propertyDefinition.model.split("/")[1]
			) {
				throw new Error("Model mismatch, expected " + propertyDefinition.model);
			}

			value.validate();

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
	 * Return all rules applicable
	 * @param {Entity} entity Entity to be validated
	 * @param {String} name Property name
	 */
	getValidationRules(entity, name) {
		const propertyDefinition = entity.model.properties[name];
		const rules = [];

		if (propertyDefinition.computed) return rules;

		// Check required attribute
		if (propertyDefinition.hasOwnProperty("required")) {
			let req = getValueOrFunction(propertyDefinition.required, entity);
			if (req) {
				const conditions = [];
				conditions.push((value) => value == null || "Required value");

				rules.push((value) => {
					if (
						value == null ||
						(typeof value === "string" && value.length === 0) ||
						(typeof value === "object" &&
							Array.isArray(value) &&
							value.length === 0) ||
						(typeof value === "object" &&
							value.constructor === Object &&
							Object.keys(value).length === 0)
					)
						return "Required value";
					else return true;
				});
			}
		}

		if (propertyDefinition.type) {
			// Check property type rules
			const propertyType = propertyDefinition.type;

			if (propertyType.rules) rules.push(...propertyType.rules);
		}

		if (propertyDefinition.rules) rules.push(...propertyDefinition.rules);

		return rules;
	}

	// /**
	//  * Rehydrate an entity from its own document
	//  * @param {JSON} document Document
	//  * @param {Namespace} namespace Namespace instance
	//  * @param {String} typeName Name of the type
	//  * @returns {Entity} Entity from the given document
	//  */
	// parseEntity(document, namespace, typeName) {
	// 	const factory = new EntityFactory(namespace, typeName);
	// 	const entity = factory.create();

	// 	entity.import(document);

	// 	return entity;
	// }
}
