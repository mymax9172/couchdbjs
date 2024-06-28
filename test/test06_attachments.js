import { CouchServer } from "../src/database/couchServer.js";
import { ExampleDbSchema } from "./sampleModels.js";
import * as fs from "fs";

import { should, expect } from "chai";
should();

describe("Attachments", function () {
	// Url address
	const url = "http://admin:E-digit_26APAlfa!@85.234.131.99:5984";

	// Create a server instance
	const server = new CouchServer(url);

	// Test database
	const dbName = "test";
	var namespace;
	var db;
	var id;

	before(async function () {
		// Check if the database exist, in case delete it
		if (await server.exists(dbName)) {
			await server.delete(dbName);
		}

		// Create test database
		await server.create(dbName, ExampleDbSchema);
		db = await server.use(dbName);
		namespace = db.namespaces["default"];
	});

	it("Create a single attachment", async function () {
		const contract = db.data.default.contract.create();
		const data = fs.readFileSync("./test/assetts/text.txt", "utf8");
		contract.legalDocument.attach("text.txt", "text/plain", data);
		await contract.save();
		id = contract.id;
	});

	it("Read a single attachment", async function () {
		const contract = await db.data.default.contract.get(id);
		await contract.save();
	});
});
