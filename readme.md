# CouchDB-schema

CouchDB ORM library based on [PouchDB library](https://www.pouchdb.com) and [Apache CouchDB](https://couchdb.apache.org/) official documentation for [Node.js](https://nodejs.org/)

This library allows to define your data model (schema) and use auto-generated Entity class to perform database operations. If you do not need a data model, use directly PouchDB library

## Installation

1. Install [npm][1]
2. `npm install couchdbjs`

or save `couchdbjs` as a dependency of your project with

    npm install --save couchdbjs

Note the minimum required version of Node.js is 10.

## Table of contents

- [Getting started](#getting-started)
- [Tutorials](#tutorials)
- [APIs](#apis)
  - [CouchServer class](#couchserver)
  - [CouchDatabase class](#couchdatabase)
  - [Entity class]()
  - [Attachment class]()
  - [Relationship class]()
  - [Reference class]()
  - [Schema definition]()
- [Definitions](#definitions)
  - [Schema definition](#schema-definition)
  - [Entity model](#entity-model)
  - [Relationship definition](#relationship-definition)

## Getting started

This library is based on several concepts, you can find a brief description here:

1. CouchDB Server

   This class allows you to establish a connection with your CouchDB instance. Once established a connection it is possible to get info from the server, create a new database or connect to an existing one

2. CouchDB Database

   This class can manipulate a single database. A database is a combination of one or many namespaces.

3. Namespace

   A namespace is a context where several data model can be hosted. A namespace provides capability like data validation and reference management.

4. Data model

   A data model is a standard Javascript object that defines your data (schema), including which property, actions, rules to be applied on every single property of your data model

5. Data service

   A data service is a collecton of methods to access data for a specific data model (load, save, find, etc.)

## Tutorials

These tutorials use ES6 and async/await capabilities to be modern with a higher readibility

### Hello World

In this first example we establish a connection with a remote database

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
url = "http:/<YOURURL>:5984";
const server = new CouchServer(url, {
	secretKey: "abcdefgh6747",
	username: "myusername",
	password: "mypassword",
	token: "mytokenauthentication",
});

// Get info about the server
const info = await server.getInfo();
```

### Discover existing databases

There is a specific method to get all database names from the server

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
// server = ....

// Get all database names
const list = await server.getDatabaseList();

// A single database name can be easily tested
const existABC = await server.exists("crm");
```

### Creating a new database with a schema

Having a schema allow the server to store in the schema document ($/schema) all details about your namespaces and data models. This would be useful if you want to track versions or use a web application like CouchDBExplorer to navigate your data

```js
import { CouchServer } from "couchdbjs";
import { schema } from "<your-project>";

// Create a server instance
// server = ....

// Create a new database named "crm" with a database schema
const result = await server.create("crm", schema);
```

We have provided a proper schema to define all namespaces and entities.

A schema is a standard js object that define your namespaces and data models, the example below define a schema with just a namespace (named 'default') with just one data model (named 'user')

```js
const userModel = {
	typeName: "user",
	// .... definition of the user data model
};

export const SampleDbSchema = {
	version: 1,

	namespaces: {
		default: [userModel],
	},
};
```

### Deleting a database

By knowing the database name is quite simple to delete it

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
// server = ....

// Delete the database named 'crm'
await server.delete("crm");
```

### Data model definition

In order to create your own data model, it is important to define how your data should be organized. In this library each database can have multiple namespaces, where a namespace is a context of data usually related to the same business area.

It is not mandatory to have multiple namespaces, but at least one is required. In the following examples we will use to namespaces, one called 'organization' for all data related to the organization, and another called 'sales' related to the sale service

Each namespace uses data model, so let's first see how a basic data model is defined:

`company-datamodel.js`

```js
export const {
	typeName: "company",
	singleton: true,
	properties: {
		name: {},
		address: {},
		revenue: {},
	}
}
```

The code above describes a minimalistic example of a data model for business concept called 'company'. We see 3 properties:

- typeName, describes a unique identifier for all documents of this kind. It will be part of th document's id.
- singleton, describes the service approach of this data model. A singleton data model can have just one document for this kind, otherwsise (singleton: false) we have a collection approach, with multiple documents of this kind
- properties, contains all properties of this data model, in this case 3 properties without further specifications

Once defined the data model, we can include it into a our namespace as we have seen above (schema)

A CouchDatabase instance is never created directly, but using the server as we will seen in a few moment.

Behind the scene, different classes are created and several properties are added to these classes in order to easily access data.

Once our database is ready we can create our first document

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
// server = ....

// Use the crm database
const db = await server.use("crm");

// Create a company document
const company = db.data.organization.company.create();
company.name = "ACME Inc.";
company.address = "1020 main street";
company.revenue = 350000;
await company.save();
```

Let's review what has been done here:

1. Created a new instance of CouchServer, we open the database 'crm'. Behind the scene the schema is loaded from the database and all entities, classes and services are served into our new variabile 'db'
2. Inside db we have the property 'data' who contains all methods to access data
3. Inside data there is a property for each namespace, so we selected the one related to the organization
4. Inside that, there is a property for each data service (one for each data model).
5. create() methods is a factory method to create a new class of type Entity that contains all properties we defined for our data model
6. Async save() method in this entity class allows us to save it

### Singleton or Collections

As we wrote, a data model can be a singleton or a collection. In the example above company was a singleton, so this means we could have max 1 document with the following id: organization/company:
`namespace/typeName`

For collections, we could have several documents for the same data type, for example:

`user-datamodel.js`

```js
export const {
	typeName: "user",
	singleton: false,
	properties: {
		firstName: {},
		lastName: {},
	}
}
```

In this case we could have different documents with the following id: organization/user/[unique-id]: `namespace/typeName/timestamp-r4d`

As you see above the unique id is automatically created using the timestamp at the moment of saving concatenated with a random 4 digits number

Data services for collections have additional methods (i.e. find() ) than singletons

### Entity Class

We named this concept of an entity class, let's try to explain what that is.

An entity class is a wrapper of the json document exchanged with CouchDB in order to improve validation, control and transformations.

1. For each property defined in the data model, a getter/setter is created in the entity class
2. A validation engine is built-in to check the entity
3. Methods like import() or export() allow to import or export a json document
4. An entity class must be created by using the create() method from the data service as we have seen in the previous example

We will see some further examples about an entity class

### Extending our property definition

So far we have seen a trivial property definition, with nothing in it. Let's see some valuable examples

#### Default value

It is possible to define a default value for a property, this will be assigned at the moment of the creation of the entity class

`user-datamodel.js`

```js
export const {
	typeName: "user",
	singleton: false,
	properties: {
		firstName: {},
		lastName: {},
		active: {
			default: true,
		}
	}
}

[...]

const user = db.data.organization.user.create();
console.log(user.active);
[Result is: true]
```

In this case default attribute is a static value, we can also use the functional version of it. (no args are passed to the function). This could be useful if default value is based on time ('this' is not the entity because default function is executed at the time of entity creation)

`user-datamodel.js`

```js
export const {
	typeName: "user",
	singleton: false,
	properties: {
		firstName: {},
		lastName: {},
		active: {
			default() { return true },
		}
	}
}
```

#### Required value

By providing the required attribute it is possible to define if the property is mandatory or can be null

`user-datamodel.js`

```js
export const {
	typeName: "user",
	singleton: false,
	properties: {
		firstName: {
			required: true,
		},
		lastName: {},
		active: {
			default: true,
		}
	}
}

[...]

const user = db.data.organization.user.create();
await user.save();
[Result is an error due to missing value for firstName property]
```

required can be defined as a function as well, see the example

`customer-datamodel.js`

```js
export const {
	typeName: "user",
	singleton: false,
	properties: {
		name: {
			required: (e) => return !(e.legalName);
		},
		legalName: {
			required: (e) => return !(e.name);
		},
		active: {
			default: true,
		}
	}
}
```

In this case, for a customer we need at least one between name and legalName, the first argument is the actual entity.

#### Computed property

A computed property is a finctional property not stored in the database but calculated anytime on-the-fly

`user-datamodel.js`

```js
export const {
	typeName: "user",
	singleton: false,
	properties: {
		firstName: {
			required: true,
		},
		lastName: {},
		active: {
			default: true,
		},
		fullName: {
			computed() {
				return this.firstName + " " + this.lastName;
			}
		}
	}
}
```

Note that in the computed function no arg is passed, 'this' can be used to get entity values

#### Readonly

By setting a property as 'readonly' the entity class does not have any setter and reject to change the value. This means the value can be assigned only in the following way:

- Using a default value
- Loading a document from the database
- Importing a json document (see below)
- Manipulating directly the inner document in the entity class

Of course the last two are highly discouraged because the break all controls in place

`user-datamodel.js`

```js
export const {
	typeName: "user",
	singleton: false,
	properties: {
		firstName: {
			required: true,
		},
		lastName: {},
		active: {
			default: true,
		},
		fullName: {
			computed() {
				return this.firstName + " " + this.lastName;
			}
		},
		uid: {
			readonly: true,
			default: "3482574987"
		}
	}
}
```

'readonly' can also be expressed as function (same rules seen in 'required')

#### Hashing and Encyprion

Sometime is required to hash a value (i.e. password). In this case the property hashed can support that.

`user-datamodel.js`

```js
export const {
	typeName: "user",
	singleton: false,
	properties: {
		username: {
			required: true,
		},
		password: {
			required: true,
			hashed: true
		},
	}
}
```

Hashing is performed once set the value (so even in the class instance the value is stored hashed and cannot be read again). Hashing is irreversible

```js
const user = mybb.data.security.user.create();

user.password = "welcome1a";
console.log(user.password);
[Result: "fd479f8219295f5e91efb4e90a3f29fb6e59c2f4a71238a4f596bb7da1b4add1"]
```

Same for encryption, but in this case the value is encrypted only at rest (database) but it is decrypted at class instance level

`user-datamodel.js`

```js
export const {
	typeName: "user",
	singleton: false,
	properties: {
		username: {
			required: true,
		},
		password: {
			required: true,
			hashed: true
		},
		taxCode: {
			encypted: true,
		}
	}
}
```

#### Hooks

There are two hooks for each property, beforeWrite and afterRead. beforeWrite allows to modify the value right before storing into the document (and then store it in the database). afterRead allows to modify the value just after reading the value from the inner document. These hooks are useful for any transformation (like formatting)

`user-datamodel.js`

```js
export const {
	typeName: "user",
	singleton: false,
	properties: {
		username: {
			required: true,
		},
		password: {
			required: true,
			hashed: true
		},
		age: {
			encrypted: true,
			afterRead(value) {
				if (!value) return value;
				return Number(value);
			},
		},
	}
}
```

In this example encryption returns a string value, so we can get the original number value by a transformation

#### Rules

It is possible to define rules at property level, by providing an array of rule like the following:

```js
const Contact = {
	typeName: "contact",
	singleton: false,
	properties: {
		address: {
			required: true,
			rules: [
				(value) =>
					["street", "square", "avenue"].includes(value) ||
					"This is not a valid address",
			],
		},
		city: {},
	},
};
```

In this example address must ends with one of the three words, if check fails a string message will be reported.
Rules is an array, so multiple rules can be defined (will be applied one by one, if one fails, validation fails as well).

Rules are applied during the execution of the setter and once again before saving in the database.

### Property type

Each property can have its own property type descriptor, an object that inherits rules and hooks. A property type descriptor is an object like the following:

`standardTypes.js`

```js
const DateTimePropertyType = {
	name: "DateTime",

	rules: [
		(val) => val instanceof Date || "Value " + val + " is not a Date object",
	],

	beforeWrite(value) {
		if (!value) return value;
		return value.getTime();
	},

	afterRead(value) {
		if (!value) return value;
		return new Date(value);
	},
};
```

The above code is included as standard type for dates. As you can notice, we can save a Date object and internally # of milliseconds are saved. Once we get the value a proper Date object is instanciated and returned

Below you see how to add a property type to a property

```js
const person = {
	typeName: "person",
	singleton: false,
	properties: {
		birthdate: {
			type: DateTimePropertyType,
		},
		city: {},
	},
};
```

### Value lifecycle

#### Getter

When you get a value the following flow is executed:

- if is a computed, execute the computed() methods adn exits
- read the value from the inner document
- if it is hashed, return the value as it is
- if it is encrypted, it is decrypted
- if it has a property type, execute the afterRead() hook
- if it has the afterRead() hook, it executes it
- return the final value

#### Setter

When you set a new value, the following flow is executed:

- if it is a computer or readonly value, it fails
- check if the value is missing and required is true
- if it has a property type, execute rules in there
- if it has rules, execute rules in there
- if it has a property type, execute the beforeWrite() hook
- if it has the beforeWrite hook, it executes it
- if it is hashed, hashes the value
- if it is encrypted, encrypts the value
- write the value in the inner document

[1]: https://npmjs.org
[2]: https://github.com/apache/couchdb-nano/issues
[4]: https://github.com/apache/couchdb-nano/blob/main/cfg/couch.example.js
[8]: https://webchat.freenode.net?channels=%23couchdb-dev
[axios]: https://github.com/axios/axios

## APIs

### CouchServer

**Constructor CouchServer(url, port = 5984, config)**

> Create a new CouchServer instance  
> url: Server address (including http(s)://)  
> port: Port number (default is 5984)  
> config: Configuration object

A basic example to create a new instance is the following (using the default port number):

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
url = "http:/<YOURURL>";
const server = new CouchServer(url);
```

Third argument is the configuration object.

> - username: Username for authentication
> - password: Password for authentication
> - secretKey: Secret key for encrypted data

In case your server is under authentication, it is possible to provide credentials within the config object

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
url = "http:/<YOURURL>";
const server = new CouchServer(url, 5984, {
	username: "my-username",
	password: "my-password",
});
```

> Authentication in this release is based on [Basic Authentication mechanism](https://docs.couchdb.org/en/stable/api/server/authn.html) - It is crucial to adopt an SSL protocol to encrypt credentials transmission

Databases can have some encrypted data. For encrypted data is important to provide a secret key, to be passed when the server connection is established

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
url = "http:/<YOURURL>";
const server = new CouchServer(url, 5984, {
	username: "my-username",
	password: "my-password",
	secretKey: "my-secret-key",
});
```

**async isUp()**

> Return true if the server is up and running

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
url = "http:/<YOURURL>";
const server = new CouchServer(url);

if (await server.isUp()) console.log("Server is up and running");
else console.error("Server is not available");
```

**async getInfo()**

> Return server info (returned by CouchDB method: get /)

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
url = "http:/<YOURURL>";
const server = new CouchServer(url);

console.log(await server.getInfo());
```

**async getDatabaseList(onlyWithSchema)**

> Return an array of string with all database names  
> onlyWithSchema: 'true' to list only schema-based database

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
url = "http:/<YOURURL>";
const server = new CouchServer(url);

// List all schema-based databases
console.log(await server.getDatabaseList(true));
```

**async exists(name)**

> Return true if a database exists with that given name  
> name: name of the database to test

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
url = "http:/<YOURURL>";
const server = new CouchServer(url);

// List all schema-based databases
if (await server.exists("test")) console.log("test database exists");
```

**async hasSchema(name)**

> Return true if a database with the given name is schema-based  
> name: name of the database

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
url = "http:/<YOURURL>";
const server = new CouchServer(url);

// List all schema-based databases
if (await server.hasSchema("test"))
	console.log("test database is schema-based");
```

**async create(name, schema)**

> Create a new database (with or without a schema definition)  
> name: name of the database  
> schema:(optional) schema definition

Without a schema definition this methods just create an empty database in the connected server. Using a schema is highly recommended to take advantage of this library.

Returned object:

> ok: true if the operation succeeded  
> error: (if ok is false), description of occurred error

```js
import { CouchServer } from "couchdbjs";
import { mySchema } from "....";

// Create a server instance
url = "http:/<YOURURL>";
const server = new CouchServer(url);

// Create a new database
if (!(await server.exists("test"))) {
	const result = await server.create("test", mySchema);
	if (result.ok) console.log("Database test succesfully created");
	else console.error("Database creation failed: " + result.error);
}
```

**async delete(name)**

> Delete an existing database (with or without a schema definition)  
> name: name of the database

Returns info about the deleted database [CouchDB doc](https://docs.couchdb.org/en/stable/api/database/common.html#):

```js
import { CouchServer } from "couchdbjs";
import { mySchema } from "....";

// Create a server instance
url = "http:/<YOURURL>";
const server = new CouchServer(url);

// Delete a database
if (await server.exists("test")) await server.delete("test");
```

**async use(name)**

> Open an existing database and instanciate a CouchDatabase instance  
> name: name of the database

```js
import { CouchServer } from "couchdbjs";
import { mySchema } from "....";

// Create a server instance
url = "http:/<YOURURL>";
const server = new CouchServer(url);

// Opne test database
const database = await server.use("test");
```

### CouchDatabase

Do not create a CouchDatabase instance using "new", use the 'use' method on a CouchServer instance instead

**async getInfo()**

> Returns info about the database (same as PouchDb.info())

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
url = "http:/<YOURURL>";
const server = new CouchServer(url);
const database = await server.use("test");

console.log(await database.getInfo());
```

**async getSchema()**

> Returns the current schema of the database (see the schema definition)

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
url = "http:/<YOURURL>";
const server = new CouchServer(url);
const database = await server.use("test");

console.log(await database.getSchema());
```

## Definitions

### Schema definition

It is a javascript object where it is defined how the database is structured (its schema). It has a version property (integer from 1 onward) and a collection of types, namespaces and relationships (see below)

```js
export const SampleCRMSchema = {
	version: 1,

	types: {
		// ...
	},

	namespaces: {
		// ...
	},

	relationships: {
		// ...
	},
};
```

### Namespace

A namespace is a context where one or many model entities are defined. It has its own title and description, for technical documentation, and a list of entity models (see below)

```js
import { Company, Contact, Address } from "./models/business-data-models.js";
import { User, Role } from "./models/scurity-data-models.js";

export const SampleCRMSchema = {
	version: 1,

	namespaces: {
		business: {
			title: "Business",
			description: "Business context of sales",
			models: [Company, Contact, Address],
		},
		security: {
			title: "Security",
			description: "Data privacy, authentication and authorization",
			models: [User, Role],
		},
	},

	relationships: {
		// ...
	},
};
```

In this example there are two namespaces, one is called "Business", it combines all business entity models, the other is called "Security", it combines all security related entity models

To propertly identify a data model it is important to use the namespace name and it is type name, so business/company not just company

### Entity model

An entity model is the proper description of the entity. It is a javascript object

### Relationship definition
