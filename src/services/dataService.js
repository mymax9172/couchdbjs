import { checkMandatoryArgument } from "../helpers/tools.js";

export class DataService {
	namespace;
	typeName;

	constructor(namespace, typeName) {
		// Check mandatory arguments
		checkMandatoryArgument("namespace", namespace);
		checkMandatoryArgument("typeName", typeName);

		this.namespace = namespace;
		this.typeName = typeName;
	}

	/**
	 * Create a new entity (in memory)
	 * @returns {Entity} An entity class
	 */
	create() {
		return this.namespace.createEntity(this.typeName);
	}

	/**
	 * Retrieve a document by its own id
	 * @param {string} id ID of the document
	 * @param {object} options Options
	 * @returns {Promise<Entity|Object>} Entity retrieved (or an object with the original document and the entity)
	 */
	async get(id, options) {
		try {
			// Read options
			const opts = {};
			if (options?.revisions) opts.revs_info = true;
			if (options?.attachments) opts.attachments = true;

			// Read the document
			const doc = await this.namespace.database.pouchDb.get(id, opts);

			// Trasform into an entity
			const entity = this.namespace.createEntity(this.typeName);
			entity.import(doc);

			if (options?.original) {
				return {
					doc,
					entity,
				};
			} else return entity;
		} catch (error) {
			console.log(error);
			throw error;
		}
	}

	/**
	 * Save an entity 
	 * @param {Entity} entity Entity to be saved
	 * @returns {Promise<object>} Result of the action
	 */
	async save(entity) {
		// Validation
		try {
			entity.validate();
		} catch (error) {
			throw new Error(
				"Validation error of type " +
					entity.model.typeName +
					" (" +
					entity +
					"): " +
					error
			);
		}

		try {
			// Save it
			const json = entity.export();

			const result = await this.namespace.database.pouchDb.put(json);
			if (result.ok) entity.document._rev = result.rev;

			return result;
		} catch (error) {
			console.error(error);
			return null;
		}
	}

	/**
	 * Save many entities at once
	 * @param {Array<Entity>} entities Entities to be saves
	 * @returns {Promise<Array<object>>} Result of the action
	 */
	async saveAll(entities) {
		if (entities == null || entities.length === 0) return;
		const model = entities[0].model;

		// Validation
		try {
			entities.forEach((entity) => {
				entity.validate;
			});
		} catch (error) {
			throw new Error(
				"Validation error of type " + model.typeName + ": " + error
			);
		}

		try {
			// Save it
			const docs = [];
			entities.forEach((entity) => {
				const json = entity.export();
				docs.push(json);
			});

			const result = await this.namespace.database.pouchDb.bulkDocs(docs);
			result.forEach((resultItem, index) => {
				if (resultItem.ok) entities[index].document._rev = resultItem.rev;
			});
			return result;
		} catch (error) {
			console.error(error);
			return null;
		}
	}

	/**
	 * Delete an entity (logical deletion)
	 * @param {String} id ID of the entity
	 * @returns {Promise<object>} Result of the action
	 */
	async delete(id) {
		const entity = await this.get(id);
		if (entity != null)
			return await this.namespace.database.pouchDb.remove(
				entity.id,
				entity.rev
			);
	}

	// Define an index
	async defineIndex(name, fields) {
		const indexDef = {
			name: name,
			ddoc: name,
			fields: [...fields],
		};
		const result = await this.namespace.database.pouchDb.createIndex(indexDef);
		return result;
	}
}
