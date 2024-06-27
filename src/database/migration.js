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

		if (schema.version != this.toVersion)
			throw new Error(
				"This schema has a different version from target version of this migration"
			);

		try {
			// Perform migration
			const actions = await this.onUpgrade();

			// Get migration document (or create a new one)
			const migrationDoc = await this.database.nanoDb.get("$/migrations");

			migrationDoc.log.push({
				when: Date.now(),
				type: "upgrade",
				version: this.toVersion,
				actions: actions,
			});
			await this.database.nanoDb.insert(migrationDoc);

			// Update schema
			const serializedSchema = coding.serialize(schema);
			const schemaDoc = await this.database.nanoDb.get("$/schema");
			schemaDoc.version = this.toVersion;
			schemaDoc.namespaces = serializedSchema.namespaces;
			await this.database.nanoDb.insert(schemaDoc);

			// Reimport the new schema
			this.database.importSchema(schema);
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

		if (schema.version != this.fromVersion)
			throw new Error(
				"This schema has a different version from target version of this migration"
			);

		try {
			// Perform migration
			const actions = await this.onDowngrade();

			// Get migration document (or create a new one)
			const migrationDoc = await this.database.nanoDb.get("$/migrations");

			migrationDoc.log.push({
				when: Date.now(),
				type: "downgrade",
				version: this.fromVersion,
				actions: actions,
			});
			await this.database.nanoDb.insert(migrationDoc);

			// Update schema
			const serializedSchema = coding.serialize(schema);
			const schemaDoc = await this.database.nanoDb.get("$/schema");
			schemaDoc.version = this.fromVersion;
			schemaDoc.namespaces = serializedSchema.namespaces;
			await this.database.nanoDb.insert(schemaDoc);

			// Reimport the new schema
			this.database.importSchema(schema);
		} catch (error) {
			throw new Error(error);
		}
	}

	async onUpgrade() {}
	async onDowngrade() {}

	/**
	 * List all documents of a specific type
	 * @param {String} namespaceName Name of the namespace
	 * @param {String} typeName Type name
	 */
	async list(namespaceName, typeName) {
		const documents = await this.database.nanoDb.list({
			include_docs: true,
			startkey: namespaceName + "/" + typeName,
			endkey: namespaceName + "/" + typeName + "/\ufff0",
		});
		if (documents.rows.length == 0) return [];
		else return documents.rows.map((row) => row.doc);
	}

	// Add a property
	async addProperty(namespaceName, typeName, propertyName, defaultValue) {
		try {
			// Get documents
			const documents = await this.list(namespaceName, typeName);

			// Transform them
			for (let i = 0; i < documents.length; i++) {
				const document = documents[i];
				document[propertyName] = defaultValue;
			}

			// Bulk save
			const response = await this.database.nanoDb.bulk({ docs: documents });

			// Return migration action
			return {
				action: "add-property",
				payload: {
					namespace: namespaceName,
					type: typeName,
					property: propertyName,
					default: defaultValue,
				},
				when: Date.now(),
				docs: documents.length,
			};
		} catch (error) {
			return {
				error: error,
			};
		}
	}

	// Add a property
	async removeProperty(namespaceName, typeName, propertyName) {
		try {
			// Get documents
			const documents = await this.list(namespaceName, typeName);

			// Transform them
			for (let i = 0; i < documents.length; i++) {
				const document = documents[i];
				delete document[propertyName];
			}

			// Bulk save
			const response = await this.database.nanoDb.bulk({ docs: documents });

			// Return migration action
			return {
				action: "remove-property",
				payload: {
					namespace: namespaceName,
					type: typeName,
					property: propertyName,
				},
				when: Date.now(),
				docs: documents.length,
			};
		} catch (error) {
			return {
				error: error,
			};
		}
	}
}
