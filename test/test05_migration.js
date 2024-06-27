import { CouchServer } from "../src/database/couchServer.js";
import { Migration } from "../src/database/migration.js";
import { SampleDbSchema } from "./sampleDb.js";

import { should, expect } from "chai";
should();

class Migration1to2 extends Migration {
	constructor(database) {
		super(database);

		this.fromVersion = 1;
		this.toVersion = 2;
	}

	async onUpgrade() {
		const actions = [];

		const result = await this.addProperty("default", "user", "score", 10);
		if (result.error) throw new Error(result.error);
		else actions.push(result);

		return actions;
	}

	async onDowngrade() {
		const actions = [];

		const result = await this.removeProperty("default", "user", "score");
		if (result.error) throw new Error(result.error);
		else actions.push(result);

		return actions;
	}
}

const userModel = {
	typeName: "user",
	singleton: false,
	properties: {
		firstName: {},
		lastName: {},
		fullName: {
			computed() {
				return this.firstName + " " + this.lastName;
			},
		},
	},
};

const schema2 = {
	version: 2,

	namespaces: {
		default: [userModel],
	},
};

describe("Migrations", function () {
	// Url address
	const url = "http://admin:E-digit_26APAlfa!@85.234.131.99:5984";

	// Create a server instance
	const server = new CouchServer(url);

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
		await server.create(dbName, SampleDbSchema);
		db = await server.use(dbName);
		namespace = db.namespaces["default"];
	});

	// Create entities
	it("Create content", async function () {
		for (let i = 0; i < 10; i++) {
			const user = db.data.default.user.create();
			user.firstName = "Massimiliano";
			user.lastName = "User " + i;
			await user.save();
		}
	});

	// Upgrade
	it("Upgrade to version 2", async function () {
		const migration = new Migration1to2(db);
		await migration.up(schema2);
	});

	// Downgrade
	it("Downgrade to version 1", async function () {
		const migration = new Migration1to2(db);
		await migration.down(SampleDbSchema);
	});
});
