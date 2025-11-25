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
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Document", docSchema);
