import Document from "../models/Document.js";
import blockchainService from "../services/blockchain.service.js";
import { getFilePath } from "../services/storage.service.js";
import fs from "fs/promises";

export async function shareDoc(req, res) {
    const { docId, targetPubKey } = req.body;
    const userId = req.user._id.toString();
    
    const doc = await Document.findOne({ docId });
    if (!doc) return res.status(404).json({ ok: false, error: "Document not found" });
    
    // Only owner or issuer can share
    if (doc.owner.toString() !== userId && doc.issuer.toString() !== userId) {
        return res.status(403).json({ ok: false, error: "Not authorized to share this document" });
    }

    await blockchainService.shareDoc(docId, targetPubKey);
    res.json({ ok: true });
}

export async function revokeDoc(req, res) {
    const { docId } = req.body;
    const userId = req.user._id.toString();
    
    const doc = await Document.findOne({ docId });
    if (!doc) return res.status(404).json({ ok: false, error: "Document not found" });
    
    // Only issuer can revoke
    if (doc.issuer.toString() !== userId) {
        return res.status(403).json({ ok: false, error: "Only issuer can revoke documents" });
    }

    await blockchainService.revokeDoc(docId);
    res.json({ ok: true });
}

export async function downloadDoc(req, res) {
    const docId = req.params.id;
    const userId = req.user._id.toString();
    
    const doc = await Document.findOne({ docId });
    if (!doc) return res.status(404).json({ ok: false, error: "Document not found" });
    
    // Check access
    if (doc.owner.toString() !== userId && doc.issuer.toString() !== userId) {
        return res.status(403).json({ ok: false, error: "Not authorized to download this document" });
    }

    try {
        const filePath = getFilePath(docId);
        const fileBuffer = await fs.readFile(filePath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${docId}.pdf"`);
        res.send(fileBuffer);
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).json({ ok: false, error: "Failed to download file" });
    }
}