import axios from "axios";
import crypto from "crypto";

const BLOCKCHAIN_API = process.env.BLOCKCHAIN_API || "http://localhost:3001/api";

// Helper to validate PEM public key format
function isValidPublicKey(key) {
    if (typeof key !== 'string' || !key.includes('-----BEGIN PUBLIC KEY-----') || !key.includes('-----END PUBLIC KEY-----')) {
        return false;
    }
    // Strip header/footer and whitespace then verify base64 chars
    const body = key.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').replace(/\s/g, '');
    return /^[A-Za-z0-9+/=]+$/.test(body);
}

// Normalize a public key string into canonical PEM (SPKI PEM). Accepts:
// - Proper PEM with header/footer (any whitespace/newline variants)
// - Single-line PEM (headers present but no newlines)
// - Raw base64 body (wraps with PEM headers)
// Returns canonical PEM string or throws an Error with a helpful message.
function normalizePublicKey(input) {
    if (!input || typeof input !== 'string') throw new Error('No public key provided');
    const trimmed = input.trim();

    // Helper to wrap base64 body into PEM with 64-char lines
    function wrapPemBody(body) {
        const cleaned = body.replace(/\s+/g, '');
        const lines = cleaned.match(/.{1,64}/g) || [];
        return ['-----BEGIN PUBLIC KEY-----', ...lines, '-----END PUBLIC KEY-----'].join('\n') + '\n';
    }

    // If it already looks like a PEM, try to canonicalize
    if (trimmed.includes('-----BEGIN PUBLIC KEY-----') && trimmed.includes('-----END PUBLIC KEY-----')) {
        // Extract base64 body between headers
        const body = trimmed.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').replace(/\s+/g, '');
        if (!/^[A-Za-z0-9+/=]+$/.test(body)) {
            throw new Error('PEM public key contains invalid characters');
        }
        return wrapPemBody(body);
    }

    // If looks like base64 body (no headers), wrap it
    const maybeBase64 = trimmed.replace(/\s+/g, '');
    if (/^[A-Za-z0-9+/=]+$/.test(maybeBase64)) {
        return wrapPemBody(maybeBase64);
    }

    throw new Error('Unsupported public key format. Provide a PEM public key or the raw base64 SPKI body.');
}

function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
        namedCurve: "secp256k1",
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });
    return { privateKey, publicKey };
}

async function getState() {
    const res = await axios.get(`${BLOCKCHAIN_API}/state`);
    return res.data;
}

async function getPending() {
    const res = await axios.get(`${BLOCKCHAIN_API}/pending`);
    return res.data;
}

async function getAugmentedState() {
    // Retrieve on-chain state and pending txs and apply pending changes
    const state = await getState();
    const pending = await getPending();
    if (!state) return {};
    const augmented = JSON.parse(JSON.stringify(state));
    if (!Array.isArray(pending)) return augmented;

    for (const tx of pending) {
        const { type, payload, issuerPubKey } = tx;
        if (type === 'ISSUE') {
            const { docId, docHash, ownerPubKey, metadata } = payload;
            if (!augmented[docId]) augmented[docId] = { issuer: issuerPubKey, owner: ownerPubKey, hash: docHash, revoked: false, shares: [], metadata };
        }
        if (type === 'SHARE') {
            const { docId, to } = payload;
            if (augmented[docId] && !augmented[docId].revoked) {
                if (!augmented[docId].shares.includes(to)) augmented[docId].shares.push(to);
                augmented[docId].owner = to;
            }
        }
        if (type === 'REVOKE') {
            const { docId } = payload;
            if (augmented[docId]) augmented[docId].revoked = true;
        }
    }

    return augmented;
}

function getCanonicalTxData(tx) {
    const data = {
        type: tx.type,
        issuerPubKey: tx.issuerPubKey,
        payload: {}
    };

    if (tx.type === 'ISSUE') {
        data.payload = {
            docId: tx.payload.docId,
            docHash: tx.payload.docHash,
            ownerPubKey: tx.payload.ownerPubKey,
            metadata: tx.payload.metadata
        };
    } else if (tx.type === 'SHARE') {
        data.payload = {
            docId: tx.payload.docId,
            to: tx.payload.to
        };
    } else if (tx.type === 'REVOKE') {
        data.payload = {
            docId: tx.payload.docId
        };
    }

    return JSON.stringify(data);
}

function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

function signTransaction(data, privateKey) {
    if (!privateKey) {
        throw new Error('No key provided to sign');
    }
    try {
        return crypto.sign("sha256", Buffer.from(data), privateKey).toString("base64");
    } catch (err) {
        const e = new Error(`Failed to sign transaction: ${err.message}`);
        e.cause = err;
        throw e;
    }
}

