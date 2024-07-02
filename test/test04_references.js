import { CouchServer } from "../src/database/couchServer.js";
import { Reference } from "../src/model/reference.js";
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

		expect(() => {
			project.company = company.id;
		}).not.to.throw();
		await project.save();

		expect(project.company.$value()).to.be.null;
		await project.company.$load();
		expect(project.company.$value()).to.be.not.null;

		//console.log(company);
		const projects = await company.getCompanyProjects();
		expect(projects[0].id).to.be.equal(project.id);
	});

	it("Right side detailed definition", async function () {
		const project = namespace.createEntity("project");
		const company = namespace.createEntity("company");
		company.address = "main street";
		await company.save();

		expect(() => {
			project.company = company.id;
			project.organization = company.id;
			project.validate();
		}).not.to.throw();
		await project.save();
	});

	it("Many to many relationship", async function () {
		const project = namespace.createEntity("project");
		const company = namespace.createEntity("company");
		for (let i = 0; i < 5; i++) {
			const user = namespace.createEntity("user");
			user.username = "user" + i;
			await user.save();
			project.userList.add(user.id);
		}
		project.company = company.id;

		expect(project.validate()).not.to.throw;
	});
});
