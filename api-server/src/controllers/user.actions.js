import Document from "../models/Document.js";
import User from "../models/User.js";
import blockchainService from "../services/blockchain.service.js";
import { decrypt } from "../utils/crypto.js";
import { getFilePath, deleteFile } from "../services/storage.service.js";
import fs from "fs/promises";

export async function shareDoc(req, res) {
    const { docId, targetPubKey } = req.body;
    const userId = req.user._id.toString();

    const doc = await Document.findOne({ docId, status: 'active' });
    if (!doc) return res.status(404).json({ ok: false, error: "Document not found or has been revoked" });
    
    // Only owner or issuer can share
    if (doc.owner.toString() !== userId && doc.issuer.toString() !== userId) {
        return res.status(403).json({ ok: false, error: "Not authorized to share this document" });
    }

    try {
        // Determine which user's private key should sign the SHARE tx.
        // Either the owner or the issuer may initiate a share.
        let signerPriv;

        // If the requester is the owner, use their private key
        if (doc.owner.toString() === userId) {
            signerPriv = decrypt(req.user.blockchainPrivateKeyEnc);
        } else if (doc.issuer.toString() === userId) {
            // Requester is the issuer - use issuer's stored private key
            const issuer = await User.findById(doc.issuer);
            if (!issuer) return res.status(404).json({ ok: false, error: "Document issuer not found." });
            signerPriv = decrypt(issuer.blockchainPrivateKeyEnc);
        } else {
            return res.status(403).json({ ok: false, error: "Not authorized to share this document" });
        }

        if (!signerPriv) {
            console.error('shareDoc controller error: signer private key could not be decrypted');
            return res.status(500).json({ ok: false, error: 'Signer private key not available' });
        }

        // POST to blockchain (may fail if blockchain is empty, but we store it locally anyway)
        try {
            await blockchainService.shareDoc(docId, targetPubKey, signerPriv);
        } catch (blockchainErr) {
            console.warn(`[shareDoc] Blockchain share failed (blockchain may be empty), but recording share in DB: ${blockchainErr.message}`);
            // Continue - we'll record the share in MongoDB even if blockchain fails
        }

        // Record the share in the Document record (local source of truth)
        // Normalize the targetPubKey to handle whitespace variations
        const normalizedTargetPubKey = (targetPubKey || '').trim();
        if (!doc.shares) doc.shares = [];
        // Only add if not already shared with this key
        if (!doc.shares.some(key => key === normalizedTargetPubKey)) {
            doc.shares.push(normalizedTargetPubKey);
            await doc.save();
            console.log(`[shareDoc] Recorded share for ${docId} to target pubkey (first 50 chars): ${normalizedTargetPubKey.slice(0, 50)}...`);
        }

        res.json({ ok: true });
    } catch (err) {
        console.error('shareDoc controller error', err?.message || err);
        res.status(500).json({ ok: false, error: err.message });
    }
}

export async function revokeDoc(req, res) {
    const { docId } = req.body;
    const userId = req.user._id.toString();
    
    const doc = await Document.findOne({ docId });
    if (!doc) return res.status(404).json({ ok: false, error: "Document not found" });
    if (doc.status === 'revoked') return res.status(400).json({ ok: false, error: "Document has already been revoked." });
    
    // Only the original issuer of the document can revoke it.
    if (doc.issuer.toString() !== userId) {
        return res.status(403).json({ ok: false, error: "Only the original document issuer can perform a revoke." });
    }

    try {
        // Since the logged-in user is the issuer, we can use their details directly from req.user.
        const issuerPriv = decrypt(req.user.blockchainPrivateKeyEnc);
        if (!issuerPriv) {
            console.error(`Revoke failed: Private key for issuer ${userId} is missing or could not be decrypted.`);
            return res.status(500).json({ ok: false, error: "Could not retrieve issuer key for signing." });
        }

        await blockchainService.revokeDoc(docId, issuerPriv);

        // Mark as revoked in the database
        doc.status = 'revoked';
        await doc.save();

        // Delete the file from storage
        await deleteFile(docId);

        res.json({ ok: true, message: "Document revoked and file deleted successfully." });
    } catch (err) {
        // This will now log the specific error from the blockchain service.
        console.error('revokeDoc controller error:', err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
}

export async function downloadDoc(req, res) {
    const docId = req.params.id;
    const userId = req.user._id.toString();
    const userPubKey = req.user.blockchainPublicKey;
    
    const doc = await Document.findOne({ docId });
    if (!doc) return res.status(404).json({ ok: false, error: "Document not found" });
    
    if (doc.status === 'revoked') {
        return res.status(404).json({ ok: false, error: "This document has been revoked and can no longer be downloaded." });
    }

    // Check access: owner, issuer, or has been shared with user
    const isOwner = doc.owner.toString() === userId;
    const isIssuer = doc.issuer.toString() === userId;
    const isShared = doc.shares && doc.shares.some(shareKey => {
        const normalizedShare = (shareKey || '').trim();
        const normalizedUser = (userPubKey || '').trim();
        return normalizedShare === normalizedUser;
    });

    console.log(`[downloadDoc] docId=${docId}, userId=${userId}, userPubKey=${userPubKey?.slice(0, 50)}..., isOwner=${isOwner}, isIssuer=${isIssuer}, isShared=${isShared}, shares=${doc.shares?.length || 0}`);

    if (!isOwner && !isIssuer && !isShared) {
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
        if (err.code === 'ENOENT') {
            return res.status(404).json({ ok: false, error: "File not found. It may have been deleted." });
        }
        res.status(500).json({ ok: false, error: "Failed to download file" });
    }
}

export async function listUsers(req, res) {
    try {
        const users = await User.find().select('name email role blockchainPublicKey').lean();
        res.json({ ok: true, users });
    } catch (err) {
        console.error('listUsers error', err);
        res.status(500).json({ ok: false, error: 'Failed to fetch users' });
    }
}
