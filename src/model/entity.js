import {
	checkMandatoryArgument,
	getValueOrFunction,
	checkRules,
} from "../helpers/tools.js";
import { EntityFactory } from "./entityFactory.js";
import { Namespace } from "./namespace.js";
import { Reference } from "./reference.js";

export class Entity {
	type;

	// Content
	_content = {
		draft: false,
		couchdb: {
			_id: undefined,
			_rev: undefined,
			_deleted: false,
		},
		properties: {},
		attachments: {},
		references: {},
	};

	// Definition
	_definition = {
		namespace: null,
		model: null,
		relationships: {},
	};

	/**
	 * Create a new entity
	 * Do not call this method directly, use createEntity method in namespace
	 * @param {Namespace} namespace Namespace of this entity
	 * @param {Model} model Model of the entity
	 */
	constructor(namespace, model) {
		checkMandatoryArgument("namespace", namespace);
		checkMandatoryArgument("model", model);

		this._definition.namespace = namespace;
		this._definition.model = model;

		this.type = namespace.name + "/" + model.typeName;

		// Unique id
		switch (model.service) {
			case "singleton":
				this._content.couchdb._id = this.type;
				break;

			case "none":
			case "collection":
				this._content.couchdb._id =
					this.type +
					"/" +
					Date.now() +
					"-" +
					String(Math.floor(Math.random() * 1000)).padStart(4, "0");
		}
	}

	/**
	 * ID system property
	 * */
	get id() {
		return this._content.couchdb._id;
	}

	/**
	 * REV system property
	 */
	get rev() {
		return this._content.couchdb._rev;
	}

	/**
	 * DELETED system property
	 */
	get deleted() {
		return this._content.couchdb._deleted;
	}

	/**
	 * Full type name (including namespace name)
	 */
	get type() {
		return (
			this._definition.namespace.name + "/" + this._definition.model.typeName
		);
	}

	/**
	 * Key part of the id
	 */
	get key() {
		const splitId = this.id.split("/");
		if (splitId.length === 2) return "";
		else return splitId[2];
	}

	/**
	 * Check if this entity has attachments
	 * @returns {Boolean} True if one or more attachment are stored
	 */
	get hasAttachments() {
		const keys = Object.keys(this._content.attachments);
		let count = 0;
		keys.forEach((key) => {
			const attachment = this._content.attachments[key];
			count += attachment.files.length;
		});
		return count > 0;
	}

	get draft() {
		return this._content.draft;
	}

	set draft(value) {
		// Set the new draft status
		this._content.draft = value;
	}

	/**
	 * Default string representation of an entity
	 * @returns {string} String representation of an entity
	 */
	toString() {
		if (this._definition.model.toString)
			return this._definition.model.toString.bind(this)();
		else return (this._definition.model.title || this.type) + ":" + this.key;
	}

	//#region JSON management

