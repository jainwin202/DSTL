// tools/decrypt-user-key.js
import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import { decrypt } from "../src/utils/crypto.js";

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("Please set MONGO_URI in .env");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node tools/decrypt-user-key.js user@example.com");
    process.exit(1);
  }

  const user = await User.findOne({ email });
  if (!user) {
    console.error("User not found:", email);
    process.exit(1);
  }

  console.log("User record (partial):");
  console.log({
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    blockchainPublicKey: user.blockchainPublicKey?.slice(0, 80) + "..."
  });

  try {
    const priv = decrypt(user.blockchainPrivateKeyEnc);
    console.log("\nDecrypted private key (PEM):\n", priv);
  } catch (e) {
    console.error("Failed to decrypt private key:", e.message);
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });