import { CouchServer } from "../src/couchServer.js";
import { SampleDb } from "./sampleDb.js";

await test();

async function test() {
	const url = "http://admin:E-digit_26APAlfa!@85.234.131.99:5984";

	// Create a server instance
	const couchDB = new CouchServer(url);

	// Get server info
	const info = await couchDB.getInfo();
	console.info("Server details: ", info);

	// List of databases
	const list = await couchDB.getDatabaseList();
	console.info("Available databases: ", list);

	// Create a new database
	console.info("Database creation ");
	console.info(await couchDB.create("test", SampleDb));

	// Get info about the database
	const db = couchDB.use("test", SampleDb);
	console.info("Database info:", await db.getInfo());

	// Create a new owner
	const owner = db.data.default.owner.create();
	owner.firstName = "Massimiliano";
	owner.lastName = "Agostinoni";
	await owner.save();
	console.info("Owner: ", owner);

	const obj = await db.data.default.owner.get();
	console.info("Read: ", obj);
	console.info("EXPORT", obj.export());

	console.info(await db.data.default.owner.delete());

	// Delete the just created database
	console.info("Database deletion: ", await couchDB.delete("test"));
}
