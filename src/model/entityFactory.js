import { Entity } from "./entity.js";
import {
	checkMandatoryArgument,
	getValueOrFunction,
	validateRule,
} from "../helpers/tools.js";
import { security } from "../helpers/security.js";

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
				const propertyType = new propertyDefinition.type();
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
				const propertyType = new propertyDefinition.type();
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
				if (propertyDefinition.multiple) return [];
				else return undefined;
			}
		}

		if (
			!propertyDefinition.computed
			//propertyDefinition.type != "attachment"
		) {
			const defaultValue = getDefault(propertyDefinition);
			writeValue(defaultValue);
		}

		const factory = this;

		// Define getters and setters
		Object.defineProperty(entity, name, {
			// Getter
			get() {
				// // Check if for this property 'get' is allowed
				// if (propertyDefinition.type === "attachment") {
				// 	throw new Error("Couldn't read a value from a file type property");
				// }

				// Check if property is computed
				if (propertyDefinition.computed) {
					return propertyDefinition.computed.bind(entity)();
				} else {
					const value = readValue(entity.document[name]);

					// If it is a model, recreate the entity
					if (propertyDefinition.model) {
						const namespace = propertyDefinition.namespace
							? propertyDefinition.namespace()
							: factory.namespace;
						const eFactory = new EntityFactory(
							namespace,
							propertyDefinition.model.typeName
						);
						const entity = eFactory.create();
						entity.import(value);
						return entity;
					} else return value;
				}
			},

			// Setter
			set(value) {
				let updValue = value;
				let readonly = false;

				if (propertyDefinition.hasOwnProperty("readonly"))
					readonly = getValueOrFunction(propertyDefinition.readonly, entity);

				// Check if for this property 'set' is allowed
				if (
					propertyDefinition.computed ||
					readonly
					// propertyDefinition.type === "attachment"
				) {
					throw new Error(
						"Couldn't assign a value to a computed/readonly property"
					);
				}

				// if (propertyDefinition.type === "entity") {
				// 	if (propertyDefinition.array) {
				// 		if (value == null) updValue = [];
				// 		else {
				// 			updValue = [];
				// 			value.forEach((el) => {
				// 				updValue.push(el.getDocument());
				// 			});
				// 		}
				// 	} else {
				// 		if (value) updValue = value.getDocument();
				// 		else updValue = null;
				// 	}
				// }

				// Validate
				if (propertyDefinition.multiple) {
					updValue.forEach((element) => {
						factory.validateProperty(element, entity, propertyDefinition);
					});
				} else {
					factory.validateProperty(updValue, entity, propertyDefinition);
				}

				// If it is a model, get the inner document
				if (propertyDefinition.model) {
					updValue = updValue.export();
				}

				// Store value
				writeValue(updValue);
			},
		});
	}

	// Validate an assignment
	validateProperty(value, entity, propertyDefinition) {
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
		if (value != null) {
			// Check if value is an entity
			if (propertyDefinition.model) {
				if (
					value.constructor.name != "Entity" ||
					!value.model ||
					value.model.typeName != propertyDefinition.model.typeName
				)
					throw new Error(
						"Model mismatch, expected " + propertyDefinition.model.typeName
					);

				value.validate();
			} else {
				// Check property type rules
				if (propertyDefinition.type) {
					const propertyType = new propertyDefinition.type();
					const result = propertyType.validate(value);
					if (typeof result === "string")
						throw new Error("Invalid value: " + result);
				}

				// Check property rules
				if (propertyDefinition.rules && propertyDefinition.rules.length > 0) {
					const result = validateRule(value, propertyDefinition.rules, entity);
					if (typeof result === "string")
						throw new Error("Invalid value: " + result);
				}
			}
		}
	}
}
