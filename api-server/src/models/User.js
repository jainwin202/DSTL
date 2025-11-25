import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }, // bcrypt hashed
  role: { type: String, enum: ["issuer", "user"], default: "user" },

  // blockchain identity
  blockchainPublicKey: { type: String, required: true },
  blockchainPrivateKeyEnc: { type: String, required: true }, // AES encrypted private key

}, { timestamps: true });

export default mongoose.model("User", userSchema);
