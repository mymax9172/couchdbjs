import CryptoJS from "crypto-js";

export const security = {
	secretKey: "AGw89hDFFxz1",

	/**
	 * Encrypt the value
	 * @param {*} value
	 */
	encryption(value) {
		if (!value) return value;
		return CryptoJS.AES.encrypt(value.toString(), this.secretKey).toString();
	},

	/**
	 * Hash the value
	 * @param {*} value
	 * @returns {string}
	 */
	hash(value) {
		if (!value) return value;
		return CryptoJS.SHA256(value).toString();
	},

	/**
	 * Decrypt the value
	 * @param {string} value Value to decrypt
	 */
	decryption(value) {
		if (!value) return value;

		// Decrypt it
		return CryptoJS.AES.decrypt(value, this.secretKey).toString(
			CryptoJS.enc.Utf8
		);
	},
};
