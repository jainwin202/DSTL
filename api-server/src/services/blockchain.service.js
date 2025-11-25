import axios from "axios";
import crypto from "crypto";

const BLOCKCHAIN_API = process.env.BLOCKCHAIN_API || "http://localhost:3001/api";

export function generateKeyPair() {
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
    // Make sure to use a new Sign instance
    const sign = crypto.createSign('SHA256');
    sign.write(data);
    sign.end();
    return sign.sign(privateKey, 'base64');
}

async function issueDoc(docId, hash, ownerPubKey, issuerPrivKey) {
    try {
        console.log('Issuing document:', { docId, hash });
        
        // Generate a new key pair if ownerPubKey is not provided or invalid
        if (!ownerPubKey || !ownerPubKey.includes("BEGIN PUBLIC KEY")) {
            console.log('Generating new key pair for owner');
            const keyPair = generateKeyPair();
            ownerPubKey = keyPair.publicKey;
            // Note: In a real system, you'd want to securely store/transmit the private key
        }

        if (!issuerPrivKey || !issuerPrivKey.includes("BEGIN PRIVATE KEY")) {
            throw new Error("Invalid issuer private key format - must be PEM");
        }

        // Create transaction payload
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
            }) // Derive issuer public key from private key
        };

        console.log('Creating transaction:', JSON.stringify(tx));

        // Sign the transaction data
        const signature = signTransaction(
            JSON.stringify(tx),
            issuerPrivKey
        );

        console.log('Sending request to blockchain:', { 
            url: `${BLOCKCHAIN_API}/tx/issue`,
            docId,
            hasKeys: {
                ownerPubKey: !!ownerPubKey,
                signature: !!signature
            }
        });

        const res = await axios.post(`${BLOCKCHAIN_API}/tx/issue`, {
            ...tx,
            signature
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Blockchain response:', res.data);
        
        if (!res.data.ok) {
            throw new Error(res.data.error || 'Blockchain transaction failed');
        }
        
        return { ...res.data, ownerPubKey }; // Return the generated public key if we created one
    } catch (err) {
        console.error('Blockchain Error:', {
            message: err.message,
            response: err.response?.data,
            stack: err.stack
        });
        throw err;
    }
}

async function shareDoc(docId, targetPubKey) {
    const res = await axios.post(`${BLOCKCHAIN_API}/tx`, {
        type: "SHARE",
        docId,
        targetPubKey
    });
    return res.data;
}

async function revokeDoc(docId) {
    const res = await axios.post(`${BLOCKCHAIN_API}/tx`, {
        type: "REVOKE",
        docId
    });
    return res.data;
}

export default {
    getState,
    generateKeyPair,
    issueDoc,
    shareDoc,
    revokeDoc
};