	/**
	 * Import a JSON document
	 * @param {JSON} doc Document to import
	 */
	import(doc) {
		function importSingleProperty(property, value) {
			// Null if it is null
			if (value == null) return value;

			// Check if it is a sub-entity
			if (property.model) {
				const namespaceName = property.model.split("/")[0];
				const namespace =
					property.entity._definition.namespace.database.namespaces[
						namespaceName
					];
				const typename = property.model.split("/")[1];

				const factory = new EntityFactory(namespace, typename);
				const subEntity = factory.create();
				subEntity.import(value);
				return subEntity;
			} else {
				return value;
			}
		}

		// Check type
		if (doc.type && doc.type != this.type)
			throw new Error(
				"Expected document of type " + this.type + " got " + doc.type
			);

		// Standard CouchDB fields
		if (doc._id) this._content.couchdb._id = doc._id;
		if (doc._rev) this._content.couchdb._rev = doc._rev;
		if (doc._deleted) this._content.couchdb._deleted = doc._deleted;

		// Draft
		if (doc.draft) this._content.draft = doc.draft;

		// Read all properties
		Object.values(this._content.properties).forEach((property) => {
			// Skip if the doc does not have that value (ignore without error)
			if (!doc[property.name]) return;

			// Get the property definition
			const value = doc[property.name];

			// Check if multiple values are allowed
			if (property.multiple) {
				property.set(
					doc[property.name].map((value) =>
						importSingleProperty(property, value)
					)
				);
			} else {
				property.set(importSingleProperty(property, value));
			}
		});

		// Read all attachment stubs
		if (doc._attachments) {
			const attNames = Object.keys(doc._attachments);

			attNames.forEach((attName) => {
				// Retrieve the attachment name and filename
				const name = attName.split("|")[0];
				const filename = attName.split("|")[1];
				const contentType = doc._attachments[attName].content_type;
				const size = doc._attachments[attName].length;

				// Check if attachment name exists (else ignore the attachment)
				if (this[name]) {
					// Get the attachment object
					const attachment = this[name];

					// Define the stub
					attachment.defineStub(filename, contentType, size);
				}
			});
		}

		// Read all references
		if (this._content.references) {
			Object.keys(this._content.references).forEach((key) => {
				const relationship = this._definition.relationships[key];
				const propertyName =
					relationship.left.propertyName || relationship.right.propertyName;
				this._content.references[key].set(doc[propertyName]);
			});
		}
	}

	/**
	 * Export a JSON document
	 * @returns {JSON} Json document to be saved in the CouchDB
	 */
	export() {
		function exportSingleProperty(property, value) {
			// Return Null if null
			if (!value) return value;

			// Check if it is a subentity
			if (property.model) {
				const exportedSubEntity = value.export();
				delete exportedSubEntity._attachments;
				delete exportedSubEntity._rev;
				delete exportedSubEntity._deleted;
				return exportedSubEntity;
			} else {
				return value;
			}
		}

		// Result document
		var document = {};

		// Standard CouchDB fields
		document._id = this._content.couchdb._id;
		document._rev = this._content.couchdb._rev;
		document._deleted = this._content.couchdb._deleted;

		// Type document
		document.type = this.type;

		// Draft document
		if (this.draft) document.draft = true;

		// Map all properties (including sub-entities)
		Object.values(this._content.properties).forEach((property) => {
			// Skip computed properties
			if (property.computed) return;

			// Check if multiple values are allowed
			if (property.multiple) {
				document[property.name] = property.value.map((value) =>
					exportSingleProperty(property, value)
				);
			} else {
				document[property.name] = exportSingleProperty(
					property,
					property.value
				);
			}
		});

		// Relationships
		if (Object.keys(this._content.references).length > 0) {
			// Create references
			Object.keys(this._content.references).forEach((referenceName) => {
				const reference = this._content.references[referenceName];

				// Retrieve the property name
				const relationship = this._definition.relationships[referenceName];
				const propertyName =
					relationship.left.propertyName || relationship.right.propertyName;

				if (reference instanceof Reference)
					document[propertyName] = reference.id;
				else {
					document[propertyName] = reference.idList;
				}
			});
		}
		// Attachments
		if (this.hasAttachments) {
			document._attachments = {};

			// Create attachments
			Object.keys(this._content.attachments).forEach((attachmentName) => {
				const attachment = this._content.attachments[attachmentName];

				attachment.files.forEach((file) => {
					document._attachments[attachmentName + "|" + file.filename] = {
						content_type: file.contentType,
						data: file.data,
					};
				});
			});
		}

		return document;
	}

	hydrateEntity(typeName, doc) {
		const namespaceName = typeName.split("/")[0];
		const namespace = this.namespace.database.namespaces[namespaceName];
		const typename = typeName.split("/")[1];

		const factory = new EntityFactory(namespace, typename);
		const entity = factory.create();
		if (doc) entity.import(doc);
		return entity;
	}

	//#endregion

	//#region Database actions

	/**
	 * Save the document
	 * @returns {Object} Result of the saving action
	 */
	async save() {
		const service = this._definition.namespace.getService(
			this._definition.model.typeName
		);
		return await service.save(this);
	}

