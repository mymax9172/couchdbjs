import { EntityFactory } from "./entityFactory.js";
import { Namespace } from "./namespace.js";
import { Reference } from "./reference.js";

export class Entity {
	// Namespace
	namespace;

	// Model
	model;

	// Internal document with values
	document;

	// Relationships
	relationships;

	// Set to true to pause validations
	draft = false;

	/**
	 * Create a new entity
	 * Do not call this method directly, use createEntity method in namespace
	 * @param {Namespace} namespace Namespace of this entity
	 * @param {Model} model Model of the entity
	 */
	constructor(namespace, model) {
		this.namespace = namespace;
		this.model = model;

		this.document = {
			_id: undefined,
			_rev: undefined,
			_deleted: false,
			_attachments: {},
		};

		switch (model.service) {
			case "singleton":
				this.document._id = this.fullTypeName;
				break;

			case "none":
			case "collection":
				this.document._id =
					this.fullTypeName +
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
		return this.document._id;
	}

	/**
	 * REV system property
	 */
	get rev() {
		return this.document._rev;
	}

	/**
	 * Full type name
	 */
	get fullTypeName() {
		return this.namespace.name + "/" + this.model.typeName;
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
	 * Check if the entity is deleted
	 * @returns {boolean} True if the entity has been deleted
	 */
	isDeleted() {
		return this.document._deleted;
	}

	/**
	 * Default string representation of an entity
	 * @returns {string} String representation of an entity
	 */
	toString() {
		if (this.model.toString) return this.model.toString.bind(this)();
		else return this.fullTypeName;
	}

	getRules(propertyName) {
		const factory = new EntityFactory(this.namespace, this.model.typeName);
		return factory.getValidationRules(this, propertyName);
	}

	setDraft(value) {
		this.draft = value;

		const propertyNames = Object.keys(this.model.properties);
		propertyNames.forEach((propertyName) => {
			const propertyDefinition = this.model.properties[propertyName];

			if (propertyDefinition.model) {
				if (propertyDefinition.multiple) {
					this[propertyName].forEach((e) => (e.draft = value));
				} else {
					if (this[propertyName]) this[propertyName].draft = value;
				}
			}
		});
	}

	/**
	 * Validate the content of the entity
	 * @returns {boolean} True if validation passed
	 */
	validate() {
		// Skipped if draft
		if (this.draft) return true;

		const factory = new EntityFactory(this.namespace, this.model.typeName);

		// Check properties
		const propertyNames = Object.keys(this.model.properties);
		propertyNames.forEach((propertyName) => {
			const propertyDefinition = this.model.properties[propertyName];
			const value = this[propertyName];

			if (propertyDefinition.multiple) {
				if (value) {
					// Validation of all elements
					value.forEach((element) => {
						const v = propertyDefinition.reference ? element.id : element;
						factory.validatePropertyValue(v, this, propertyName);
					});
				}
			} else {
				// Validation of one element
				factory.validatePropertyValue(value, this, propertyName);
			}
		});

		// Check relationships
		if (this.document._references) {
			Object.keys(this.document._references).forEach((referenceName) => {
				const reference = this.document._references[referenceName];
				reference.validate();
			});
		}
		return true;
	}

	/**
	 * Import a JSON document
	 * @param {JSON} doc Document to import
	 */
	import(doc) {
		// Standard CouchDB fields
		this.document._id = doc._id;
		this.document._rev = doc._rev;
		this.document._deleted = doc._deleted;

		// Read all model properties
		Object.keys(this.model.properties).forEach((propertyName) => {
			const propertyDefinition = this.model.properties[propertyName];

			// In case of nested object
			if (propertyDefinition.model) {
				var value;
				if (propertyDefinition.multiple) {
					// In case of multiple values, get the inner document for each element
					value = doc[propertyName].map((element) => {
						this.hydrateEntity(propertyDefinition.model, element);
					});
				} else {
					// If it is a model, get the inner document
					value = this.hydrateEntity(
						propertyDefinition.model,
						doc[propertyName]
					);
				}
				this.document[propertyName] = value;
			} else this.document[propertyName] = doc[propertyName];
		});

		// Read all attachment stubs
		if (doc._attachments) {
			const attNames = Object.keys(doc._attachments);
			attNames.forEach((attName) => {
				// Retrieve the attachment name and filename
				const name = attName.split("|")[0];
				const filename = attName.split("|")[1];
				const contentType = doc._attachments[attName].content_type;

				// Get the attachment object
				const attachment = this[name];

				// Define the stub
				attachment.defineStub(filename, contentType);
			});
		}

		// Read all references
		if (this.document._references) {
			Object.keys(this.document._references).forEach((key) => {
				const relationship = Object.values(this.relationships).find(
					(e) => e.rightPropertyName === key || e.leftPropertyName === key
				);
				if (relationship.type === "one-to-many") {
					this.document._references[key] = doc[relationship.rightPropertyName];
				}

				if (relationship.type === "many-to-many") {
					doc[relationship.leftPropertyName].forEach((id) => {
						this.document._references[key].add(id);
					});
				}
			});
		}
	}

	/**
	 * Export a JSON document
	 * @returns {JSON} Json document to be saved in the CouchDB
	 */
	export() {
		var document = {};

		// Standard CouchDB fields
		document._id = this.document._id;
		document._rev = this.document._rev;
		document._delete = this.document._delete;
		document.type = this.fullTypeName;

		Object.keys(this.model.properties).forEach((propertyName) => {
			const propertyDefinition = this.model.properties[propertyName];

			// Skip computed properties
			if (propertyDefinition.computed) return;

			if (propertyDefinition.model) {
				var value;
				if (propertyDefinition.multiple) {
					// In case of multiple values, get the inner document for each element
					value = this.document[propertyName].map((element) => {
						const v = element.export();
						delete v._attachments;
						delete v._rev;
						delete v._deleted;
						return v;
					});
				} else {
					// If it is a model, get the inner document
					if (this.document[propertyName]) {
						value = this.document[propertyName].export();
						delete value._attachments;
						delete value._rev;
						delete value._deleted;
					} else value = null;
				}
				document[propertyName] = value;
			} else document[propertyName] = this.document[propertyName];
		});

		// Attachments
		if (this.document.hasOwnProperty("_attachments")) {
			document._attachments = {};
			// Create attachments
			Object.keys(this.document._attachments).forEach((attName) => {
				const attachment = this.document._attachments[attName];

				attachment.files.forEach((file) => {
					document._attachments[attName + "|" + file.filename] = {
						content_type: file.contentType,
						data: file.data,
					};
				});
			});
		}

		// Relationships
		if (this.document._references) {
			// Create references
			Object.keys(this.document._references).forEach((propertyName) => {
				const reference = this.document._references[propertyName];
				document[propertyName] = reference.data();
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

	/**
	 * Save the document
	 * @returns {Object} Result of the saving action
	 */
	async save() {
		const service = this.namespace.getService(this.model.typeName);
		return await service.save(this);
	}

	/**
	 * Refresh the entity (not saved changes will be lost)
	 */
	async refresh() {
		const service = this.namespace.getService(this.model.typeName);
		const entity = await service.get(this.id);
		Object.assign(this, entity);
	}

	hasAttachments() {
		if (!this.document._attachments) return false;
		return Object.keys(this.document._attachments).length > 0;
	}
}
