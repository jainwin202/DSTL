import crypto from "crypto";

// Use AES-256-CTR. Ensure key is 32 bytes by deriving it from the secret with SHA-256.
const ALGO = "aes-256-ctr";
const SECRET = process.env.PRIV_KEY_SECRET || "super-secret-password";

function getKey() {
  // Derive 32-byte key from SECRET. This avoids invalid key length errors.
  return crypto.createHash("sha256").update(String(SECRET)).digest();
}

export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(hash) {
  const [ivHex, contentHex] = String(hash).split(":");
  if (!ivHex || !contentHex) throw new Error("Invalid encrypted payload");
  const iv = Buffer.from(ivHex, "hex");
  const content = Buffer.from(contentHex, "hex");
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  return Buffer.concat([decipher.update(content), decipher.final()]).toString("utf8");
}
