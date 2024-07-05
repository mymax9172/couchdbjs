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
