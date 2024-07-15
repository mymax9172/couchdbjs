import PouchDB from "pouchdb";
import PouchdbFind from "pouchdb-find";

import { CouchDatabase } from "./couchDatabase.js";
import { checkMandatoryArgument } from "../helpers/tools.js";
import { coding } from "../helpers/coding.js";
import { Relationship } from "../model/relationship.js";

/**
 * Server class for a CouchDB server
 */
export class CouchServer {
	static {
		// Initialize PouchDB library with plugins
		PouchDB.plugin(PouchdbFind);
	}

	// Url address of the server
	url;

	// Port
	port;

	// Configuration
	config = {
		secretKey: "AGw89hDFFxz1",
		username: "",
		password: "",
		token: "",
	};

	/**
	 * Create a new CouchDB server instance
	 * @param {string} url URL address of the server (including protocoll and port)
	 * @param {object} config Server configuration
	 */
	constructor(url, port = 5984, config) {
		// Check mandatory arguments
		checkMandatoryArgument("url", url);
		checkMandatoryArgument("port", port);

		// Store arguments
		this.url = url;
		this.port = port;

		// Configuration
		if (config?.secretKey) this.config.secretKey = config.secretKey;
		if (config?.username) this.config.username = config.username;
		if (config?.password) this.config.password = config.password;
		this.config.token =
			"Basic " + btoa(this.config.username + ":" + this.config.password);
	}

	/**
	 * Fetch a request to the CouchDB Server
	 * @param {String} path URL
	 * @param {string} [method="GET"] HTTP method
	 * @param {JSON} body Body request
	 * @returns {Promise<JSON>} Response
	 */
	async fetchRequest(path, method = "GET", body) {
		// Check mandatory arguments
		checkMandatoryArgument("path", path);

		const response = await fetch(this.url + ":" + this.port + path, {
			method: method,
			mode: "cors",
			headers: {
				Accept: "application/json",
				Authorization: this.config.token,
			},
			body: body,
		});
		return await response.json();
	}

	/**
	 * Check if the server is up and running
	 * @returns {Promise<Boolean>} True if the server is up and running
	 */
	async isUp() {
		const response = await this.fetchRequest("/_up");
		return response.status === "ok";
	}

	/**
	 * Provide info about the server instance
	 * @returns {Promise<object>} Info about the server
	 */
	async getInfo() {
		return await this.fetchRequest("/");
	}

	/**
	 * Provide names of all databases
	 * @param {boolean} [onlyWithSchema=true] True if only schema based database names are listed
	 * @returns {Promise<array>} List of all database available on the server (with a proper schema) or null if any error occurred
	 */
	async getDatabaseList(onlyWithSchema) {
		const list = await this.fetchRequest("/_all_dbs");

		if (!onlyWithSchema) return list;

		const result = [];
		for (let i = 0; i < list.length; i++) {
			const db = new PouchDB(this.url + ":" + this.port + "/" + list[i], {
				auth: {
					username: this.config.username,
					password: this.config.password,
				},
			});
			try {
				const schema = await db.get("$/schema");
				if (schema != null) result.push(list[i]);
			} catch (error) {}
		}
		return result;
	}

	/**
	 * Check if a database name exists
	 * @param {String} name Name of the database to check existency
	 * @returns {Promise<Boolean>} True if the database exists
	 */
	async exists(name) {
		const list = await this.getDatabaseList();
		return list.includes(name);
	}

	/**
	 * Check if the database with the given name has a schema or not
	 * @param {String} name Name of teh database
	 * @returns {Boolean} True if the database is schema-based
	 */
	async hasSchema(name) {
		try {
			const db = new PouchDB(this.url + ":" + this.port + "/" + name, {
				auth: {
					username: this.config.username,
					password: this.config.password,
				},
			});
			const schema = await db.get("$/schema");
			if (schema != null) return true;
		} catch (error) {}
		return false;
	}

	/**
	 * Create a new database in the server
	 * @param {string} name Name of the database
	 * @param {JSON} schema Schema of the database (optional)
	 */
	async create(name) {
		// Check mandatory arguments
		checkMandatoryArgument("name", name);

		let rule = "^[a-z][a-z0-9_$()+/-]*$";
		const regEx = new RegExp(rule);
		if (regEx.test(name)) {
			try {
				// Check if database name is already used
				if (await this.exists(name))
					throw new Error("A database with this name already exists");

				// Create the CouchDB database
				const response = await this.fetchRequest("/" + name, "PUT");

				if (response.ok && schema) {
					// Connect to the new database
					const db = new PouchDB(this.url + ":" + this.port + "/" + name, {
						auth: {
							username: this.config.username,
							password: this.config.password,
						},
					});

					await this.defineSchema(db, schema);
				}
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

		return await this.fetchRequest("/" + name, "DELETE");
	}

	/**
	 * Retrieve a database instance
	 * @param {string} name Name of the database
	 * @returns {Promise<CouchDatabase>} CouchDB database class
	 */
	async use(name) {
		// Check mandatory arguments
		checkMandatoryArgument("name", name);

		// Connect to the database
		const pouchDb = new PouchDB(this.url + ":" + this.port + "/" + name, {
			auth: {
				username: this.config.username,
				password: this.config.password,
			},
			skip_setup: true,
		});

		// Read the stored schema
		const schema = await pouchDb.get("$/schema");

		// Return the Database class
		const database = new CouchDatabase(name, pouchDb, this);
		database.importSchema(schema);
		return database;
	}

	// /**
	//  * Migrate a database to a new version
	//  * @param {String} name Name of the database
	//  * @param {Migration} migrationClass Migration class to be used
	//  * @param {string} [direction="up"] Direction of the migration
	//  */
	// async migrate(name, migrationClass, direction = "up") {
	// 	const db = await this.use(name);
	// 	const migration = new migrationClass(db);
	// 	if (direction === "up") migration.up()
	// }

	/**
	 * Create the schema and indexes
	 * @param {PouchDB} db Pouchdb instance
	 * @param {JSON} schema schema to create
	 */
	async defineSchema(db, schema) {
		// Serialize the schema
		const serializedSchema = coding.serialize(schema);
		if (!serializedSchema.hasOwnProperty("version"))
			serializedSchema.version = 1;

		// Store the schema
		serializedSchema._id = "$/schema";
		await db.put(serializedSchema);

		// Create indexes
		if (schema.relationships) {
			const relationshipNames = Object.keys(schema.relationships);
			relationshipNames.forEach(async (relationshipName) => {
				const definition = JSON.parse(
					JSON.stringify(schema.relationships[relationshipName])
				);
				definition.name = relationshipName;

				const relationship = new Relationship(definition);
				const index = relationship.getIndex();

				const indexDefinition = {
					name: index.name,
					ddoc: index.name,
					fields: [...index.fields],
				};
				await db.createIndex(indexDefinition);
			});
		}

		// Initialize migrations
		const migrations = {
			_id: "$/migrations",
			log: [
				{
					when: Date.now(),
					type: "init",
					version: 1,
				},
			],
		};
		await db.put(migrations);
	}
}
