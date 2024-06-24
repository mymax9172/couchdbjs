# CouchDBjs

CouchDB ORM library based on [Nano library](https://www.npmjs.com/package/nano) and [Apache CouchDB](https://couchdb.apache.org/) official documentation for [Node.js](https://nodejs.org/)

This library allows to define your data model (schema) and use auto-generated Entity class to perform database operations. If you do not need a data model, use directly Nano library

## Installation

1. Install [npm][1]
2. `npm install couchdbjs`

or save `couchdbjs` as a dependency of your project with

    npm install --save couchdbjs

Note the minimum required version of Node.js is 10.

## Table of contents

- [Getting started](#getting-started)
- [Tutorials](#tutorials)
- [API](#api)
  - [CouchServer class](#couchServer-callback)

## Getting started

This library is based on several concepts:

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
const couchDB = new CouchServer(url);

// Get info about the server
const info = await couchDB.getInfo();
```

### Discover existing databases

There is a specific method to get all database names from the server

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
url = "http:/<YOURURL>:5984";
const couchDB = new CouchServer(url);

// Get all database names
const list = await couchDB.getDatabaseList();

// A single database name can be easily tested
const existABC = await coucbDB.exists("crm");
```

### Creating a new database

#### Without a schema

It is possible to create a new database without any schema upfront, by simply using the command create(). <b>Database name must be coherent with CouchDB naming conventions</b>.

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
url = "http:/<YOURURL>:5984";
const couchDB = new CouchServer(url);

// Create a new database named "crm"
const result = await couchDB.create("crm");
```

This example has created an empty database in your server. Schema can be applied afterward.

#### With a schema

Having a schema allow the server to store a schema document ($/schema) all details about your namespaces and data models. This would be useful if you want to track versions or use a web application like CouchDBExplorer to navigate your data

```js
import { CouchServer } from "couchdbjs";
import { MyCRMDatabase } from "<your-project>";

// Create a server instance
url = "http:/<YOURURL>:5984";
const couchDB = new CouchServer(url);

// Create a new database named "crm" with a database schema
const result = await couchDB.create("crm", MyCRMDatabase);
```

In this case we have defined a proper class for our database and provided to the create() method.

### Deleting a database

By knowing the database name is quite simple to delete it

```js
import { CouchServer } from "couchdbjs";

// Create a server instance
url = "http:/<YOURURL>:5984";
const couchDB = new CouchServer(url);

// Delete the database named 'crm'
await couchDB.delete("crm");
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
- singleton, describes the service approach of this data model. A singleton data model can have just one document for this kind, otherwsie we have a collection approach, with multiple documents of this kind
- properties, contains all properties of this data model, in this case 3 properties without further specifications

Once defined the data model, we can include it into a our organization namespace

`organization-namespace.js`

```js
import { Namespace } from "couchdbjs";
import CompanyDataModel from "company-datamodel.js";

export class OrganizationNamespace extends Namespace {
	constructor() {
		super();

		this.name = "organization";
		this.useModel(CompanyDataModel);
	}
}
```

The above code does two things:

- Define a proper name for the namespace (it will be used as parte of the document's id)
- Identify which model this namespace contains

Behind the scene, a class (of type Entity) is programmatically defined in order to support the data model js object

Last step is to assign this namespace to our database

`myCrmDatabase.js`

```js
import { CouchDatabase } from "couchdbjs";
import { OrganizationNamespace } from "organization-namespace.js";
import { SalesNamespace } from "sales-namespace.js";

class MyCRMDatabase extends CouchDatabase {
	constructor(nanoDb) {
		super(nanoDb);

		this.useNamespace(new OrganizationNamespace());
		this.useNamespace(new SalesNamespace());
	}
}
```

A CouchDatabase instance is never created directly, but using the server as we will seen in a few moment. The server class will pass to the constructor the nanoDb instance. At the same time we will define wich namespace are included in this database (and all data models defined in those namespaces)

Behind the scene, different classes are created and several properties are added to this class in order to easily access data.

Once our database is ready we can create our first document

`myCrmDatabase.js`

```js
import { CouchServer } from "couchdbjs";
import { MyCRMDatabase } from "myCrmDatabase.js";

// Create a server instance
url = "http:/<YOURURL>:5984";
const couchServer = new CouchServer(url);

// Use the crm database
const db = await couchServer.use("crm", MyCRMDatabase);

// Create a company document
const company = db.data.organization.company.create();
company.name = "ACME Inc.";
company.address = "1020 main street";
company.revenue = 350000;
await company.save();
```

Let's review what has been done here:

1. Created a new instance of a CouchServer, we open the database 'crm' by providing wich database class should be used (and all schemas associated)
2. The db variable is an instance of our MyCRMDatabase
3. Inside db we have the property 'data' who contains all methods to access data
4. Inside data there is a property for each namespace, so we selected the one related to the organization
5. Inside that, there is a property for each data service (one for each data model).
6. create() methods is a factory method to create a new class of type Entity that contains all properties we defined for our data model
7. Async save() method in this entity class allows us to save it

### Singleton or Collections

As we wrote, a data model can be a singleton or a collection. In the example above company was a singleton, so this means we could have max 1 document with the following id: organization/company:
`namespace/typeName`

For collections, we could have several document for the same data type, for example:

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

In this case we should have different documents with the following id: organization/user/[unique-id]: `namespace/typeName/timestamp-r4d`

As you see above the unique id is automatically created using the timestamp at the moment of saving concatenated with a random 4 digits number

Data services for collections have several methods (i.e. find() ) that those for singletons do not have

### Entity Class

We named this concept of an entity class, let's try to explain what that is.

An entity class is a wrapper of the json document exchanged with CouchDB in order to improve validation, control and transformations.

1. For each property defined in the data model, a getter/setter is created in the entity class
2. A validation engine is built-in to check the entity
3. Methods like import() or export() allow to import or export a json document
4. An entity class msut be create by using the create() method from the data service as we have seen in the previous example

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

In this case default attribute is a static value, we can also use the functional version of it. (no args are passed to the function)

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

Note that in the computed function no arg is passed, must be used 'this' to address entity values

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

#### Hasing and Encyprion

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

[1]: https://npmjs.org
[2]: https://github.com/apache/couchdb-nano/issues
[4]: https://github.com/apache/couchdb-nano/blob/main/cfg/couch.example.js
[8]: https://webchat.freenode.net?channels=%23couchdb-dev
[axios]: https://github.com/axios/axios
