import { Entity } from "../src/model/entity.js";
import { Namespace } from "../src/model/namespace.js";
import models from "./sampleModels.js";

import { should, expect } from "chai";
should();

describe("Entity class", function () {
	var namespace;

	beforeEach(function () {
		namespace = new Namespace();
		namespace.name = "test";
	});

	after(async function () {});

	it("Use of a model in a namespace", function () {
		namespace.useModel(models.model1);
		namespace.models.should.have.key(models.model1.typeName);
	});

	it("Use of static default property", function () {
		const model = models.model1;
		namespace.useModel(model);
		const entity = namespace.createEntity(model.typeName);
		entity.should.have.property("password", "welcome1a");
	});

	it("Use of dynamic default property", function () {
		const model = models.model2;
		namespace.useModel(model);
		const entity = namespace.createEntity(model.typeName);
		entity.should.have.property("password", "password");
	});

	it("Read a computed property", function () {
		const model = models.model2;
		namespace.useModel(model);
		const entity = namespace.createEntity(model.typeName);
		entity.should.have.property("identifier", "pwd/password");
	});

	it("Use a PropertyType to capitilize texts", function () {
		const model = models.model2;
		namespace.useModel(model);
		const entity = namespace.createEntity(model.typeName);
		entity.lastName = "Sullivan";
		entity.should.have.property("lastName", "Doc. SULLIVAN");
	});

	it("Use a PropertyType to check format of a zipcode", function () {
		const model = models.model3;
		namespace.useModel(model);
		const entity = namespace.createEntity(model.typeName);
		entity.zipCode = "20100";
	});

	it("Check a readonly property with rules in the property definition type", function () {
		const model = models.model3;
		namespace.useModel(model);
		const entity = namespace.createEntity(model.typeName);
		entity.should.have.property("guid", "11111111");
		expect(() => {
			entity.guid = "123";
		}).to.throw();
	});

	it("Check a property with rules", function () {
		const model = models.model3;
		namespace.useModel(model);
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
		namespace.useModel(model);
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
		namespace.useModel(model);
		const entity = namespace.createEntity(model.typeName);
		entity.should.have.property(
			"password",
			"fd479f8219295f5e91efb4e90a3f29fb6e59c2f4a71238a4f596bb7da1b4add1"
		);
	});

	it("Write and read an encypted value", function () {
		const model = models.model4;
		namespace.useModel(model);
		const entity = namespace.createEntity(model.typeName);
		entity.taxCode = "mdm76567";
		entity.should.have.property("taxCode", "mdm76567");
	});

	it("Write and read an encypted integer value", function () {
		const model = models.model4;
		namespace.useModel(model);
		const entity = namespace.createEntity(model.typeName);
		entity.age = 127;
		entity.should.have.property("age", 127);
	});

	it("Write and read a number with enforced type check", function () {
		const model = models.model5;
		namespace.useModel(model);
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
		namespace.useModel(model);
		const entity = namespace.createEntity(model.typeName);
		entity.should.have.property("addresses").that.has.lengthOf(0);
		entity.addresses = ["Rome", "Milan"];
		entity.should.have.property("addresses").that.has.lengthOf(2);
	});

	it("Write and read an array of string with numbers", function () {
		const model = models.model5;
		namespace.useModel(model);
		const entity = namespace.createEntity(model.typeName);
		expect(() => {
			entity.addresses = [10, 20];
		}).to.throw();
	});

	it("Use nested object", function () {
		const model = models.model6;
		namespace.useModel(model);
		const entity = namespace.createEntity(model.typeName);
		expect(() => {
			entity.address = {
				street: "main street",
				number: "10",
			};
		}).not.to.throw();
	});

	it("Use nested entity with a wrong type", function () {
		namespace.useModel(models.model6);
		namespace.useModel(models.model4);

		const entity = namespace.createEntity(models.model6.typeName);
		expect(() => {
			entity.user = { name: "max" };
		}).to.throw();
	});

	it("Use nested entity with a proper type", function () {
		namespace.useModel(models.model6);
		namespace.useModel(models.model4);

		const entity = namespace.createEntity(models.model6.typeName);
		const user = namespace.createEntity(models.model1.typeName);
		expect(() => {
			entity.user = user;
		}).not.to.throw();
		entity.user.should.be.an.instanceof(Entity);
	});
});
