import nano from "nano";
import { CouchDatabase } from "./couchDatabase.js";
import { checkMandatoryArgument } from "./helpers/tools.js";
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
	 * @param {CouchDatabase} databaseClass Class of the database to be used
	 */
	async create(name, databaseClass) {
		// Check mandatory arguments
		checkMandatoryArgument("name", name);

		// Create schema content
		var createSchema = (databaseClass) => {
			// Create an instance of the database
			const database = this.use(name, databaseClass);
			const schema = {
				_id: "$/schema",
				_rev: undefined,
				namespaces: {},
			};

			Object.values(database.namespaces).forEach((namespace) => {
				schema.namespaces[namespace.name] = {
					models: {},
				};
				const namespaceSchema = schema.namespaces[namespace.name];
				Object.values(namespace.models).forEach((model) => {
					namespaceSchema.models[model.typeName] = model;
				});
			});
			
			database.nanoDb.insert(schema);
			return schema;
		};

		let rule = "^[a-z][a-z0-9_$()+/-]*$";
		const regEx = new RegExp(rule);
		if (regEx.test(name)) {
			try {
				// Create the CouchDB database
				await this.nanoServer.db.create(name);

				if (databaseClass) {
					const schema = createSchema(databaseClass);
					return {
						ok: true,
						schema,
					};
				} else return { ok: true };
			} catch (error) {
				return { ok: false };
			}
		} else {
			throw new Error("Not allowed characters in the database name");
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
	 * @param {CouchDatabase} databaseClass Class of the database to be used
	 * @returns {CouchDatabase} CouchDB database class
	 */
	use(name, databaseClass) {
		// Check mandatory arguments
		checkMandatoryArgument("name", name);
		checkMandatoryArgument("databaseClass", databaseClass);

		const nanoDb = this.nanoServer.use(name);
		return new databaseClass(nanoDb);
	}
	
}
