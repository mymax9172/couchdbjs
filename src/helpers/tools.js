/**
 * Check if the argument has been properly passed
 * @param {String} argumentName Name of the argument
 * @param {*} value Value of the argument
 * @returns {Boolean} True if the argument is given
 */
export function checkMandatoryArgument(argumentName, value) {
	if (!value) throw new Error("<" + argumentName + "> argument is missing");
}

/**
 * Get the value of an attribute either it is a static value or a function
 * @param {String} attribute Attribute to be read
 * @param {...*} args Any argument to be passed in case of function
 * @returns {*} Value of the attribute
 */
export function getValueOrFunction(attribute, ...args) {
	if (attribute == null) return null;
	if (typeof attribute === "function") return attribute(...args);
	else return attribute;
}

/**
 * Validate a set of rule against a value
 * @param {*} value Value to be validated
 * @param {Array} rules List of rules
 * @param {...*} args Optional arguments to be passed to each rule
 * @returns {Boolean | String} True if validation is passes, a message string if it failed
 */
export function checkRules(value, rules, ...args) {
	var validation = true;
	rules.forEach((rule) => {
		if (validation === true) {
			const result = rule(value, ...args);
			if (typeof result === "string") {
				validation = result;
			}
		}
	});
	return validation;
}
