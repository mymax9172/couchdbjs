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

	async save(entity) {
		// Validate the entity
		const validation = entity.validate();
		if (typeof validation === "string") {
			throw new Error(
				"Validation error of type " +
					this.typeName +
					"(" +
					entity +
					"): " +
					validation
			);
		}

		try {
			// Save it
			const json = JSON.parse(JSON.stringify(entity.export()));
			const result = await this.namespace.database.nanoDb.insert(json);
			if (result.ok) entity.document._rev = result.rev;

			return result;
		} catch (error) {
			console.error(error);
			return null;
		}
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
