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

	async getAttachment(docId, attachmentName) {
		return await this.database.attachment.get(docId, attachmentName);
	}

	async save(entity) {
		// Validation
		try {
			entity.validate();
		} catch (error) {
			throw new Error(
				"Validation error of type " +
					this.typeName +
					"(" +
					entity +
					"): " +
					error
			);
		}

		try {
			// Save it
			const json = JSON.parse(JSON.stringify(entity.export()));
			const result = await this.namespace.database.nanoDb.insert(json);
			if (result.ok) entity.document._rev = result.rev;

			return result;
		} catch (error) {
			console.error(error);
			return null;
		}
	}
}
