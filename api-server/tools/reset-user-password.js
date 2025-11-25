import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../src/models/User.js';

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Please set MONGO_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const email = process.argv[2];
  const newPassword = process.argv[3];
  if (!email || !newPassword) {
    console.error('Usage: node tools/reset-user-password.js user@example.com newPassword123');
    process.exit(1);
  }

  const user = await User.findOne({ email });
  if (!user) {
    console.error('User not found:', email);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  user.password = hashed;
  await user.save();

  console.log(`Password for ${email} updated successfully.`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
