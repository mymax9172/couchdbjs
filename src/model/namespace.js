import { Entity } from "./entity.js";
import { EntityFactory } from "./entityFactory.js";
import { checkMandatoryArgument } from "../helpers/tools.js";

export class Namespace {
	// Name of the context
	name;

	// Models
	models = {};

	// Indexes
	indexes = [];

	// CouchDB Database
	database;

	/**
	 * Check if a data type has been registered
	 * @param {string} typeName Data type name
	 * @returns True, if the data type has been registered
	 */
	isRegistered(typeName) {
		// Check mandatory arguments
		checkMandatoryArgument("typeName", typeName);

		// Check if models object has a key for this type
		return this.models.hasOwnProperty(typeName);
	}

	/**
	 * Register the model
	 * @param {Model} model Model class
	 */
	useModel(model) {
		// Check mandatory arguments
		checkMandatoryArgument("model", model);

		// Check if data type has been registered already
		if (this.isRegistered(model.typeName)) {
			throw new Error(
				"Data type " + model.typeName + " has been registered already"
			);
		}

		// Store the model
		this.models[model.typeName] = model;

		// Store any custom index defined in the model
		if (model.indexes) {
			this.indexes = this.indexes.concat(model.indexes);
		}
	}

	/**
	 * Provide the model for a give type name
	 * @param {string} typeName Data type name
	 * @returns {Entity} Entity class
	 */
	getModel(typeName) {
		// Check mandatory arguments
		checkMandatoryArgument("typeName", typeName);

		// Check if data type has been registered
		if (!this.isRegistered(typeName)) {
			throw new Error("Data type " + typeName + " has not been registered yet");
		}

		// Return the model
		return this.models[typeName];
	}

	/**
	 * Get the data service for a given data type name
	 * @param {String} typeName Data type name
	 * @returns {DataService} Data service for this data type
	 */
	getService(typeName) {
		// Check mandatory arguments
		checkMandatoryArgument("typeName", typeName);

		// Check if data type has been registered
		if (!this.isRegistered(typeName)) {
			throw new Error("Data type " + typeName + " has not been registered yet");
		}

		// Get the model
		const model = this.models[typeName];

		// Get the service
		const serviceName = model.typeName;
		return this.database.data[this.name][serviceName];
	}

	/**
	 * Create and instance a new entity class
	 * @param {string} typeName Data type name
	 */
	createEntity(typeName) {
		const factory = new EntityFactory(this, typeName);
		return factory.create();
	}
}
