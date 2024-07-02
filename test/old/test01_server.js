import { CouchServer } from "../../src/database/couchServer.js";
import { SampleDbSchema } from "../sampleDb.js";

import * as chai from "chai";
chai.should();

describe("Server class", function () {
	// Server
	const url = "http://85.234.131.99";
	const port = 5984;

	// Create a server instance
	const server = new CouchServer(url, port, {
		username: "admin",
		password: "E-digit_26APAlfa!",
		token: "Basic YWRtaW46RS1kaWdpdF8yNkFQQWxmYSE=",
	});

	// Test database
	const dbName = "test";

	before(async function () {
		// Check if the database exist, in case delete it
		if (await server.exists(dbName)) {
			await server.delete(dbName);
		}
	});

	// Get server info
	it("getInfo(): Check a proper info object from the server", async function () {
		const info = await server.getInfo();
		info.should.be.a("object").have.property("couchdb");
	});

	// Get all database list names
	it("getDatabaseList(): Check return value is a list of string", async function () {
		const list = await server.getDatabaseList();
		list.should.be.a("array");
	});

	// Create a new database
	it("create(): Create a new database with a proper schema", async function () {
		const result = await server.create(dbName, SampleDbSchema);
		result.should.be.a("object").to.have.property("ok").that.is.true;
	});

	// Use an existing database
	it("use(): Start using a database", async function () {
		const result = await server.use(dbName);
		result.should.be.a("object").to.have.property("name", dbName);
	});

	// Delete an existing database
	it("delete(): Delete an existing database", async function () {
		await server.create("xyz_sample");
		const result = await server.delete("xyz_sample");
		result.should.be.a("object").to.have.property("ok").that.is.true;
	});
});
