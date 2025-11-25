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
  // CRITICAL FIX: Wrap decryption in a try/catch block.
  // If the hash is invalid, null, or decryption fails, this prevents a server crash
  // and ensures the function returns null, which can be handled gracefully.
  try {
    if (!hash || typeof hash !== 'string' || !hash.includes(':')) {
      console.error("Decrypt Error: Invalid or missing hash provided.");
      return null;
    }

    const [ivHex, contentHex] = hash.split(":");
    if (!ivHex || !contentHex) {
        console.error("Decrypt Error: Incomplete encrypted payload.");
        return null;
    }

    const iv = Buffer.from(ivHex, "hex");
    const content = Buffer.from(contentHex, "hex");
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    
    const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("An unexpected error occurred during decryption:", error.message);
    return null;
  }
}