	/**
	 * Refresh the entity (not saved changes will be lost)
	 */
	async refresh() {
		const service = this._definition.namespace.getService(
			this._definition.model.typeName
		);
		const entity = await service.get(this.id);
		Object.assign(this, entity);
	}

	//#endregion

	//#region Validations

	/**
	 * Validate the content of the entity
	 */
	validate() {
		// Property validation
		Object.values(this._content.properties).forEach((property) => {
			// Current value to be validated
			const value = property.value;

			if (property.multiple) {
				if (value) {
					// Validation of all elements
					value.forEach((element) => {
						this.validateProperty(property, element);
					});
				}
			} else {
				// Validation of one element
				this.validateProperty(property, value);
			}
		});

		// Attachment validations
		if (this._definition.model.attachments) {
			Object.keys(this._definition.model.attachments).forEach(
				(attachmentName) => {
					// Current attachment to be validated
					const attachment = this[attachmentName];

					// Validate it
					this.validateAttachment(attachment);
				}
			);
		}

		// References validations
		Object.keys(this._content.references).forEach((referenceName) => {
			// Current reference to be validated
			const value = this._content.references[referenceName];

			// Validate it
			value.validate();
		});

		// Overall rules
		if (this._definition.model.rules) {
			const result = checkRules(this, this._definition.model.rules, this);
			if (typeof result === "string") throw new Error(result);
		}
	}

	/**
	 * Validate a property value
	 * @param {*} value Value to be validated
	 * @param {String} name Name of the property
	 * @param {Object} propertyDefinition Definition of the property
	 */
	validateProperty(property, value) {
		// Check required attribute
		if (property.required) {
			let req = getValueOrFunction(property.required, this);
			if (req) {
				if (value == null)
					throw new Error(
						"Missing required value, null or undefined " + property.name
					);

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

		// If null it is ok (not required)
		if (value == null) return;

		// Check if value is supposed to be a sub-entity
		if (property.model) {
			// Check sub-entity type
			if (
				!value.constructor.name.endsWith("Entity") ||
				!value._definition.model ||
				value._definition.namespace.name != property.model.split("/")[0] ||
				value._definition.model.typeName != property.model.split("/")[1]
			) {
				throw new Error("Model mismatch, expected " + property.model);
			}
			value.validate();
		} else {
			// Static values

			// Exclude models
			if (value.constructor?.name.endsWith("Entity"))
				throw new Error("Not expected an entity");

			if (property.type) {
				// Check property type rules
				const propertyType = property.type;

				if (propertyType.rules && propertyType.rules.length > 0) {
					const result = checkRules(value, propertyType.rules, this);
					if (typeof result === "string")
						throw new Error("Invalid value: " + result);
				}
			}

			// Check property rules
			if (property.rules && property.rules.length > 0) {
				const result = checkRules(value, property.rules, this);
				if (typeof result === "string")
					throw new Error("Invalid value: " + result);
			}
		}
	}

	/**
	 * Validate an attachment
	 * @param {Attachment} attachment Attachment to be validated
	 */
	validateAttachment(attachment) {
		// Check requirement
		let req = getValueOrFunction(attachment.required, this);
		if (req) {
			if (attachment.files.length === 0)
				throw new Error(
					"Missing required value attachment, " + attachment.name
				);
		}
	}

	/**
	 * Return all rules applicable to a specific property
	 * @param {String} propertyName Name of the property
	 */
	getValidationRules(propertyName) {
		const rules = [];

		const propertyDefinition = this._definition.model.properties[propertyName];

		// Skip computed property
		if (propertyDefinition.computed) return rules;

		// Check required attribute
		if (propertyDefinition.required) {
			let req = getValueOrFunction(propertyDefinition.required, this);
			if (req) {
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

		// Check rules on property type
		if (propertyDefinition.type) {
			// Check property type rules
			const propertyType = propertyDefinition.type;

			if (propertyType.rules) rules.push(...propertyType.rules);
		}

		// Rule on property
		if (propertyDefinition.rules) rules.push(...propertyDefinition.rules);

		return rules;
	}

	//#endregion
}
