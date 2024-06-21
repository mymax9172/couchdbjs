import { DataService } from "./dataService.js";

export class CollectionService extends DataService {
	async get(id) {
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

	async exists(id) {
		const headers = await this.namespace.database.nanoDb.head(id);
		return headers.statusCode === 200;
	}

	async getAll() {}
	async getSome(ids) {}

	async delete(id) {}

	async find(query) {}
	async findOne(query) {}
	async explain(query) {}
}
