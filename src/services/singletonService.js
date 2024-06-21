import { DataService } from "./dataService.js";

export class SingletonService extends DataService {
	async get() {
		const id = this.namespace.name + "/" + this.typeName;

		try {
			// Read the document
			const doc = await this.namespace.database.nanoDb.get(id, {
				revs_info: false,
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

	async exists() {
		const id = this.namespace.name + "/" + this.typeName;

		const headers = await this.namespace.database.nanoDb.head(id);
		return headers.statusCode === 200;
	}

	async delete() {
		const entity = await this.get();
		if (entity != null)
			return await this.namespace.database.nanoDb.destroy(
				entity.id,
				entity.rev
			);
	}
}
