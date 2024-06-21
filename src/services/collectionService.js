import { DataService } from "./dataService.js";

export class CollectionService extends DataService {
	async get(id) {}
	async getAll() {}
	async getSome(ids) {}

	async save(obj) {}
	async delete(id) { }
	
	async find(query) {}
	async findOne(query) {}
	async explain(query) {}
}
