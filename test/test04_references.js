import { CouchServer } from "../src/couchServer.js";
import models, { ExampleDb } from "./sampleModels.js";

import { should, expect } from "chai";
should();

describe("References", function () {
	// Url address
	const url = "http://admin:E-digit_26APAlfa!@85.234.131.99:5984";

	// Create a server instance
	const couchDB = new CouchServer(url);

	// Test database
	const dbName = "test";
	var namespace;
	var db;

	before(async function () {
		// Check if the database exist, in case delete it
		if (await couchDB.exists(dbName)) {
			await couchDB.delete(dbName);
		}

		// Create test database
		await couchDB.create(dbName, ExampleDb);
		db = couchDB.use("test", ExampleDb);
		namespace = db.namespaces["default"];
	});

	it("Empty reference allowed", function () {
		const project = namespace.createEntity(models.model8.typeName);

		expect(() => {
			project.validate();
		}).not.to.throw();
	});

	it("Check if everything but a reference is passed instead of a reference", function () {
		const project = namespace.createEntity(models.model8.typeName);
		const company = namespace.createEntity(models.model6.typeName);

		expect(() => {
			project.company = company;
		}).to.throw();
		expect(() => {
			project.company = 12;
		}).to.throw();
		expect(() => {
			project.company = true;
		}).to.throw();
		expect(() => {
			project.company = {};
		}).to.throw();
		expect(() => {
			project.company = [];
		}).to.throw();
	});

	it("Check when a proper reference is passed", async function () {
		const project = namespace.createEntity(models.model8.typeName);
		const company = namespace.createEntity(models.model6.typeName);
		company.address = "main street";
		await company.save();

		expect(() => {
			project.company = company.id;
		}).not.to.throw();
		await project.save();

		expect(project.company.$value()).to.be.null;
		await project.company.$load();
		expect(project.company.$value()).to.be.not.null;
	});

	it("Check array of references", async function () {
		const project = namespace.createEntity(models.model8.typeName);
		const users = [];
		for (let i = 0; i < 5; i++) {
			const user = namespace.createEntity(models.model4.typeName);
			user.username = "user" + i;
			await user.save();
			users.push(user.id);
		}
		project.authors = users;
		await project.authors[0].$load();
		expect(project.authors[0].$value().id).to.equal(users[0]);
	});

	it("Check relationship", async function () {
		const project = namespace.createEntity(models.model8.typeName);
		await project.save();
		const company = (await db.data.default.company.getAll())[0];
		const projects = await company.getProjects();
		projects.should.have.lengthOf(1);
	});
});
