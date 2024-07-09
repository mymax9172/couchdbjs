import { Entity } from "./entity.js";

export class Reference {
	id = null;
	value = null;

	namespace;
	typeName;
	required;

	model;
	service;

	constructor(namespace, typeName, required) {
		this.namespace = namespace;
		this.typeName = typeName;
		this.required = required;

		this.model = this.namespace.getModel(typeName);
		this.service = this.namespace.getService(typeName);

		if (this.model.service === "none")
			throw new Error(
				"Coulnd't create a reference to a non persisted entity (service = none)"
			);
	}

	set(value) {
		if (value instanceof Entity) {
			this.id = value.id;
			this.value = value;
		} else {
			const id = value;
			if (typeof id !== "string")
				throw new Error("Invalid id - not a string, " + id);

			if (this.required && (id == null || id.length === 0))
				throw new Error("Id is required");
			const s = id.split("/");
			if (this.model.service === "singleton" && s.length != 2)
				throw new Error("Invalid id for singleton service type, " + id);
			if (this.model.service === "collection" && s.length != 3)
				throw new Error("Invalid id for collecton service type, " + id);
			if (s[0] !== this.namespace.name)
				throw new Error("Invalid id with wrong namespace, " + id);
			if (s[1] !== this.typeName)
				throw new Error("Invalid id with wrong typename, " + id);

			this.id = id;
			this.value = null;
		}
	}

	get() {
		return this.value;
	}

	data() {
		return this.id;
	}

	async load(force = false) {
		if (this.value == null || force) {
			const value = await this.service.get(this.id);
			this.value = value;
		}
	}

	validate() {
		if (this.required && (this.id == null || this.id.length === 0))
			throw new Error("Id is required");
	}
}

export class ReferenceList {
	references = [];

	namespace;
	typeName;
	required;

	constructor(namespace, typeName, required) {
		this.namespace = namespace;
		this.typeName = typeName;
		this.required = required;
	}

	add(entity) {
		var id, value;

		if (entity instanceof Entity) {
			id = entity.id;
			value = entity;
		} else {
			id = entity;
			value = null;
		}

		if (this.references.find((e) => e.id === id) != null)
			throw new Error("Duplication error in the list, " + id);

		const reference = new Reference(
			this.namespace,
			this.typeName,
			this.required
		);
		reference.id = id;
		reference.value = value;
		this.references.push(reference);
	}

	remove(entity) {
		var id;

		if (entity instanceof Entity) id = entity.id;
		else id = entity;

		if (this.references.find((e) => e.id === id) == null)
			throw new Error("This id does not exist, " + id);

		this.references = this.references.filter((e) => e.id != id);
	}

	get() {
		return this.references;
	}

	data() {
		return this.references.map((e) => e.id);
	}

	validate() {
		if (
			this.required &&
			(this.references == null || this.references.length === 0)
		)
			throw new Error("At least one reference is required");
	}
}
