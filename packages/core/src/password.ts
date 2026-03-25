/**
 * Decrypts a ciphertext blob produced by {@link encrypt} and returns the
 * plaintext as a UTF-8 string.  Thin wrapper kept for call-site clarity.
 */
export { decrypt, decrypt as decryptToString, encrypt } from "./storage/crypto.js";
