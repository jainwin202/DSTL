import mongoose from "mongoose";

const docSchema = new mongoose.Schema({
  docId: { type: String, unique: true },
  issuer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  metadata: { type: Object },
  status: { type: String, enum: ['active', 'revoked'], default: 'active' },
  // CRITICAL FIX: Changed 'filename' to 'filePath' to match what is being saved
  // in the issuer.controller.js. This ensures the file path is correctly stored.
  filePath: String,
  // Track which users this document has been shared with (by their blockchain public key)
  // This allows visibility without relying entirely on blockchain state which may be empty
  shares: [{ type: String }], // array of user blockchainPublicKeys
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Document", docSchema);
