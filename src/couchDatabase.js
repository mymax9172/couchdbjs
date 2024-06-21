import { Namespace } from "./model/namespace.js";
import { SingletonService } from "./services/singletonService.js";
import { CollectionService } from "./services/collectionService.js";
import { checkMandatoryArgument } from "./helpers/tools.js";

/**
 * Class for a CouchDB database
 */
export class CouchDatabase {
	// Internal CouchDB database instance
	nanoDb;

	// Namespaces
	namespaces = {};

	// Data services
	data = {};

	/**
	 * Create a new CouchDB database instance
	 * Do not create this class, use method use from CouchServer class instead
	 * @param {DocumentScope} nanoDb Document scope
	 */
	constructor(nanoDb) {
		// Check mandatory arguments
		checkMandatoryArgument("nanoDb", nanoDb);

		// Store the CouchDB instance and namespaces
		this.nanoDb = nanoDb;
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
			if (model.singleton) {
				const serviceName = model.typeName;
				serviceSpace[serviceName] = new SingletonService(namespace, model.typeName);
			} else {
				const serviceName = model.typeName + "List";
				serviceSpace[serviceName] = new CollectionService(namespace, model.typeName);
			}
		});
	}

	/**
	 * Provide info about the database
	 * @returns {Promise<object>} Info about the database
	 */
	getInfo() {
		return this.nanoDb.info();
	}
}
