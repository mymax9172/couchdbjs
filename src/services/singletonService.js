import { DataService } from "./dataService.js";

export class SingletonService extends DataService {
	async get(options) {
		const id = this.namespace.name + "/" + this.typeName;

		return await super.get(id, options);
	}

	async delete() {
		const id = this.namespace.name + "/" + this.typeName;
		return await super.delete(id);
	}
}
