class AttachmentFile {
	filename;
	contentType;
	stub;
	data;
	attachment;

	constructor(attachment, filename, contentType, data) {
		this.attachment = attachment;
		this.filename = filename;
		this.contentType = contentType;
		if (data) {
			this.data = data;
			this.stub = false;
		} else {
			this.stub = true;
		}
	}

	async getData() {
		if (this.stub) {
			const id = this.attachment.name + "|" + this.filename;
			this.data =
				await this.attachment.entity.namespace.database.pouchDb.getAttachment(
					this.attachment.entity.id,
					id
				);
			this.stub = false;
		}
		return this.data;
	}
}

export class Attachment {
	// Name of the attachment
	name;

	// Entity of the attachment
	entity;

	// Attachment files
	files = [];

	filters = [];
	size = 0;
	compress = false;
	multiple = false;
	limit = 0;

	constructor(name, entity) {
		this.name = name;
		this.entity = entity;
	}

	refresh() {
		this.files.forEach((file) => {
			file.data = null;
			file.stub = true;
		});
	}

	getStub(filename) {
		return this.files.find((e) => e.filename === filename);
	}

	defineStub(filename, contentType) {
		// Check contentTypes
		if (this.filters && !this.filters.includes(contentType))
			throw new Error("Content type not allowed");

		// Check multiple files
		if (!this.multiple && this.files.length > 0)
			throw new Error("Multiple files are not allowed");

		// Check limits
		if (this.multiple && this.files.length === this.limit)
			throw new Error("Limit available reached");

		// Check if already exists
		if (this.getStub(filename) != null)
			throw new Error("File stub already exists");

		// Create a stub file
		this.files.push(new AttachmentFile(this, filename, contentType));
	}

	load(filename, data) {
		// Check if a stub already exists
		const file = this.getStub(filename);
		if (file == null) throw new Error("Create a stub file first");

		// Check the size
		if (this.size > 0 && data.length > this.size * 1000) {
			throw new Error("File size is too big");
		}

		// Turn the file in an existing file
		file.stub = false;
		file.data = data;
	}

	add(filename, contentType, data) {
		// Create a stub
		this.defineStub(filename, contentType);

		// Load the file
		this.load(filename, data);
	}

	remove(filename) {
		// Check if a stub already exists
		const file = this.getStub(filename);
		if (file == null) throw new Error("Couldn't remove a non existing file");

		// Remove it
		this.files = this.files.filter((e) => e.filename != filename);
	}

	// Number of attachment stored
	get count() {
		return this.files.length;
	}

	clean() {
		this.files = [];
	}
}
