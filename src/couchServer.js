import nano from "nano";
import { CouchDatabase } from "./couchDatabase.js";
import { checkMandatoryArgument } from "./helpers/tools.js";
import { coding } from "./helpers/coding.js";
import { Namespace } from "./model/namespace.js";

/**
 * Server class for a CouchDB server
 */
export class CouchServer {
	// Url address of the server
	url;

	// Nano server
	nanoServer;

	// Configuration
	config = {
		secretKey: "AGw89hDFFxz1",
	};

	/**
	 * Create a new CouchDB server instance
	 * @param {string} url URL address of the server (including protocoll and port)
	 * @param {object} config Server configuration
	 */
	constructor(url, config) {
		// Check mandatory arguments
		checkMandatoryArgument("url", url);

		// Store arguments
		this.url = url;

		// Configuration
		if (config) {
			if (config.secretKey) this.config.secretKey = config.secretKey;
		}

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
		const database = new CouchDatabase(name, nanoDb, this);
		database.importSchema(schema);
		return database;
	}
}
