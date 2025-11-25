import mongoose from "mongoose";

const docSchema = new mongoose.Schema({
  docId: { type: String, unique: true },
  issuer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  metadata: { type: Object },
  filename: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Document", docSchema);
