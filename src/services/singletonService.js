import { DataService } from "./dataService.js";

export class SingletonService extends DataService {
	async get() {
		const id = this.namespace.name + "/" + this.typeName;

		try {
			// Read the document
			const doc = await this.namespace.database.pouchDb.get(id, {
				revs_info: true,
			});

			// Trasform into an entity
			const entity = this.namespace.createEntity(this.typeName);
			entity.import(doc);
			return entity;
		} catch (error) {
			console.log(error);
			return null;
		}
	}

	async delete() {
		const entity = await this.get();
		if (entity != null)
			return await this.namespace.database.pouchDb.remove(
				entity.id,
				entity.rev
			);
	}
}
