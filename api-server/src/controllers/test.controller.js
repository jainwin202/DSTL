import User from "../models/User.js";
import Document from "../models/Document.js";
import blockchainService from "../services/blockchain.service.js";
import { decrypt } from "../utils/crypto.js";

// Dev-only helper to create an ISSUE tx and a Document record so share can be tested.
export async function testIssue(req, res) {
    try {
        if (process.env.NODE_ENV === 'production') return res.status(403).json({ ok: false, error: 'Not allowed in production' });

        const { docId } = req.body || {};
        const id = docId || `TEST-${Date.now()}`;

        const issuer = await User.findOne({ role: 'issuer' });
        if (!issuer) return res.status(400).json({ ok: false, error: 'No issuer user found. Please seed users.' });

        const issuerPriv = decrypt(issuer.blockchainPrivateKeyEnc);
        if (!issuerPriv) return res.status(500).json({ ok: false, error: 'Could not decrypt issuer private key' });

        // Default: issuer is both issuer AND owner (so they can immediately share)
        const owner = issuer;

        const ownerPub = owner.blockchainPublicKey;
        // Create a simple dummy hash for the document
        const hash = `hash-${Math.random().toString(36).slice(2, 12)}`;

        console.log(`testIssue: creating ISSUE for docId=${id}, issuer=${issuer.email}, owner=${owner.email}`);

        // Issue on-chain (with timeout)
        const issuePromise = blockchainService.issueDoc(id, hash, ownerPub, issuerPriv);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('issueDoc timeout after 10s')), 10000)
        );
        await Promise.race([issuePromise, timeoutPromise]);
        console.log(`testIssue: ISSUE tx posted for ${id}`);

        // Create Document record in Mongo (owner = issuer so issuer can share)
        const doc = await Document.create({ docId: id, issuer: issuer._id, owner: issuer._id, metadata: { title: 'Test Document' }, filePath: '' });
        console.log(`testIssue: Document record created in Mongo: ${doc._id}`);

        res.json({ ok: true, docId: id, issuer: issuer.email, owner: owner.email });
    } catch (err) {
        console.error('testIssue error', err);
        res.status(500).json({ ok: false, error: err.message });
    }
}
