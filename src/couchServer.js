import nano from "nano";
import { CouchDatabase } from "./couchDatabase.js";
import { checkMandatoryArgument } from "./helpers/tools.js";
import { coding } from "./helpers/coding.js";
import { Namespace } from "./model/namespace.js";

/**
 * Server class for a CouchDB server
 */
export class CouchServer {
	// Members
	url; // Url address of the server
	nanoServer; // Nano server

	/**
	 * Create a new CouchDB server instance
	 * @param {string} url URL address of the server (including protocoll and port)
	 */
	constructor(url) {
		// Check mandatory arguments
		checkMandatoryArgument("url", url);

		// Store arguments
		this.url = url;

		// Create the server connection
		this.nanoServer = nano(url);
	}

	/**
	 * Provide info about the server instance
	 * @returns {Promise<object>} Info about the server
	 */
	getInfo() {
		return this.nanoServer.info();
	}

	/**
	 * Provide names of all databases
	 * @returns {Promise<array>} List of all database available on the server or null if any error occurred
	 */
	getDatabaseList() {
		return this.nanoServer.db.list();
	}

	/**
	 * Check if a database name exists
	 * @param {String} name Name of the database to check existency
	 * @returns {Boolean} True if the database exists
	 */
	async exists(name) {
		const list = await this.getDatabaseList();
		return list.includes(name);
	}

	/**
	 * Create a new database in the server
	 * @param {string} name Name of the database
	 * @param {JSON} schema Schema of the database
	 */
	async create(name, schema) {
		// Check mandatory arguments
		checkMandatoryArgument("name", name);
		checkMandatoryArgument("schema", schema);

		let rule = "^[a-z][a-z0-9_$()+/-]*$";
		const regEx = new RegExp(rule);
		if (regEx.test(name)) {
			try {
				// Create the CouchDB database
				await this.nanoServer.db.create(name);

				// Connect to the new database
				const nanoDb = this.nanoServer.use(name);

				// Serialize the schema
				const serializedSchema = coding.serialize(schema);
				serializedSchema._id = "$/schema";

				// Store the schema
				await nanoDb.insert(serializedSchema);

				return { ok: true };
			} catch (error) {
				return { ok: false, error: error };
			}
		} else {
			return {
				ok: false,
				error: "Not allowed characters in the database name",
			};
		}
	}

	/**
	 * Delete a database
	 * @param {string} name Name of the database
	 */
	async delete(name) {
		// Check mandatory arguments
		checkMandatoryArgument("name", name);

		return await this.nanoServer.db.destroy(name);
	}

	/**
	 * Retrieve a database instance
	 * @param {string} name Name of the database
	 * @returns {CouchDatabase} CouchDB database class
	 */
	async use(name) {
		// Check mandatory arguments
		checkMandatoryArgument("name", name);

		// Connect to the database
		const nanoDb = this.nanoServer.use(name);

		// Read the stored schema
		const schema = await nanoDb.get("$/schema");

		// Return the Database class
		const database = new CouchDatabase(name, nanoDb);
		database.importSchema(schema);
		return database;
	}

	async testSchema(name, databaseClass) {
		const nanoDb = this.nanoServer.use(name);
		const database = new CouchDatabase(nanoDb);

		// Create schema content
		var createSchema = (databaseClass) => {
			// Create an instance of the database
			const database = this.use(name, databaseClass);
			const schema = {
				_id: "$/schema",
				_rev: undefined,
				name: name,
				namespaces: {},
			};

			Object.keys(database.namespaces).forEach((namespaceKey) => {
				const namespace = database.namespaces[namespaceKey];
				schema.namespaces[namespaceKey] = {};

				Object.keys(namespace.models).forEach((modelKey) => {
					const model = namespace.models[modelKey];
					schema.namespaces[namespaceKey][modelKey] = model;
				});
			});
			return schema;
		};

		// ImportSchema
		var importSchema = (schema) => {
			const database = this.use(name, CouchDatabase);

			Object.keys(schema.namespaces).forEach((namespaceKey) => {
				const namespaceDefinition = schema.namespaces[namespaceKey];
				const namespace = new Namespace();
				namespace.name = namespaceKey;

				Object.keys(namespaceDefinition).forEach((modelKey) => {
					const model = namespaceDefinition[modelKey];
					namespace.name = namespaceKey;
					namespace.useModel(model);
				});

				database.useNamespace(namespace);
			});

			return database;
		};

		const schema = createSchema(databaseClass);
		const doc = coding.serialize(schema);
		doc._id = "$/schema";
		await database.nanoDb.insert(doc);
		//console.dir(doc, { depth: null });

		const doc2 = await database.nanoDb.get(doc._id);
		const schema2 = coding.deserialize(doc2);
		const database2 = importSchema(schema2);

		//console.dir(database2, { depth: 3 });

		const user2 = database2.data.default.user2.create();
		console.log(user2.password);
		// console.log(example2.method("ciao"));
		// console.log(example2.default());
		// console.log(example2.age());
		// console.log(example2.score());
	}
}
