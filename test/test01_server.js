import { CouchServer } from "../src/couchServer.js";
import { SampleDb } from "./sampleDb.js";

import * as chai from "chai";
chai.should();

describe("Server class", function () {
	// Url address
	const url = "http://admin:E-digit_26APAlfa!@85.234.131.99:5984";
	// Create a server instance
	const couchDB = new CouchServer(url);
	// Test database
	const dbName = "test";
	before(async function () {
		// Check if the database exist, in case delete it
		if (await couchDB.exists(dbName)) {
			await couchDB.delete(dbName);
		}
	});
	after(async function () {
		// Remove test database
		await couchDB.delete(dbName);
	});
	// Get server info
	it("getInfo(): Check a proper info object from the server", async function () {
		const info = await couchDB.getInfo();
		info.should.be.a("object").have.property("couchdb");
	});
	// Get all database list names
	it("getDatabaseList(): Check return value is a list of string", async function () {
		const list = await couchDB.getDatabaseList();
		list.should.be.a("array");
	});
	// Create a schema-less database
	it("create(): Create a new database without any schema", async function () {
		const result = await couchDB.create(dbName);
		result.should.be.a("object").to.have.property("ok").that.is.true;
	});
	// Delete an existing database
	it("delete(): Delete an existing database", async function () {
		const result = await couchDB.delete(dbName);
		result.should.be.a("object").to.have.property("ok").that.is.true;
	});
	// Create a schema-based database
	it("create(): Create a new database with a proper schema", async function () {
		const result = await couchDB.create(dbName, SampleDb);
		result.should.be.a("object").to.have.property("ok").that.is.true;
		result.should.be.a("object").to.have.property("schema");
	});
});
