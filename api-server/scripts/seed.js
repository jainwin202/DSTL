import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import { generateKeyPair } from "../src/services/blockchain.service.js";
import { encrypt } from "../src/utils/crypto.js";

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // ---- USERS TO CREATE ----
  const seedUsers = [
    {
      name: "Admin Issuer",
      email: process.env.ADMIN_EMAIL || "issuer@example.com",
      password: process.env.ADMIN_PASSWORD || "issuer123",
      role: "issuer"
    },
    {
      name: "Test User",
      email: "user@example.com",
      password: "user123",
      role: "user"
    }
  ];

  for (const u of seedUsers) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log(`⤵️ User already exists: ${u.email}`);
      continue;
    }

    const hashed = await bcrypt.hash(u.password, 10);
    const { pub, priv } = generateKeyPair();
    const privEnc = encrypt(priv);

    await User.create({
      name: u.name,
      email: u.email,
      password: hashed,
      role: u.role,
      blockchainPublicKey: pub,
      blockchainPrivateKeyEnc: privEnc
    });

    console.log(`✅ Created: ${u.email} (${u.role})`);
  }

  process.exit(0);
}

seed();
