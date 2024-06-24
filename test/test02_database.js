import { CouchServer } from "../src/couchServer.js";
import { SampleDb } from "./sampleDb.js";

import * as chai from "chai";
chai.should();

describe("Database class", function () {
	// Url address
	const url = "http://admin:E-digit_26APAlfa!@85.234.131.99:5984";
	// Create a server instance
	const couchDB = new CouchServer(url);
	// Test database
	const dbName = "test";
	var db;
	before(async function () {
		// Check if the database exist, in case delete it
		if (await couchDB.exists(dbName)) {
			await couchDB.delete(dbName);
		}
		// Create test database
		await couchDB.create(dbName, SampleDb);
		db = couchDB.use("test", SampleDb);
	});
	after(async function () {
		// Remove test database
		//await couchDB.delete(dbName);
	});

	// Get database info
	it("getInfo(): Check a proper info object from the database", async function () {
		const info = await db.getInfo();
		info.should.be.a("object").have.property("db_name").that.is.equal(dbName);
	});

	// Create a new singleton entity
	it("create(): Create a new singleton entity from model", async function () {
		const owner = db.data.default.owner.create();
		owner.firstName = "Massimiliano";
		owner.lastName = "Agostinoni";
		owner
			.export()
			.should.be.a("object")
			.have.property("_id")
			.that.is.equal("default/owner");
	});

	// Save a singleton entity
	it("save(): Save a singleton entity", async function () {
		const owner = db.data.default.owner.create();
		owner.firstName = "Massimiliano";
		owner.lastName = "Agostinoni";
		const result = await owner.save();
		result.should.be
			.a("object")
			.have.property("id")
			.that.is.equal("default/owner");
	});

	// Read a singleton entity
	it("get(): Read the previuos created singleton entity", async function () {
		const owner = await db.data.default.owner.get();
		owner.should.be
			.a("object")
			.have.property("id")
			.that.is.equal("default/owner");
	});

	// Delete a singleton entity
	it("delete(): Delete the previuos created singleton entity", async function () {
		const result = await db.data.default.owner.delete();
		result.should.be.a("object").to.have.property("ok").that.is.true;
	});

	// Save and read a collection of entities
	it("getAll(): get all 3 entities", async function () {
		for (let i = 0; i < 3; i++) {
			const user = await db.data.default.user.create();
			user.firstName = "User " + i;
			user.lastName = "Unknown";
			await user.save();
		}
		const list = await db.data.default.user.getAll();
		list.should.have.lengthOf(3);
		//console.log(list);
	});

	// Find an entity by query
	it("find(): get just one user", async function () {
		const user = await db.data.default.user.findOne({
			firstName: "User 1",
		});
		user.should.be.a("object").to.have.property("firstName", "User 1");
	});
});
