export class Reference {
	id = null;
	value = null;

	namespace;
	typeName;
	model;
	service;

	required;

	constructor(namespace, typeName, required) {
		this.namespace = namespace;
		this.typeName = typeName;
		this.required = required;

		this.model = this.namespace.getModel(typeName);
		this.service = this.namespace.getService(typeName);
	}

	setId(id) {
		if (typeof id !== "string")
			throw new Error("Invalid id - not a string, " + id);

		if (this.required && (id == null || id.length === 0))
			throw new Error("Id is required");
		const s = id.split("/");
		if (this.model.singleton && s.length != 2)
			throw new Error("Invalid id - singleton, " + id);
		if (!this.model.singleton && s.length != 3)
			throw new Error("Invalid id, collecton" + id);
		if (s[0] !== this.namespace.name)
			throw new Error("Invalid id - wrong namespace, " + id);
		if (s[1] !== this.typeName)
			throw new Error(
				"Invalid id -  wrong typename, " + id + " " + s[1] + "," + this.typeName
			);

		this.id = id;
		this.value = null;
	}

	async load(force = false) {
		if (this.value == null || force) {
			const value = await this.service.get(this.id);
			this.value = value;
		}
	}
}

export function createReference(namespace, typeName, required) {
	const reference = new Reference(namespace, typeName, required);
	const handler = {
		get(target, prop) {
			// ID is reported as it is
			if (prop === "id") return target.id;

			// Any other property part of the model of the target...
			if (Object.keys(target.model.properties).includes(prop)) {
				// Load in case it is not yet
				if (target.value == null)
					throw new Error("Load data before accessing it");
				return target.value[prop];
			}

			if (prop === "$load") {
				return async function (...args) {
					await target.load(args);
				};
			}

			if (prop === "$value") {
				return function () {
					return target.value;
				};
			}

			if (prop === "$required") {
				return target.required;
			}

			if (prop === "$isProxy") return true;

			// Clean the rest
			return undefined;
		},
		set(target, prop, value) {
			// ID is reported as it is
			if (prop === "id") {
				target.setId(value);
				return true;
			}
			return false;
		},
	};

	return new Proxy(reference, handler);
}

export class ReferenceArray {
	references = [];

	namespace;
	typeName;
	required;

	constructor(namespace, typeName, required) {
		this.namespace = namespace;
		this.typeName = typeName;
		this.required = required;
	}

	add(id) {
		if (this.references.find((e) => e.id === id) != null)
			throw new Error("This id already exists, " + id);
		const reference = createReference(
			this.namespace,
			this.typeName,
			this.required
		);
		reference.id = id;
		this.references.push(reference);
	}

	remove(id) {
		if (this.references.find((e) => e.id === id) == null)
			throw new Error("This id does not exist, " + id);
		this.references = this.references.filter((e) => e.id != id);
	}

	value() {
		return this.references.map((e) => e.id);
	}
}
