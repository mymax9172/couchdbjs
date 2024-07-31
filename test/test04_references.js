import { CouchServer } from "../src/database/couchServer.js";
import { Reference } from "../src/model/reference.js";
import { ExampleDbSchema } from "./sampleModels.js";
import "dotenv/config";

import { should, expect } from "chai";
should();

describe("References", function () {
	// Create a server instance
	const server = new CouchServer(process.env.URL, process.env.PORT, {
		username: process.env.USER,
		password: process.env.PASSWORD,
	});

	// Test database
	const dbName = "test";
	var namespace;
	var db;

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

	it("Empty reference not allowed", function () {
		const project = namespace.createEntity("project");
		expect(() => {
			project.validate();
		}).to.throw();
	});

	it("Add a value to a reference (one-to-many)", function () {
		const project = namespace.createEntity("project");
		project.company = "default/company/1";
		expect(project.company).to.be.an.instanceOf(Reference);
	});

	it("Check if everything but a reference is passed ", function () {
		const project = namespace.createEntity("project");
		const company = namespace.createEntity("company");

		expect(() => {
			project.company = company;
		}).not.to.throw();
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
		expect(() => {
			project.company = company.id;
		}).not.to.throw();
	});

	it("Check when a proper reference is passed", async function () {
		const project = namespace.createEntity("project");
		const company = namespace.createEntity("company");
		company.address = "main street";
		await company.save();

		expect(async () => {
			project.company = company.id;
			await project.save();
		}).not.to.throw();

		const c = await project.company.get();
		c.should.not.be.null;

		const projects = await company.getProjectList();
		expect(projects[0].id).to.be.equal(project.id);
	});

	var project;

	it("Many to many relationship", async function () {
		project = namespace.createEntity("project");
		const company = namespace.createEntity("company");

		const authors = [];
		for (let i = 0; i < 5; i++) {
			const author = namespace.createEntity("author");
			author.username = "author " + i;
			authors.push(author);
			await author.save();
		}
		project.authorList = authors;
		project.company = company;
		expect(await project.save()).not.to.throw;
	});

	it("Load entity with references", async function () {
		const p = await db.data.default.project.get(project.id);

		const v1 = (await p.authorList.get())[0].id;
		const v2 = (await project.authorList.get())[0].id;
		expect(v1 === v2).to.be.true;
	});
});
