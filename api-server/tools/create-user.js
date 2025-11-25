import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../src/models/User.js';
import { generateKeyPair } from '../src/services/blockchain.service.js';
import { encrypt } from '../src/utils/crypto.js';

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Please set MONGO_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const name = process.argv[2];
  const email = process.argv[3];
  const password = process.argv[4];
  const role = process.argv[5] || 'user';

  if (!name || !email || !password) {
    console.error('Usage: node tools/create-user.js "Full Name" user@example.com password [role]');
    process.exit(1);
  }

  const exists = await User.findOne({ email });
  if (exists) {
    console.error('User already exists:', email);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 10);
  // generate blockchain keys
  const { publicKey, privateKey } = generateKeyPair();
  const privEnc = encrypt(privateKey);

  const user = await User.create({
    name,
    email,
    password: hashed,
    role,
    blockchainPublicKey: publicKey,
    blockchainPrivateKeyEnc: privEnc
  });

  console.log('Created user:', { id: user._id.toString(), email: user.email, role: user.role });
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
