// Example
const response = await fetch("https://thispersondoesnotexist.com");
//console.log(response);

if (!response.ok) {
	throw new Error(`Response status: ${response.status}`);
} else {
	console.log("OK");

	console.log(await response.text());
}
