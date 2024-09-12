export const coding = {
	serialize(value) {
		function isClass(v) {
			return typeof v === "function" && /^\s*class\s+/.test(v.toString());
		}

		if (["function", "object"].includes(typeof value)) {
			if (typeof value === "function") {
				if (isClass(value)) {
					// Class ..... to do
					return undefined;
				} else {
					// Function
					return this.transformFunction(value);
				}
			} else {
				// Object
				if (value == null) return value;
				if (Array.isArray(value)) {
					// Array
					const result = value.map((e) => this.serialize(e));
					return result;
				} else {
					// Object
					const result = {};
					Object.keys(value).forEach((key) => {
						const element = value[key];
						result[key] = this.serialize(element);
					});
					return result;
				}
			}
		} else {
			return value;
		}
	},

	deserialize(value) {
		if (typeof value === "object") {
			if (value == null) return value;
			if (Array.isArray(value)) {
				// Array
				const result = value.map((e) => this.deserialize(e));
				return result;
			} else {
				// Object
				if (value.$type === "function") {
					// Function
					return new Function(...value.$args, value.$body);
				} else {
					const result = {};
					Object.keys(value).forEach((key) => {
						const element = value[key];
						result[key] = this.deserialize(element);
					});
					return result;
				}
			}
		} else return value;
	},

	transformFunction(f) {
		var name, args, body;

		// Stringify and replace tabulations
		const fS = f
			.toString()
			.replaceAll("\r", "")
			.replaceAll("\t", "")
			.replaceAll("\n", "");

		// Retrieve indexes
		const i1 = fS.indexOf("(");
		const i2 = fS.indexOf(")");
		const i3 = fS.indexOf("=>");

		// Function name
		name = fS.substring(0, i1);

		// Function args
		if (i2 - i1 === 1) args = [];
		else args = fS.substring(i1 + 1, i2).split(",");

		// Body
		if (i3 > 0 && fS.substring(i2 + 1, i3).trim() === "") {
			// Arrow function
			let i4 = fS.indexOf("{", i3);
			if (i4 === -1) {
				body = "return " + fS.substring(i3 + 2).trim();
			} else {
				const m = fS.substring(i3 + 2, i4).trim();
				if (m.length === 0) body = fS.substring(i4 + 1, fS.length - 1).trim();
				else body = "return " + fS.substring(i3 + 2).trim();
			}
		} else {
			// Standard method
			let i4 = fS.indexOf("{");
			body = fS.substring(i4 + 1, fS.length - 1).trim();
		}

		return {
			$type: "function",
			$args: args,
			$body: body,
		};
	},
};
