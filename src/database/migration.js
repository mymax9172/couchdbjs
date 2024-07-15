import { coding } from "../helpers/coding.js";

export class Migration {
	// Number of new version
	toVersion;

	// Number of current version
	fromVersion;

	// Couch database
	database;

	constructor(database) {
		this.database = database;
	}

	// Migrate to the new version
	async up(schema) {
		// Check if migration is needed
		const currentVersion = this.database.version;
		if (currentVersion != this.fromVersion)
			throw new Error(
				"Current version is not the right target for this migration"
			);

		if (schema && schema.version != this.toVersion)
			throw new Error(
				"This schema has a different version from target version of this migration"
			);

		try {
			// Perform migration
			const actions = await this.onUpgrade();

			// Get migration document (or create a new one)
			const migrationDoc = await this.database.pouchDb.get("$/migrations");

			migrationDoc.log.push({
				when: Date.now(),
				type: "upgrade",
				version: this.toVersion,
				actions: actions,
			});
			await this.database.pouchDb.put(migrationDoc);

			if (schema) {
				// Update schema
				const serializedSchema = coding.serialize(schema);
				const schemaDoc = await this.database.pouchDb.get("$/schema");
				schemaDoc.version = this.toVersion;
				schemaDoc.namespaces = serializedSchema.namespaces;
				await this.database.pouchDb.put(schemaDoc);

				// Reimport the new schema
				this.database.importSchema(schema);
			}
		} catch (error) {
			throw new Error(error);
		}
	}

	// Downgrade to the previous version
	async down(schema) {
		// Check if migration is needed
		const currentVersion = this.database.version;
		if (currentVersion != this.toVersion)
			throw new Error(
				"Current version is not the right target for this migration"
			);

		if (schema && schema.version != this.fromVersion)
			throw new Error(
				"This schema has a different version from target version of this migration"
			);

		try {
			// Perform migration
			const actions = await this.onDowngrade();

			// Get migration document (or create a new one)
			const migrationDoc = await this.database.pouchDb.get("$/migrations");

			migrationDoc.log.push({
				when: Date.now(),
				type: "downgrade",
				version: this.fromVersion,
				actions: actions,
			});
			await this.database.pouchDb.put(migrationDoc);

			if (schema) {
				// Update schema
				const serializedSchema = coding.serialize(schema);
				const schemaDoc = await this.database.pouchDb.get("$/schema");
				schemaDoc.version = this.fromVersion;
				schemaDoc.namespaces = serializedSchema.namespaces;
				await this.database.pouchDb.put(schemaDoc);

				// Reimport the new schema
				this.database.importSchema(schema);
			}
		} catch (error) {
			throw new Error(error);
		}
	}

	async onUpgrade() {
		throw new Error("Upgrade process not implemented");
	}
	async onDowngrade() {
		throw new Error("Downgrade process not implemented");
	}
}

export class MigrationAction {
	name;
	database;

	constructor(name, database) {
		this.name = name;
		this.database = database;
	}

	/**
	 * List all documents of a specific type
	 * @param {String} namespaceName Name of the namespace
	 * @param {String} typeName Type name
	 */
	async list(namespaceName, typeName) {
		const documents = await this.database.pouchDb.allDocs({
			include_docs: true,
			startkey: namespaceName + "/" + typeName,
			endkey: namespaceName + "/" + typeName + "/\ufff0",
		});
		if (documents.rows.length == 0) return [];
		else return documents.rows.map((row) => row.doc);
	}

	/**
	 * Draft a log of the action (to be finalized)
	 * @param {json} payload Details of the action
	 * @param {Number} docs Number of touched documents
	 * @returns {json} Log of the completed action
	 */
	createLog(payload, docs) {
		return {
			action: this.name,
			payload: payload,
			when: Date.now(),
			docs: docs || 0,
		};
	}

	async run() {
		throw new Error("Action not implemented");
	}
}

class AddPropertyAction extends MigrationAction {
	constructor(database) {
		super("add-property", database);
	}

	async run(namespaceName, typeName, propertyName, defaultValue) {
		try {
			// Get documents
			const documents = await this.list(namespaceName, typeName);

			// Transform them
			for (let i = 0; i < documents.length; i++) {
				const document = documents[i];
				document[propertyName] = defaultValue;
			}

			// Bulk save
			await this.database.pouchDb.bulkDocs(documents);

			// Return log
			const log = this.createLog(
				{
					namespace: namespaceName,
					type: typeName,
					property: propertyName,
					default: defaultValue,
				},
				documents.length
			);
			return {
				ok: true,
				log,
			};
		} catch (error) {
			return {
				ok: false,
				error: error,
			};
		}
	}
}

class RemovePropertyAction extends MigrationAction {
	constructor(database) {
		super("remove-property", database);
	}

	async run(namespaceName, typeName, propertyName) {
		try {
			// Get documents
			const documents = await this.list(namespaceName, typeName);

			// Transform them
			for (let i = 0; i < documents.length; i++) {
				const document = documents[i];
				delete document[propertyName];
			}

			// Bulk save
			await this.database.pouchDb.bulkDocs(documents);

			// Return log
			const log = this.createLog(
				{
					namespace: namespaceName,
					type: typeName,
					property: propertyName,
				},
				documents.length
			);
			return {
				ok: true,
				log,
			};
		} catch (error) {
			return {
				ok: false,
				error: error,
			};
		}
	}
}

class UpdatePropertyAction extends MigrationAction {
	constructor(database) {
		super("update-property", database);
	}

	async run(namespaceName, typeName, propertyName, callback) {
		try {
			// Get documents
			const documents = await this.list(namespaceName, typeName);

			// Transform them
			const updatedDocuments = [];

			for (let i = 0; i < documents.length; i++) {
				const document = documents[i];
				const originalValue = document[propertyName];
				const newValue = callback(document[propertyName]);
				if (originalValue != newValue) {
					document[propertyName] = newValue;
					updatedDocuments.push(document);
				}
			}

			// Bulk save
			await this.database.pouchDb.bulkDocs(updatedDocuments);

			// Return log
			const log = this.createLog(
				{
					namespace: namespaceName,
					type: typeName,
					property: propertyName,
				},
				updatedDocuments.length
			);
			return {
				ok: true,
				log,
			};
		} catch (error) {
			return {
				ok: false,
				error: error,
			};
		}
	}
}

export const StandardMigrationActions = {
	addProperty: AddPropertyAction,
	removeProperty: RemovePropertyAction,
	updateProperty: UpdatePropertyAction,
};
