export class Attachment {
	// Name of the attachment
	name;

	// Entity of the attachment
	entity;

	// Files content
	files = [];

	filters = [];
	size = 0;
	compress = false;
	multiple = false;

	constructor(name, entity) {
		this.name = name;
		this.entity = entity;
	}

	// async load(force = false) {
	// 	if (this.files == null || force) {
	// 		if (!this.multiple) {
	// 			const value =
	// 				await this.entity.namespace.database.nanoDb.attachment.get(
	// 					this.entity.id,
	// 					this.name
	// 				);
	// 			this.value = value;
	// 		}
	// 	}
	// }

	attach(filename, contentType, data) {
		// Check contentTypes
		if (this.filters && !this.filters.includes(contentType))
			throw new Error("Content type not allowed");

		// Check multiple files
		if (!this.multiple && this.files.length > 0)
			throw new Error("Multiple files are not allowed");

		// Content file
		const fileContent = {
			filename,
			contentType,
			data,
		};

		// Store it
		this.files.push(fileContent);
	}

	// Number of attachment stored
	get count() {
		return this.files.length;
	}

	// async get() {
	// 	if (this.files.length === 0) await this.load();

	// 	return this.files;
	// }

	clean() {
		this.files = [];
	}
}
