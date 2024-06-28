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
			console.log("***", json);

			if (json._attachments["text.txt"]) {
				json._attachments["text2.txt"] = json._attachments["text.txt"];
			}

			const result = await this.namespace.database.nanoDb.insert(json);
			if (result.ok) entity.document._rev = result.rev;

			// Save attachments
			const attNames = Object.keys(entity.attachments);
			for (let index = 0; index < attNames.length; index++) {
				const attachment = entity.attachments[attNames[index]];

				for (let i = 0; i < attachment.files.length; i++) {
					const fileContent = attachment.files[i];

					const result = await this.namespace.database.nanoDb.attachment.insert(
						entity.id,
						fileContent.filename,
						fileContent.data,
						fileContent.contentType,
						{ rev: entity.rev }
					);
					if (result.ok) entity.document._rev = result.rev;
				}
			}

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
			index: { fields: fields },
		};
		const result = await this.namespace.database.nanoDb.createIndex(indexDef);
		return result;
	}
}
