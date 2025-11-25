import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import { Blockchain } from "../blockchain/blockchain.js";
import { P2P } from "../p2p/p2p.js";
import { buildRouter } from "./routes.js";

const PORT = Number(process.env.PORT || 3001);
const P2P_PORT = Number(process.env.P2P_PORT || 6001);
const PEERS = (process.env.PEERS || "").split(",").filter(Boolean);
const DB_PATH = process.env.DB_PATH || `.data-${PORT}`;
const VALIDATOR_PUB = process.env.VALIDATOR_PUB;
const VALIDATOR_PRIV = process.env.VALIDATOR_PRIV;
const NODE_NAME = process.env.NODE_NAME || `node-${PORT}`;

if (!VALIDATOR_PRIV || !VALIDATOR_PUB) {
  console.error("❌ Missing validator keys in .env");
  process.exit(1);
}

// Normalize validator key format 
function normalizeKey(key) {
  if (!key || typeof key !== 'string') return key;
  // Convert escaped newlines (literal \n) into actual newlines and trim
  key = key.replace(/\\n/g, '\n').trim();

  // If the key already contains PEM header/footer, canonicalize it
  if (key.includes('-----BEGIN')) {
    // Split into lines, trim each, remove empty lines, then rejoin with single newlines
    const lines = key.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    return lines.join('\n') + '\n';
  }

  // If it contains the words PRIVATE KEY or PUBLIC KEY but no header, wrap appropriately
  if (key.includes('PRIVATE KEY')) {
    const body = key.replace(/.*PRIVATE KEY.*|.*END.*/g, '').trim();
    return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
  }
  if (key.includes('PUBLIC KEY')) {
    const body = key.replace(/.*PUBLIC KEY.*|.*END.*/g, '').trim();
    return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----\n`;
  }

  // Fallback: assume it's a raw base64 body and guess type by length (not perfect). Return raw as-is.
  return key;
}

const NORMALIZED_PRIV = normalizeKey(VALIDATOR_PRIV);
const NORMALIZED_PUB = normalizeKey(VALIDATOR_PUB);

// Log minimal metadata about keys (do not print full keys)
function keyInfo(pem) {
  if (!pem) return { header: '', footer: '', bodyLen: 0 };
  const lines = pem.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return { header: lines[0] || '', footer: lines[lines.length-1] || '', bodyLen: lines.slice(1,-1).join('').length };
}

console.log('Normalized validator keys loaded');
console.log('validator pub:', keyInfo(NORMALIZED_PUB));
console.log('validator priv:', keyInfo(NORMALIZED_PRIV));

const app = express();
app.use(bodyParser.json());

// Enable CORS for API server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const chain = new Blockchain({
  dbPath: DB_PATH,
  validatorPubKey: NORMALIZED_PUB,
  allowedValidators: [NORMALIZED_PUB]
});

await chain.init();

const p2p = new P2P({
  blockchain: chain,
  p2pPort: P2P_PORT,
  peers: PEERS
});

app.use("/api", buildRouter({ chain, p2p, validator: { pub: NORMALIZED_PUB, priv: NORMALIZED_PRIV } }));

app.get("/", (_, res) => res.json({ node: NODE_NAME, port: PORT, p2pPort: P2P_PORT }));

app.listen(PORT, () => {
  console.log(`[http] ${NODE_NAME} listening on ${PORT}`);
});
