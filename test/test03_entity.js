import { CouchServer } from "../src/couchServer.js";
import { Entity } from "../src/model/entity.js";
import models, { ExampleDb } from "./sampleModels.js";

import { should, expect } from "chai";
should();

describe("Entity class", function () {
	// Url address
	const url = "http://admin:E-digit_26APAlfa!@85.234.131.99:5984";

	// Create a server instance
	const couchDB = new CouchServer(url);

	// Test database
	const dbName = "test2";
	var namespace;
	var db;

	before(async function () {
		// Check if the database exist, in case delete it
		if (await couchDB.exists(dbName)) {
			await couchDB.delete(dbName);
		}

		// Create test database
		await couchDB.create(dbName);
		db = couchDB.use(dbName, ExampleDb);
		namespace = db.namespaces["default"];
	});

	after(async function () {});

	it("Use of static default property", function () {
		const model = models.model1;
		const entity = namespace.createEntity(model.typeName);
		entity.should.have.property("password", "welcome1a");
	});

	it("Use of dynamic default property", function () {
		const model = models.model2;
		const entity = namespace.createEntity(model.typeName);
		entity.should.have.property("password", "password");
	});

	it("Read a computed property", function () {
		const model = models.model2;
		const entity = namespace.createEntity(model.typeName);
		entity.should.have.property("identifier", "pwd/password");
	});

	it("Use a PropertyType to capitilize texts", function () {
		const model = models.model2;
		const entity = namespace.createEntity(model.typeName);
		entity.lastName = "Sullivan";
		entity.should.have.property("lastName", "Doc. SULLIVAN");
	});

	it("Use a PropertyType to check format of a zipcode", function () {
		const model = models.model3;
		const entity = namespace.createEntity(model.typeName);
		entity.zipCode = "20100";
	});

	it("Check a readonly property with rules in the property definition type", function () {
		const model = models.model3;
		const entity = namespace.createEntity(model.typeName);
		entity.should.have.property("guid", "11111111");
		expect(() => {
			entity.guid = "123";
		}).to.throw();
	});

	it("Check a property with rules", function () {
		const model = models.model3;
		const entity = namespace.createEntity(model.typeName);
		expect(() => {
			entity.address = "main Street";
		}).to.throw();
		expect(() => {
			entity.address = "street Main";
		}).not.to.throw();
	});

	it("Check a required property", function () {
		const model = models.model3;
		const entity = namespace.createEntity(model.typeName);
		expect(() => {
			entity.city = "Valid value";
		}).not.to.throw();
		expect(() => {
			entity.city = null;
		}).to.throw();
		expect(() => {
			entity.city = "";
		}).to.throw();
		expect(() => {
			entity.city = [];
		}).to.throw();
		expect(() => {
			entity.city = {};
		}).to.throw();
	});

	it("Store a hashed password", function () {
		const model = models.model4;
		const entity = namespace.createEntity(model.typeName);
		entity.should.have.property(
			"password",
			"fd479f8219295f5e91efb4e90a3f29fb6e59c2f4a71238a4f596bb7da1b4add1"
		);
	});

	it("Write and read an encypted value", function () {
		const model = models.model4;
		const entity = namespace.createEntity(model.typeName);
		entity.taxCode = "mdm76567";
		entity.should.have.property("taxCode", "mdm76567");
	});

	it("Write and read an encypted integer value", function () {
		const model = models.model4;
		const entity = namespace.createEntity(model.typeName);
		entity.age = 127;
		entity.should.have.property("age", 127);
	});

	it("Write and read a number with enforced type check", function () {
		const model = models.model5;
		const entity = namespace.createEntity(model.typeName);
		expect(() => {
			entity.balance = "acme";
		}).to.throw();
		expect(() => {
			entity.balance = -1000;
		}).not.to.throw();
		expect(() => {
			entity.active = "acme";
		}).to.throw();
		expect(() => {
			entity.active = true;
		}).not.to.throw();
		expect(() => {
			entity.age = 0.5;
		}).to.throw();
		expect(() => {
			entity.age = 20;
		}).not.to.throw();
		entity.birthday = new Date("2000-12-31");
		entity.should.have.property("birthday").that.is.a("date");
	});

	it("Write and read an array of string", function () {
		const model = models.model5;
		const entity = namespace.createEntity(model.typeName);
		entity.should.have.property("addresses").that.has.lengthOf(0);
		entity.addresses = ["Rome", "Milan"];
		entity.should.have.property("addresses").that.has.lengthOf(2);
	});

	it("Write and read an array of string with numbers", function () {
		const model = models.model5;
		const entity = namespace.createEntity(model.typeName);
		expect(() => {
			entity.addresses = [10, 20];
		}).to.throw();
	});

	it("Use nested object", function () {
		const model = models.model6;
		const entity = namespace.createEntity(model.typeName);
		expect(() => {
			entity.address = {
				street: "main street",
				number: "10",
			};
		}).not.to.throw();
	});

	it("Use nested entity with a wrong type", function () {
		const entity = namespace.createEntity(models.model6.typeName);
		expect(() => {
			entity.user = { name: "max" };
		}).to.throw();
	});

	it("Use nested entity with a proper type", function () {
		const company = namespace.createEntity(models.model6.typeName);
		const user = namespace.createEntity(models.model4.typeName);
		expect(() => {
			company.user = user;
		}).not.to.throw();
		company.user.should.be.an.instanceof(Entity);
	});

	it("Manage nested property as array", function () {
		const entity = namespace.createEntity(models.model6.typeName);
		const users = [];
		for (let i = 0; i < 5; i++) {
			const user = namespace.createEntity(models.model4.typeName);
			user.username = "user" + i;
			users.push(user);
		}
		expect(() => {
			entity.managers = users;
		}).not.to.throw();
		entity.managers[0].should.be.an.instanceof(Entity);
	});

	it("Control nested value in an array", function () {
		const entity = namespace.createEntity(models.model6.typeName);
		const users = [];
		for (let i = 0; i < 5; i++) {
			const user = {};
			user.username = "user" + i;
			users.push(user);
		}
		expect(() => {
			entity.managers = users;
		}).to.throw();
	});

	it("Deep hierarchy of entities", function () {
		const organization = namespace.createEntity(models.model7.typeName);
		const company = namespace.createEntity(models.model6.typeName);
		const managers = [];
		for (let i = 0; i < 5; i++) {
			const user = namespace.createEntity(models.model4.typeName);
			user.username = "manager " + i;
			managers.push(user);
		}
		company.managers = managers;
		expect(() => {
			organization.company = company;
		}).not.to.throw();
		organization.company.managers[0].should.be.an.instanceof(Entity);
	});
});
