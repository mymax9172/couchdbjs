import { CouchServer } from "../src/database/couchServer.js";
import { ExampleDbSchema } from "./sampleModels.js";

import { should, expect } from "chai";
should();

describe("References", function () {
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

	it("Empty reference allowed", function () {
		const project = namespace.createEntity("project");

		expect(() => {
			project.validate();
		}).not.to.throw();
	});

	it("Check if everything but a reference is passed instead of a reference", function () {
		const project = namespace.createEntity("project");
		const company = namespace.createEntity("company");

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
		const project = namespace.createEntity("project");
		const company = namespace.createEntity("company");
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
		const project = namespace.createEntity("project");
		const users = [];
		for (let i = 0; i < 5; i++) {
			const user = namespace.createEntity("user");
			user.username = "user" + i;
			await user.save();
			users.push(user.id);
		}
		project.authors = users;
		await project.authors[0].$load();
		expect(project.authors[0].$value().id).to.equal(users[0]);
	});

	it("Check relationship", async function () {
		const project = namespace.createEntity("project");
		await project.save();
		const company = (await db.data.default.company.getAll())[0];
		const projects = await company.getProjects();
		projects.should.have.lengthOf(1);
	});
});
