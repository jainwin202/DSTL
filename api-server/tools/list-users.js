import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Please set MONGO_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const users = await User.find().select('name email role password blockchainPublicKey blockchainPrivateKeyEnc').lean();

  console.log('Found', users.length, 'users');
  for (const u of users) {
    console.log('---');
    console.log('id:  ', u._id.toString());
    console.log('name:', u.name);
    console.log('email:', u.email);
    console.log('role: ', u.role);
    console.log('password (bcrypt hash):', u.password);
    console.log('blockchainPublicKey (truncated):', u.blockchainPublicKey ? u.blockchainPublicKey.slice(0, 80) + '...' : null);
    console.log('blockchainPrivateKeyEnc (truncated):', u.blockchainPrivateKeyEnc ? u.blockchainPrivateKeyEnc.slice(0, 60) + '...' : null);
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
