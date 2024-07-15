import { Entity } from "./entity.js";

export class Reference {
	id = null; // ID for the reference
	entity = null; // Inner entity

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

	/**
	 * Return the inner entity
	 * @returns {Entity} Inner entity of the reference
	 */
	async get() {
		if (this.id == null) return null;
		if (this.entity == null) this.entity = await this.service.get(this.id);
		return this.entity;
	}

	/**
	 * Set the reference item
	 * @param {[String, Entity]} value Reference id or entity
	 */
	set(value) {
		// Clear the inner entity
		this.entity = null;

		// Null value
		if (value == null) this.id = null;
		else {
			const { id, entity } = checkID(
				value,
				this.model.service,
				this.namespace.name,
				this.typeName
			);
			this.id = id;
			this.entity = entity;
		}
	}

	validate() {
		if (this.required && (this.id == null || this.id.length === 0))
			throw new Error("Id is required");
	}
}

export class ReferenceList {
	idList = [];
	entityList = [];

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

	/**
	 * Return all inner entities
	 * @returns {Array<Entity>} Inner entities of the reference list
	 */
	async getAll() {
		if (this.idList.length === 0) return [];
		for (let i = 0; i < this.entityList.length; i++) {
			if (this.entityList[i] == null)
				this.entityList[i] = await this.service.get(this.idList[i]);
		}

		return this.entityList;
	}

	/**
	 * Return an inner entities
	 * @returns {Array<Entity>} Inner entities of the reference list
	 */
	async get(id) {
		const i = this.idList.indexOf(id);
		if (i === -1) throw new Error("Id " + id + " not found in the list");
		if (this.entityList[i] == null)
			this.entityList[i] = await this.service.get(this.idList[i]);
		return this.entityList[i];
	}

	/**
	 * Set the internal array
	 * @param {Array<String|Entity>} values Arrays of ids or entities
	 */
	set(values) {
		// Clear the inner entity
		this.entityList = [];

		// Null value
		if (values == null) this.idList = [];
		else if (!Array.isArray(values)) {
			throw new Error("Expected array of id or entities");
		} else {
			values.forEach((value) => {
				const { id, entity } = checkID(
					value,
					this.model.service,
					this.namespace.name,
					this.typeName
				);
				this.idList.push(id);
				this.entityList.push(entity);
			});
		}
	}

	/**
	 * Add a new reference to the list
	 * @param {[String, Entity]} value Reference id or entity
	 */
	add(value) {
		if (value == null) throw new Error("Null value are not valid Id");

		const { id, entity } = checkID(
			value,
			this.model.service,
			this.namespace.name,
			this.typeName
		);
		this.idList.push(id);
		this.entityList.push(entity);
	}

	/**
	 * Remove a reference from the list
	 * @param {[String, Entity]} value Reference to remove
	 */
	remove(value) {
		var id;

		if (value instanceof Entity) id = value.id;
		else id = value;

		// Check existence
		const i = this.idList.indexOf(id);
		if (i === -1) throw new Error("This id " + id + " does not exist");

		this.idList.splice(i, 1);
		this.entityList.splice(i, 1);
	}

	validate() {
		if (this.required && this.idList.length === 0)
			throw new Error("At least one reference is required");
	}
}

function checkID(value, serviceModel = "none", namespaceName, typeName) {
	if (value instanceof Entity) {
		return {
			id: value.id,
			entity: value,
		};
	} else {
		// Check if id is correct
		if (typeof value !== "string")
			throw new Error("Invalid id - not a string, " + value);

		const s = value.split("/");
		// Check the format
		if (serviceModel === "singleton" && s.length != 2)
			throw new Error("Invalid id for singleton service type, " + value);
		if (serviceModel === "collection" && s.length != 3)
			throw new Error("Invalid id for collecton service type, " + value);

		// Check the namespace and typename
		if (s[0] !== namespaceName)
			throw new Error(
				"Id with wrong namespace, expected " + namespaceName + " got " + s[0]
			);
		if (s[1] !== typeName)
			throw new Error(
				"Id with wrong typename, expected " + typeName + " got " + s[1]
			);

		return {
			id: value,
			entity: null,
		};
	}
}
