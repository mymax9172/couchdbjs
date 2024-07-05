import { CouchServer } from "../src/database/couchServer.js";
import { ExampleDbSchema } from "./sampleModels.js";
import * as fs from "fs";
import "dotenv/config";

import { should, expect } from "chai";
should();

describe("Attachments", function () {
	// Create a server instance
	const server = new CouchServer(process.env.URL, process.env.PORT, {
		username: process.env.USER,
		password: process.env.PASSWORD,
	});

	// Test database
	const dbName = "test";
	var namespace;
	var db;
	var id;

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

	it("Create a single attachment", async function () {
		const contract = db.data.default.contract.create();
		const data = fs.readFileSync("./test/assetts/text.txt", "utf8");
		contract.legalDocument.add("text.txt", "text/plain", btoa(data));
		await contract.save();
		id = contract.id;
	});

	it("Read a single attachment", async function () {
		const contract = await db.data.default.contract.get(id);
		const file = contract.legalDocument.files[0];
		const data = await file.getData();
		fs.writeFileSync("./test/assetts/text2.txt", data);
		await contract.save();
	});

	it("Save multiple attachments", async function () {
		const contract = db.data.default.contract.create();
		const data = fs.readFileSync("./test/assetts/text.txt", "utf8");
		contract.annexes.add("text.txt", "text/plain", btoa(data));
		contract.annexes.add("text2.txt", "text/plain", btoa(data));
		await contract.save();
	});

	it("Check limits in multiple attachments", async function () {
		const contract = db.data.default.contract.create();
		const data = fs.readFileSync("./test/assetts/text.txt", "utf8");
		contract.annexes.add("text.txt", "text/plain", btoa(data));
		contract.annexes.add("text2.txt", "text/plain", btoa(data));

		expect(() => {
			contract.annexes.add("text3.txt", "text/plain", btoa(data));
		}).to.throw();
	});

	it("Check size limit", async function () {
		const contract = db.data.default.contract.create();
		const data = fs.readFileSync("./test/assetts/text.txt", "utf8");

		expect(() => {
			contract.tiny.add("text.txt", "text/plain", btoa(data));
		}).to.throw();
	});
});
