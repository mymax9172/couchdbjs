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

	// async getAttachment(docId, attachmentName) {
	// 	return await this.database.attachment.get(docId, attachmentName);
	// }

	async save(entity) {
		// Validation
		try {
			entity.validate();
		} catch (error) {
			throw new Error(
				"Validation error of type " +
					entity.model.typeName +
					"(" +
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
