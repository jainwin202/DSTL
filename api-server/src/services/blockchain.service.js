import axios from "axios";
import crypto from "crypto";

const BLOCKCHAIN_API = process.env.BLOCKCHAIN_API || "http://localhost:3001/api";

function generateKeyPair() {
    // Generate proper EC keys for secp256k1
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
        namedCurve: "secp256k1",
        publicKeyEncoding: {
            type: "spki",
            format: "pem"
        },
        privateKeyEncoding: {
            type: "pkcs8",
            format: "pem"
        }
    });
    return { privateKey, publicKey };
}

async function getState() {
    const res = await axios.get(`${BLOCKCHAIN_API}/state`);
    return res.data;
}

function signTransaction(data, privateKey) {
    if (!privateKey) {
        throw new Error('No key provided to sign');
    }
    // DEFINITIVE FIX: Use the one-shot crypto.sign method.
    // This bypasses the multi-step createSign -> update -> sign flow that is causing the error.
    // It takes the algorithm, data, and key, and returns the signature directly.
    return crypto.sign('sha256', Buffer.from(data), privateKey).toString('base64');
}

async function issueDoc(docId, hash, ownerPubKey, issuerPrivKey) {
    try {
        console.log('Issuing document:', { docId, hash });
        
        if (!ownerPubKey || !ownerPubKey.includes("BEGIN PUBLIC KEY")) {
            throw new Error("A valid owner public key was not provided to issueDoc.");
        }

        if (!issuerPrivKey || !issuerPrivKey.includes("BEGIN PRIVATE KEY")) {
            throw new Error("Invalid issuer private key format - must be PEM");
        }

        const tx = {
            type: "ISSUE",
            payload: {
                docId,
                docHash: hash,
                ownerPubKey,
                metadata: {}
            },
            issuerPubKey: crypto.createPublicKey(issuerPrivKey).export({
                type: 'spki',
                format: 'pem'
            })
        };

        const signature = signTransaction(JSON.stringify(tx), issuerPrivKey);

        const res = await axios.post(`${BLOCKCHAIN_API}/tx/issue`, {
            ...tx,
            signature
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!res.data.ok) {
            throw new Error(res.data.error || 'Blockchain transaction failed');
        }
        
        return { ...res.data, ownerPubKey };
    } catch (err) {
        console.error('Blockchain Error:', {
            message: err.message,
            response: err.response?.data,
            stack: err.stack
        });
        throw err;
    }
}

async function shareDoc(docId, targetPubKey, issuerPrivKey) {
    try {
        const issuerPubKey = crypto.createPublicKey(issuerPrivKey).export({ type: 'spki', format: 'pem' });
        const tx = {
            type: 'SHARE',
            payload: { docId, to: targetPubKey },
            issuerPubKey
        };

        const signature = signTransaction(JSON.stringify(tx), issuerPrivKey);

        const res = await axios.post(`${BLOCKCHAIN_API}/tx/share`, {
            ...tx,
            signature
        }, { headers: { 'Content-Type': 'application/json' } });

        if (!res.data.ok) {
            throw new Error(res.data.error || 'Share transaction failed');
        }
        return res.data;
    } catch (err) {
        console.error('shareDoc service error', err?.response?.data || err.message);
        throw err;
    }
}

async function revokeDoc(docId, issuerPrivKey) {
    try {
        const issuerPubKey = crypto.createPublicKey(issuerPrivKey).export({ type: 'spki', format: 'pem' });
        const tx = {
            type: 'REVOKE',
            payload: { docId },
            issuerPubKey
        };

        const signature = signTransaction(JSON.stringify(tx), issuerPrivKey);

        const res = await axios.post(`${BLOCKCHAIN_API}/tx/revoke`, {
            ...tx,
            signature
        }, { headers: { 'Content-Type': 'application/json' } });

        if (!res.data.ok) {
            throw new Error(res.data.error || 'Revoke transaction failed');
        }
        return res.data;
    } catch (err) {
        console.error('revokeDoc service error', err?.response?.data || err.message);
        throw err;
    }
}

export default {
    getState,
    generateKeyPair,
    issueDoc,
    shareDoc,
    revokeDoc
};

export { generateKeyPair };
