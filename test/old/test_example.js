import { CouchServer } from "../../src/couchServer.js";
import { ExampleDb } from "../sampleModels.js";

import * as chai from "chai";
chai.should();

describe("Example", function () {
	// Url address
	const url = "http://admin:E-digit_26APAlfa!@85.234.131.99:5984";
	// Create a server instance
	const couchDB = new CouchServer(url);
	// Test database
	const dbName = "aa_example";

	before(async function () {
		// Check if the database exist, in case delete it
		if (await couchDB.exists(dbName)) {
			await couchDB.delete(dbName);
		}
	});

	// Test
	it("test", async function () {
		const result = await couchDB.create(dbName);
		await couchDB.testSchema(dbName, ExampleDb);
	});
});
