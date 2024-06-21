export class Reference {
	id;
	value = null;

	namespace;
	typeName;
	model;
	service;

	constructor(id, namespace, typeName) {
		this.id = id;
		this.namespace = namespace;
		this.typeName = typeName;
		this.model = namespace.models[typeName];
		this.service = namespace.getService(typeName);
	}

	async load(force = false) {
		if (this.value == null || force) {
			const value = await this.service.get(this.id);
			this.value = value;
		}
	}
}

export function createReference(id, namespace, typeName) {
	const reference = new Reference(id, namespace, typeName);
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

			// Clean the rest
			return undefined;
		},
	};

	return new Proxy(reference, handler);
}
