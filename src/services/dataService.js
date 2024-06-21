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
}
