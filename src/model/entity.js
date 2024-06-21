import { EntityFactory } from "./entityFactory.js";
import { Namespace } from "./namespace.js";

export class Entity {
	// Namespace
	namespace;

	// Model
	model;

	// Internal document
	document;

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

		if (model.singleton) {
			this.document._id = this.fullTypeName;
		} else {
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

	/**
	 * Validate the content of the entity
	 * @returns {boolean} True if validation passed
	 */
	validate() {
		const factory = new EntityFactory(this.namespace, this.model.typeName);

		const propertyNames = Object.keys(this.model.properties);
		propertyNames.forEach((propertyName) => {
			const propertyDefinition = this.model.properties[propertyName];

			const result = factory.validateProperty(
				this[propertyName],
				this,
				propertyDefinition
			);
			if (typeof result === "string") throw new Error(result);
		});
		return true;
	}

	/**
	 * Import a JSON document
	 * @param {JSON} doc Document to import
	 */
	import(doc) {
		Object.keys(doc).forEach((key) => {
			this.document[key] = doc[key];
		});
	}

	/**
	 * Export a JSON document
	 * @returns {JSON} Json document to be saved in the CouchDB
	 */
	export() {
		return this.document;
	}

	/**
	 * Save the document
	 * @returns {Object} Result of the saving action
	 */
	async save() {
		const service = this.namespace.getService(this.model.typeName);
		return await service.save(this);
	}
}
