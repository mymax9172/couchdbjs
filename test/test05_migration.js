import { CouchServer } from "../src/database/couchServer.js";
import {
	Migration,
	StandardMigrationActions,
} from "../src/database/migration.js";
import { SampleDbSchema } from "./sampleDb.js";
import "dotenv/config";

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

		const addPropertyAction = new StandardMigrationActions.addProperty(
			this.database
		);
		const result = await addPropertyAction.run("default", "user", "score", 10);
		if (result.error) throw new Error(result.error);
		else actions.push(result.log);

		return actions;
	}

	async onDowngrade() {
		const actions = [];

		const removePropertyAction = new StandardMigrationActions.removeProperty(
			this.database
		);

		const result = await removePropertyAction.run("default", "user", "score");
		if (result.error) throw new Error(result.error);
		else actions.push(result.log);

		return actions;
	}
}

class Migration1to1 extends Migration {
	constructor(database) {
		super(database);

		this.fromVersion = 1;
		this.toVersion = 1;
	}

	async onUpgrade() {
		const actions = [];

		const updatePropertyAction = new StandardMigrationActions.updateProperty(
			this.database
		);
		const result = await updatePropertyAction.run(
			"default",
			"user",
			"lastName",
			(e) => e + " changed"
		);
		if (result.error) throw new Error(result.error);
		else actions.push(result.log);

		return actions;
	}
}

const userModel = {
	typeName: "user",
	service: "collection",
	properties: {
		firstName: {},
		lastName: {},
		score: {},
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
		default: { title: "default", decription: "default", models: [userModel] },
	},
};

describe("Migrations", function () {
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

	// Massive modification
	it("Update data without changing version", async function () {
		const migration = new Migration1to1(db);
		await migration.up();
	});
});
