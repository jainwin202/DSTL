import crypto from "crypto";
import Document from "../models/Document.js";
import { saveFile } from "../services/storage.service.js";
import blockchainService from "../services/blockchain.service.js";
import { decrypt } from "../utils/crypto.js";

export async function uploadDocument(req, res) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ ok: false, error: "No file uploaded" });

    const ownerId = req.body.ownerId;
    if (!ownerId) return res.status(400).json({ ok: false, error: "Missing ownerId" });

    // generate docId
    const docId = crypto.randomUUID();

    // generate sha256 hash of file
    const fileHash = crypto.createHash("sha256").update(file.buffer).digest("hex");

    // save local file
    const filePath = saveFile(docId, file.buffer);

    // save metadata in DB
    const doc = await Document.create({
      docId,
      filePath,
      hash: fileHash,
      issuer: req.user._id,
      owner: ownerId,
      metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
    });

    try {
        // Generate key pair for document owner
        console.log('Generating blockchain keys for document');
        const ownerKeys = blockchainService.generateKeyPair();
        
        // Get issuer's private key
        console.log('Getting issuer private key');
        const issuerPriv = decrypt(req.user.blockchainPrivateKeyEnc);
        
        // Issue document on blockchain
        console.log('Issuing document on blockchain:', { docId, fileHash });
        const result = await blockchainService.issueDoc(
            docId,
            fileHash,
            ownerKeys.publicKey,
            issuerPriv
        );
        
        console.log('Blockchain transaction result:', result);

        // Update document metadata with keys
        await Document.findOneAndUpdate(
            { docId },
            { 
                $set: { 
                    'metadata.ownerPubKey': ownerKeys.publicKey,
                    'metadata.txHash': result.tx
                }
            }
        );
    } catch (error) {
        console.error('Error issuing document:', error);
        throw error;
    }

    res.json({ ok: true, docId, hash: fileHash });

  } catch (e) {
    console.error("UPLOAD ERR:", e.stack || e);
    res.status(500).json({ ok: false, error: e.message });
  }
}
