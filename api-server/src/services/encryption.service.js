// encryption.service.js
// Small wrapper around utils/crypto.js so other services import a consistent API.

import { encrypt as aesEncrypt, decrypt as aesDecrypt } from "../utils/crypto.js";

/**
 * Encrypt a private key (PEM string) for storage.
 * @param {string} plainPrivKeyPem
 * @returns {string} encrypted string (iv:hex:enc:hex)
 */
export function encryptPrivateKey(plainPrivKeyPem) {
  return aesEncrypt(plainPrivKeyPem);
}

/**
 * Decrypt a stored private key.
 * @param {string} encryptedPrivKey
 * @returns {string} plain PEM private key
 */
export function decryptPrivateKey(encryptedPrivKey) {
  return aesDecrypt(encryptedPrivKey);
}

export default {
  encryptPrivateKey,
  decryptPrivateKey
};