async function issueDoc(docId, hash, ownerPubKey, issuerPrivKey) {
    try {
        if (!isValidPublicKey(ownerPubKey)) {
            throw new Error("A valid owner public key was not provided to issueDoc.");
        }
        if (!issuerPrivKey || !issuerPrivKey.includes("BEGIN PRIVATE KEY")) {
            throw new Error("Invalid issuer private key format - must be PEM");
        }
        const tx = {
            type: "ISSUE",
            payload: { docId, docHash: hash, ownerPubKey, metadata: {} },
            issuerPubKey: crypto.createPublicKey(issuerPrivKey).export({ type: 'spki', format: 'pem' })
        };
        const dataToSign = getCanonicalTxData(tx);
        const signature = signTransaction(dataToSign, issuerPrivKey);
        console.log(`[issueDoc] Posting ISSUE tx for docId=${docId} to ${BLOCKCHAIN_API}/tx/issue`);
        const res = await axios.post(`${BLOCKCHAIN_API}/tx/issue`, { ...tx, signature }, { 
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        });
        if (!res.data.ok) {
            throw new Error(res.data.error || 'Blockchain transaction failed');
        }
        console.log(`[issueDoc] ISSUE tx accepted by blockchain for docId=${docId}`);

        // Poll for the doc to appear in state or pending list (short-lived polling)
        const txHash = res.data.tx;
        const maxAttempts = 10;
        let found = false;
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const state = await getState();
                if (state && state[docId]) { found = true; break; }
                const pending = await getPending();
                if (Array.isArray(pending) && pending.find(p => p.hash === txHash)) { found = true; break; }
            } catch (e) {
                console.warn(`[issueDoc] Polling attempt ${i+1} failed: ${e.message}`);
            }
            await sleep(500);
        }
        if (!found) console.warn(`Issue tx ${txHash} not visible in state/pending after polling; continuing.`);

        return { ...res.data, ownerPubKey };
    } catch (err) {
        console.error('issueDoc Error:', { message: err.message, response: err.response?.data, code: err.code });
        throw err;
    }
}

async function shareDoc(docId, targetPubKey, ownerPrivKey) {
    try {
        if (!ownerPrivKey || !ownerPrivKey.includes('BEGIN PRIVATE KEY')) {
            throw new Error('Invalid signer private key format - must be PEM');
        }

        // Normalize recipient public key to canonical PEM (supports PEM or raw base64 body)
        let normalizedTarget;
        try {
            normalizedTarget = normalizePublicKey(targetPubKey);
            // verify can be parsed by Node's crypto
            normalizedTarget = crypto.createPublicKey(normalizedTarget).export({ type: 'spki', format: 'pem' });
        } catch (e) {
            const short = (typeof targetPubKey === 'string') ? targetPubKey.slice(0, 120) + (targetPubKey.length > 120 ? '...' : '') : String(targetPubKey);
            throw new Error('Failed to normalize recipient public key: ' + e.message + ` (input: ${short})`);
        }

        const ownerPubKey = crypto.createPublicKey(ownerPrivKey).export({ type: 'spki', format: 'pem' });

        // Ensure the document exists in chain state or pending txs
        const state = await getState();
        const pending = await getPending();
        const docExists = (state && state[docId]) || (Array.isArray(pending) && pending.find(p => p.payload && p.payload.docId === docId));
        if (!docExists) {
            throw new Error('Document not found on blockchain (issue tx missing). Ensure ISSUE tx has been submitted and is pending or mined before sharing.');
        }

        const tx = {
            type: 'SHARE',
            payload: { docId, to: normalizedTarget },
            issuerPubKey: ownerPubKey
        };
        const dataToSign = getCanonicalTxData(tx);
        const signature = signTransaction(dataToSign, ownerPrivKey);
        console.log(`[shareDoc] Posting SHARE tx for docId=${docId} to blockchain`);
        const res = await axios.post(`${BLOCKCHAIN_API}/tx/share`, { ...tx, signature }, { 
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        });
        if (!res.data.ok) {
            throw new Error(res.data.error || 'Share transaction failed');
        }
        console.log(`[shareDoc] SHARE tx accepted for docId=${docId}`);
        return res.data;
    } catch (err) {
        console.error('shareDoc service error', err?.response?.data || err.message);
        throw err;
    }
}

async function revokeDoc(docId, ownerPrivKey) {
    try {
        if (!ownerPrivKey || !ownerPrivKey.includes('BEGIN PRIVATE KEY')) {
            throw new Error('Invalid signer private key format - must be PEM');
        }
        const ownerPubKey = crypto.createPublicKey(ownerPrivKey).export({ type: 'spki', format: 'pem' });

        // Try to revoke on blockchain, but don't fail if document isn't on-chain yet
        // (it may exist only in the database and never have had its ISSUE tx mined)
        try {
            const tx = {
                type: 'REVOKE',
                payload: { docId },
                issuerPubKey: ownerPubKey
            };
            const dataToSign = getCanonicalTxData(tx);
            const signature = signTransaction(dataToSign, ownerPrivKey);
            const res = await axios.post(`${BLOCKCHAIN_API}/tx/revoke`, { ...tx, signature }, { headers: { 'Content-Type': 'application/json' } });
            if (!res.data.ok) {
                console.warn(`[revokeDoc] Blockchain revoke warning: ${res.data.error || 'Unknown error'}`);
                // Don't throw - document can still be revoked in database even if blockchain revoke fails
            }
            return res.data || { ok: true };
        } catch (blockchainErr) {
            // If blockchain is unavailable or document not on chain, that's OK
            // The database revoke will still succeed
            console.warn(`[revokeDoc] Blockchain revoke failed (blockchain may not have ISSUE tx): ${blockchainErr.message}`);
            return { ok: true, note: 'Document revoked in database; blockchain revoke skipped' };
        }
    } catch (err) {
        console.error('revokeDoc service error', err?.response?.data || err.message);
        throw err;
    }
}

// Provide a compatibility alias `normalizeKey` used elsewhere in the codebase
function normalizeKey(input) {
    return normalizePublicKey(input);
}

export default { getState, generateKeyPair, issueDoc, shareDoc, revokeDoc, normalizeKey };
export { generateKeyPair, normalizePublicKey };
