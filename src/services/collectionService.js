import { DataService } from "./dataService.js";

export class CollectionService extends DataService {
	async getAll() {
		try {
			var result = await this.namespace.database.pouchDb.allDocs({
				include_docs: true,
				startkey: this.namespace.name + "/" + this.typeName + "/",
				endkey: this.namespace.name + "/" + this.typeName + "/\ufff0",
			});
			if (result.rows.length == 0) return [];

			return result.rows.map((row) => {
				const entity = this.namespace.createEntity(this.typeName);
				entity.import(row.doc);
				return entity;
			});
		} catch (error) {
			console.log(error);
			throw error;
		}
	}

	async getSome(ids) {
		try {
			var result = await this.namespace.database.pouchDb.allDocs({
				include_docs: true,
				keys: ids,
			});

			if (result.rows.length == 0) return [];

			return result.rows.map((row) => {
				const entity = this.namespace.createEntity(this.typeName);
				entity.import(row.doc);
				return entity;
			});
		} catch (error) {
			console.log(error);
			throw error;
		}
	}

	async find(query, pagination) {
		let limit;
		let page;
		let skip;
		var result;

		if (pagination != null) {
			limit = pagination.size || 25;
			page = pagination.page || 0;
			skip = page * limit;

			result = await this.namespace.database.pouchDb.find({
				selector: {
					_id: { $regex: this.namespace.name + "/" + this.typeName + "/" },
					...query,
				},
				limit,
				skip,
			});
		} else {
			result = await this.namespace.database.pouchDb.find({
				selector: {
					_id: { $regex: this.namespace.name + "/" + this.typeName + "/" },
					...query,
				},
			});
		}

		if (result.warning) console.log(result.warning);
		if (result.docs.length == 0) return [];
		else {
			return result.docs.map((doc) => {
				const entity = this.namespace.createEntity(this.typeName);
				entity.import(doc);
				return entity;
			});
		}
	}

	async findOne(query) {
		const result = await this.namespace.database.pouchDb.find({
			selector: {
				_id: { $regex: this.namespace.name + "/" + this.typeName + "/" },
				...query,
			},
			limit: 1,
		});
		if (result.docs.length === 0) {
			return null;
		} else {
			const entity = this.namespace.createEntity(this.typeName);
			entity.import(result.docs[0]);
			return entity;
		}
	}

	async explain(query) {
		return await this.namespace.database.pouchDb.explain({
			selector: {
				_id: { $regex: this.namespace.name + "/" + this.typeName + "/" },
				...query,
			},
		});
	}

	// Return referenced value from a property
	async getRelated(relatedType, propertyName, id, operator) {
		const option = {};
		if (operator) {
			option[propertyName] = {};
			option[propertyName][operator] = id;
		} else {
			option[propertyName] = id;
		}

		return await this.find(relatedType, option);
	}
}
