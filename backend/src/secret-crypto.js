import {
  createCipheriv,
  createDecipheriv,
  randomBytes as secureRandomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const FORMAT_VERSION = "v1";
const NONCE_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const ADDITIONAL_DATA = Buffer.from("qts-portal-integration-secret-v1", "utf8");

function decodeKey(encodedKey) {
  if (typeof encodedKey !== "string" || encodedKey.trim() === "") {
    throw new Error("QTS_DATA_ENCRYPTION_KEY is required for integration secrets.");
  }
  const key = Buffer.from(encodedKey.trim(), "base64");
  if (key.length !== 32) {
    throw new Error("QTS_DATA_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return key;
}

export function createSecretCipher({
  encodedKey,
  randomBytes = secureRandomBytes,
} = {}) {
  const key = decodeKey(encodedKey);

  return Object.freeze({
    encrypt(plaintext) {
      if (typeof plaintext !== "string" || plaintext.length === 0) {
        throw new Error("Secret plaintext is required.");
      }
      const nonce = randomBytes(NONCE_BYTES);
      const cipher = createCipheriv(ALGORITHM, key, nonce, {
        authTagLength: AUTH_TAG_BYTES,
      });
      cipher.setAAD(ADDITIONAL_DATA);
      const ciphertext = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();
      return [
        FORMAT_VERSION,
        nonce.toString("base64url"),
        ciphertext.toString("base64url"),
        authTag.toString("base64url"),
      ].join(".");
    },

    decrypt(payload) {
      if (typeof payload !== "string") throw new Error("Encrypted secret is invalid.");
      const [version, noncePart, ciphertextPart, authTagPart, extra] = payload.split(".");
      if (
        version !== FORMAT_VERSION ||
        !noncePart ||
        !ciphertextPart ||
        !authTagPart ||
        extra !== undefined
      ) {
        throw new Error("Encrypted secret format is invalid.");
      }
      const nonce = Buffer.from(noncePart, "base64url");
      const ciphertext = Buffer.from(ciphertextPart, "base64url");
      const authTag = Buffer.from(authTagPart, "base64url");
      if (nonce.length !== NONCE_BYTES || authTag.length !== AUTH_TAG_BYTES) {
        throw new Error("Encrypted secret format is invalid.");
      }
      const decipher = createDecipheriv(ALGORITHM, key, nonce, {
        authTagLength: AUTH_TAG_BYTES,
      });
      decipher.setAAD(ADDITIONAL_DATA);
      decipher.setAuthTag(authTag);
      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8");
    },
  });
}
