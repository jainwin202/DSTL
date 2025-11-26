import dotenv from "dotenv";
import mongoose from "mongoose";
import Document from "./src/models/Document.js";
import User from "./src/models/User.js";
import blockchainService from "./src/services/blockchain.service.js";
import { decrypt } from "./src/utils/crypto.js";

dotenv.config();

async function issueAllDocuments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/edu-ledger');
    console.log("Connected to MongoDB");

    // Find all documents that don't have a txHash yet
    const docs = await Document.find({}).populate("issuer owner");
    console.log(`Found ${docs.length} documents`);

    for (const doc of docs) {
      console.log(`\nProcessing: ${doc.metadata?.title || doc.docId}`);

      if (doc.metadata?.txHash) {
        console.log(`  ⚠ Found existing txHash (${doc.metadata.txHash.substring(0, 8)}...). Forcing re-issue to ensure blockchain state.`);
      }

      try {
        // Get issuer's decrypted private key
        const issuerPriv = decrypt(doc.issuer.blockchainPrivateKeyEnc);
        
        console.log(`  Issuing to blockchain...`);
        const result = await blockchainService.issueDoc(
          doc.docId,
          doc.hash || "0x0",
          doc.owner.blockchainPublicKey,
          issuerPriv
        );

        console.log(`  ✓ Issued successfully! TX: ${result.tx.substring(0, 8)}...`);

        // Update document with txHash
        await Document.updateOne(
          { docId: doc.docId },
          { $set: { "metadata.txHash": result.tx, "metadata.ownerPubKey": doc.owner.blockchainPublicKey } }
        );
        
        console.log(`  Updated document metadata`);
      } catch (error) {
        console.error(`  ✗ Failed:`, error.message);
      }
    }

    console.log("\nDone!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

issueAllDocuments();
