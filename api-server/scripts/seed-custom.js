import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import { generateKeyPair } from "../src/services/blockchain.service.js";
import { encrypt } from "../src/utils/crypto.js";
import { customUsers } from "./custom-users.js";

async function seedCustom() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  for (const u of customUsers) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log(`⤵️ Custom user already exists: ${u.email}`);
      continue;
    }

    const hashed = await bcrypt.hash(u.password, 10);
    const { publicKey, privateKey } = generateKeyPair();
    const privEnc = encrypt(privateKey);

    await User.create({
      name: u.name,
      email: u.email,
      password: hashed,
      role: u.role,
      blockchainPublicKey: publicKey,
      blockchainPrivateKeyEnc: privEnc
    });

    console.log(`✅ Created custom user: ${u.email} (${u.role})`);
  }

  process.exit(0);
}

seedCustom();
