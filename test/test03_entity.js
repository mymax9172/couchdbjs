import { CouchServer } from "../src/database/couchServer.js";
import { Entity } from "../src/model/entity.js";
import { ExampleDbSchema } from "./sampleModels.js";
import "dotenv/config";

import { should, expect } from "chai";
should();

describe("Entity class", function () {
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

	after(async function () {});

	it("Use of static default property", function () {
		const entity = namespace.createEntity("user1");
		entity.should.have.property("password", "welcome1a");
	});

	it("Use of dynamic default property", function () {
		const entity = namespace.createEntity("user2");
		entity.should.have.property("password", "password");
	});

	it("Read a computed property", function () {
		const entity = namespace.createEntity("user2");
		entity.should.have.property("identifier", "pwd/password");
	});

	it("Use a multiple property", function () {
		const entity = namespace.createEntity("user2");
		entity.zips.push("lallo");
		expect(() => entity.validate()).to.throw();
	});

	it("Use a PropertyType to capitilize texts", function () {
		const entity = namespace.createEntity("user2");
		entity.lastName = "Sullivan";
		entity.should.have.property("lastName", "Doc. SULLIVAN");
	});

	it("Use a PropertyType to check format of a zipcode", function () {
		const entity = namespace.createEntity("contact");
		entity.zipCode = "20100";
		entity.city = "LA";
		expect(() => entity.validate()).not.to.throw();
	});

	it("Check a readonly property with rules in the property definition type", function () {
		const entity = namespace.createEntity("contact");
		entity.should.have.property("guid", "11111111");
		expect(() => {
			entity.guid = "123";
		}).to.throw();
	});

	it("Check a property with rules", function () {
		const entity = namespace.createEntity("contact");
		entity.city = "Los Angeles";
		expect(() => {
			entity.address = "main Street";
			entity.validate();
		}).to.throw();
		expect(() => {
			entity.address = "street Main";
			entity.validate();
		}).not.to.throw();
	});

	it("Check a required property", function () {
		const entity = namespace.createEntity("contact");
		expect(() => {
			entity.city = "Valid value";
			entity.validate();
		}).not.to.throw();
		expect(() => {
			entity.city = null;
			entity.validate();
		}).to.throw();
		expect(() => {
			entity.city = "";
			entity.validate();
		}).to.throw();
		expect(() => {
			entity.city = [];
			entity.validate();
		}).to.throw();
		expect(() => {
			entity.city = {};
			entity.validate();
		}).to.throw();
	});

	it("Store a hashed password", function () {
		const entity = namespace.createEntity("user");
		entity.should.have.property(
			"password",
			"fd479f8219295f5e91efb4e90a3f29fb6e59c2f4a71238a4f596bb7da1b4add1"
		);
	});

	it("Write and read an encypted value", function () {
		const entity = namespace.createEntity("user");
		entity.taxCode = "mdm76567";
		entity.should.have.property("taxCode", "mdm76567");
	});

	it("Write and read an encypted integer value", function () {
		const entity = namespace.createEntity("user");
		entity.age = 127;
		entity.should.have.property("age", 127);
	});

	it("Write and read a number with enforced type check", function () {
		const entity = namespace.createEntity("house");
		expect(() => {
			entity.balance = "acme";
			entity.validate();
		}).to.throw();
		expect(() => {
			entity.balance = -1000;
			entity.validate();
		}).not.to.throw();
		expect(() => {
			entity.active = "acme";
			entity.validate();
		}).to.throw();
		expect(() => {
			entity.active = true;
			entity.validate();
		}).not.to.throw();
		expect(() => {
			entity.age = 0.5;
			entity.validate();
		}).to.throw();
		expect(() => {
			entity.age = 20;
			entity.validate();
		}).not.to.throw();
		entity.birthday = new Date("2000-12-31");
		entity.should.have.property("birthday").that.is.a("date");
	});

	it("Write and read an array of string", function () {
		const entity = namespace.createEntity("house");
		entity.should.have.property("addresses").that.has.lengthOf(0);
		entity.addresses = ["Rome", "Milan"];
		entity.should.have.property("addresses").that.has.lengthOf(2);
	});

	it("Write and read an array of string with numbers", function () {
		const entity = namespace.createEntity("house");
		expect(() => {
			entity.addresses = [10, 20];
			entity.validate();
		}).to.throw();
	});

	it("Use nested javascript object", function () {
		const entity = namespace.createEntity("house");
		expect(() => {
			entity.estateInfo = {
				street: "main street",
				number: "10",
			};
			entity.validate();
		}).not.to.throw();
	});

	it("Use nested entity with a wrong type", function () {
		const entity = namespace.createEntity("house");
		expect(() => {
			entity.owner = { name: "max" };
			entity.validate();
		}).to.throw();
	});

	it("Use nested entity with a proper type", function () {
		const house = namespace.createEntity("house");
		const user = namespace.createEntity("user1");
		expect(() => {
			house.user = user;
			house.validate();
		}).not.to.throw();
		house.user.should.be.an.instanceof(Entity);
	});

	it("Manage nested property as array", function () {
		const house = namespace.createEntity("house");
		const owners = [];
		for (let i = 0; i < 5; i++) {
			const owner = namespace.createEntity("user1");
			owner.username = "owner " + i;
			owners.push(owner);
		}
		expect(() => {
			house.coOwners = owners;
			house.validate();
		}).not.to.throw();
		house.coOwners[0].should.be.an.instanceof(Entity);
	});

	it("Control nested value in an array", function () {
		const house = namespace.createEntity("house");
		const owners = [];
		for (let i = 0; i < 5; i++) {
			const owner = namespace.createEntity("user2");
			owner.username = "owner " + i;
			owners.push(owner);
		}
		expect(() => {
			house.coOwners = owners;
			house.validate();
		}).to.throw();
	});
});
