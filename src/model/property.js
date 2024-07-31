import { getValueOrFunction } from "../helpers/tools.js";
import { security } from "../helpers/security.js";

export class Property {
	entity;

	name;

	title;
	description;
	default;

	model;
	computed;
	required;

	type;
	readonly;

	hashed;
	encrypted;

	rules = [];

	multiple;
	value;

	afterRead(value) {
		return value;
	}

	// Executed before writing a value onto the document (Before transformation done by the optional type class)
	beforeWrite(value) {
		return value;
	}

	// String formatted
	toString() {}

	constructor(entity, propertyDefinition) {
		this.entity = entity;
		this.name = propertyDefinition.name;
		this.title = propertyDefinition.title;
		this.description = propertyDefinition.description;
		if (propertyDefinition.default) this.default = propertyDefinition.default;
		if (propertyDefinition.computed)
			this.computed = propertyDefinition.computed;
		this.required = propertyDefinition.required || false;
		this.readonly = propertyDefinition.readonly || false;
		this.hashed = propertyDefinition.hashed || false;
		this.encypted = propertyDefinition.encypted || false;
		if (propertyDefinition.type) {
			if (!entity._definition.namespace.database.types[propertyDefinition.type])
				throw new Error(
					"Type " + propertyDefinition.type + " not defined in this schema"
				);
			this.type =
				entity._definition.namespace.database.types[propertyDefinition.type];
		}
		this.model = propertyDefinition.model;
		if (propertyDefinition.rules && propertyDefinition.rules.length > 0)
			this.rules = propertyDefinition.rules;
		this.multiple = propertyDefinition.multiple || false;

		if (propertyDefinition.beforeWrite)
			this.beforeWrite = propertyDefinition.beforeWrite;

		if (propertyDefinition.afterRead)
			this.afterRead = propertyDefinition.afterRead;

		if (propertyDefinition.toString)
			this.toString = propertyDefinition.toString;
		else if (this.type?.toString) this.toString = this.type.toString;

		// Initial value
		if (!this.computed) {
			// Default value
			if (this.default) {
				// Retrieve the default value
				this.set(getValueOrFunction(this.default));
			} else {
				// Default value is not defined
				if (this.multiple) this.value = [];
				else this.value = null;
			}
		}

		// Store
		entity._content.properties[this.name] = this;
	}

	// Internal function to write a value to the inner document
	set(value) {
		// Check if it is readonly
		if (this.readonly) {
			if (getValueOrFunction(this.readonly, this.entity)) {
				// Only the default value is allowed
				if (value != getValueOrFunction(this.default))
					throw new Error("Couldn't assign a value to a readonly property");
			}
		}

		// Check if for this property writing is allowed
		if (this.computed)
			throw new Error("Couldn't assign a value to a computed property");

		// Check if an array has been assigned
		if (Array.isArray(value) && !this.multiple) {
			throw new Error(
				"Couldn't assign an array when multiple values are not allowed"
			);
		}
		if (!Array.isArray(value) && this.multiple) {
			throw new Error(
				"Couldn't assign a single value when multiple values are required"
			);
		}

		let updatedValue = value;

		if (this.beforeWrite) updatedValue = this.beforeWrite(updatedValue);

		// Check if a property type is defined
		if (this.type?.beforeWrite)
			updatedValue = this.type.beforeWrite(updatedValue);

		// Check if it must be decrypted or hashed
		if (this.encrypted) updatedValue = security.encryption(updatedValue);
		else if (this.hashed) updatedValue = security.hash(updatedValue);

		this.value = updatedValue;
	}

	// Internal function to read a value from the inner document
	get() {
		let updatedValue;

		// Check if computed
		if (this.computed) updatedValue = this.computed.bind(this.entity)();
		else updatedValue = this.value;

		// Nothing to do if the value has been hashed
		if (this.hashed) return updatedValue;

		// Decrypt the value if encrypted
		if (this.encrypted) updatedValue = security.decryption(updatedValue);

		// Check trasformations
		if (this.type?.afterRead) updatedValue = this.type.afterRead(updatedValue);

		if (this.afterRead) {
			updatedValue = this.afterRead(updatedValue);
		}

		return updatedValue;
	}

	// Internal function to get the default value
	getDefault() {
		if (this.default) {
			// Retrive the default value
			return getValueOrFunction(this.default);
		} else {
			// Default value is not defined
			if (this.multiple) return [];
			else return null;
		}
	}
}
