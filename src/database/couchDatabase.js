import { Namespace } from "../model/namespace.js";
import { SingletonService } from "../services/singletonService.js";
import { CollectionService } from "../services/collectionService.js";
import { checkMandatoryArgument } from "../helpers/tools.js";
import { coding } from "../helpers/coding.js";

/**
 * Class for a CouchDB database
 */
export class CouchDatabase {
	// Internal PouchDB database instance
	pouchDb;

	// CouchDB server
	server;

	// Name of the database
	name;

	// Version of the database
	version = 1;

	// Namespaces
	namespaces = {};

	// Data services
	data = {};

	/**
	 * Create a new CouchDB database instance
	 * Do not create this class, use method use from CouchServer class instead
	 * @param {String} name Name of the database
	 * @param {PouchDB} pouchDb PouchDB reference
	 * @param {CouchServer} server CouchDB server instance
	 */
	constructor(name, pouchDb, server) {
		// Check mandatory arguments
		checkMandatoryArgument("name", name);
		checkMandatoryArgument("pouchDb", pouchDb);
		checkMandatoryArgument("server", server);

		// Store the CouchDB instance
		this.name = name;
		this.pouchDb = pouchDb;
		this.server = server;
	}

	/**
	 * Import schema definition
	 * @param {Object} schema Schema definition
	 */
	importSchema(schema) {
		// Check mandatory arguments
		checkMandatoryArgument("schema", schema);

		// Reset all
		this.version = schema.version;
		this.namespaces = {};
		this.data = {};

		// Read the schema and setup the instance
		Object.keys(schema.namespaces).forEach((namespaceKey) => {
			const namespaceDefinition = schema.namespaces[namespaceKey];

			const namespace = new Namespace();
			namespace.name = namespaceKey;

			namespaceDefinition.forEach((model) => {
				namespace.useModel(coding.deserialize(model));
			});

			this.useNamespace(namespace);
		});
	}

	/**
	 * Use a namespace
	 * @param {Namespace} namespace Namespace
	 */
	useNamespace(namespace) {
		// Check mandatory arguments
		checkMandatoryArgument("namespace", namespace);

		// Get the name
		const name = namespace.name;

		// Check if the namespace already exists
		if (this.namespaces.hasOwnProperty(name))
			throw new Error("Namespace " + name + " already exists");

		// Register the namespace
		this.namespaces[name] = namespace;

		// Store the database in it
		namespace.database = this;

		// Create the namespace in data service property
		this.data[name] = {};
		const serviceSpace = this.data[name];

		// Load all services
		const modelNames = Object.keys(namespace.models);

		modelNames.forEach((modelName) => {
			// Model
			const model = namespace.models[modelName];

			// Create a property for the service provider into the database instance
			const serviceName = model.typeName;
			if (model.singleton) {
				serviceSpace[serviceName] = new SingletonService(
					namespace,
					model.typeName
				);
			} else {
				serviceSpace[serviceName] = new CollectionService(
					namespace,
					model.typeName
				);
			}
		});
	}

	/**
	 * Provide info about the database
	 * @returns {Promise<JSON>} Info about the database
	 */
	async getInfo() {
		return await this.pouchDb.info();
	}

	/**
	 * Read the schema from the database
	 * @returns {Promise<JSON>} Schema definition
	 */
	async getSchema() {
		await this.pouchDb.get("$/schema");
	}
}
