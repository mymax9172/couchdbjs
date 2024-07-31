import { CouchServer } from "../src/database/couchServer.js";
import { SampleCRMSchema } from "./sampleCRM.js";
import { faker } from "@faker-js/faker";
import "dotenv/config";

// Sample database
const dbName = "sample-crm";
const settings = {
	users: 10,
	companies: 50,
	contacts: 100,
};

// Create a server instance
const server = new CouchServer(process.env.URL, process.env.PORT, {
	username: process.env.USER,
	password: process.env.PASSWORD,
});

// Get server info
const info = await server.getInfo();
console.log(info);

// Check if the database exist, in case delete it
if (await server.exists(dbName)) {
	await server.delete(dbName);
}

// Create a new database
const result = await server.create(dbName, SampleCRMSchema);
console.log("Database creation", result);

// Open the database
const database = await server.use(dbName);

// Create roles
const roles = [];
const roleInput = [
	{ type: "security/role", name: "Admin", description: "Administrator" },
	{ type: "security/role", name: "User", description: "User" },
	{ type: "security/role", name: "Sales", description: "Sales representative" },
	{
		type: "security/role",
		name: "Presales",
		description: "Solution consuntant",
	},
];

for (let i = 0; i < roleInput.length; i++) {
	const item = database.data.security.role.create();
	item.import(roleInput[i]);
	roles.push(item);
}
await database.data.security.role.saveAll(roles);
console.log(roleInput.length + " roles created");

// Create users
const users = [];

for (let i = 0; i < settings.users; i++) {
	const item = database.data.security.user.create();
	item.username = faker.internet.userName();
	item.password = faker.internet.password();
	item.employeeNumber =
		"SN-" + String(Math.floor(Math.random() * 100000)).padStart(6, "0");
	item.roleList.add(roles[0]);

	const response = await fetch("https://thispersondoesnotexist.com");
	process.stdout.write(".");
	if (response.ok) {
		const blob = await response.blob();
		const buffer = Buffer.from(await blob.arrayBuffer());
		item.avatar.add("picture.jpeg", "image/jpeg", buffer);
	}

	users.push(item);
}
await database.data.security.user.saveAll(users);
console.log(settings.users + " users created");

// Create companies
const companies = [];
for (let i = 0; i < settings.companies; i++) {
	const item = database.data.business.company.create();
	item.name = faker.company.name();

	const mainAddress = database.namespaces.business.createEntity("address");
	mainAddress.streetName = faker.location.streetAddress();
	mainAddress.zipCode = faker.location.zipCode();
	mainAddress.location = faker.location.city();
	mainAddress.state = faker.location.state();
	mainAddress.country = faker.location.country();
	item.mainAddress = mainAddress;

	companies.push(item);
}
await database.data.business.company.saveAll(companies);
console.log(settings.companies + " companies created");

// Create contacts
const contacts = [];
for (let i = 0; i < settings.contacts; i++) {
	const item = database.data.business.contact.create();
	item.firstName = faker.person.firstName();
	item.lastName = faker.person.lastName();
	item.company = companies[Math.floor(Math.random() * companies.length)].id;
	contacts.push(item);
}
await database.data.business.contact.saveAll(contacts);
console.log(settings.contacts + " contacts created");
