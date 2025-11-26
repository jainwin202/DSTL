# DSTL — Decentralized Student Transcript Ledger

This project is an implementation of a decentralized student transcript ledger using blockchain in JavaScript. The system demonstrates issuing, sharing, revoking and verifying academic documents (transcripts) using a simple private Proof-of-Authority (PoA) blockchain together with a backend API and a React client.

In this project a user can have two roles:

- issuer — can issue documents (create credential transactions on the blockchain)
- user — can own or receive access to documents and view/verify them

This README gives an overview of the technologies, system architecture, full data flow, how to run and basic debugging and how to drop/reset the blockchain for a fresh start.

**Repository layout**

- `blockchain/` — lightweight PoA blockchain node using `express`, `level` and WebSocket-based P2P syncing
- `api-server/` — Express API server with MongoDB (Mongoose) for users and document metadata; integrates with blockchain via HTTP
- `client/` — React (Vite) frontend that talks to the API server

**Technologies used**

- JavaScript / Node.js
- Express.js (API and blockchain HTTP API)
- LevelDB via `level` (chain persistence)
- WebSockets (`ws`) for P2P chain sync
- MongoDB (Mongoose) for user and document metadata
- React + Vite for the frontend
- Crypto: Node's built-in `crypto` (secp256k1/ECDSA key generation and signing)

**High-level architecture**

**Client (React)**

- Authenticates with the API (JWT) and uploads documents and requests issue/share/revoke operations via API endpoints.

**API Server**

- Manages users, authentication, document metadata, file uploads and acts as a client for the blockchain node API (`BLOCKCHAIN_API`).
- When an issuer issues/shares/revokes a document the API constructs a signed transaction and sends it to the blockchain node's `/api/tx/*` endpoints.

**Blockchain Node (PoA)**

- Maintains the chain (array of signed blocks), pending transactions and state reconstruction logic.
- Persists the chain with LevelDB in `.data-*` folders (via `level` package).
- Exposes REST endpoints for chain, state, pending txs and endpoints to submit `ISSUE`, `SHARE`, `REVOKE` transactions and to propose blocks.
- Uses a validator keypair (Proof-of-Authority) to sign blocks.

Full flow summary (end-to-end)

1. User logs in via client (React) — credentials checked by `api-server` (MongoDB). Auth returns JWT.
2. Issuer uploads a document through the client UI. File is saved by the API server into `api-server/uploads/` and a document record is stored in MongoDB.
3. To record the credential on-chain the API creates an `ISSUE` transaction that includes a `docId` and a document hash, signs it with the issuer's private key (stored encrypted in the DB), and POSTs to the blockchain node's `/api/tx/issue`.
4. The blockchain node stores the transaction in `pendingTxs` and broadcasts it to P2P peers (if any).
5. The PoA validator proposes a block (manually via `/api/blocks/propose` or automatically depending on node). The block is signed by the validator's private key and appended to the chain.
6. The blockchain persists the updated chain to LevelDB. The API can query `/api/state` or `/api/chain` to confirm the new state and reflect it to the client.
7. To share or revoke a document the API builds `SHARE`/`REVOKE` transactions and sends them to the blockchain node; blocks record the changes and the on-chain state is updated.
8. Anyone (even without an account) can verify a document via the public verification route on the client which queries the blockchain `/api/verify/:docId` endpoint.

How to run (quick commands)

> NOTE: these assume you have already installed dependencies and have Node.js and MongoDB available. The commands below start the components (skip package installation details per user request).

Open separate terminals for each component.

1. Start blockchain node (default port 3001)

```powershell
cd blockchain
node src/server/index.js
```

2. Start API server (default port 5000)

```powershell
cd api-server
node src/server.js
```

3. Seed the API database with default users (issuer + user)

```powershell
cd api-server
npm run seed
```

4. Start the client (Vite dev server)

```powershell
cd client
npm run dev
```

Sharing UI improvement

- The `View Document` page now provides a recipient dropdown so you can select an existing user (name + email) instead of pasting public keys manually. The frontend fetches `/api/user/list` to populate the dropdown with users and their `blockchainPublicKey` (the API returns only public info: `name`, `email`, `role`, `blockchainPublicKey`).
- If you prefer to paste a key, choose "Enter public key manually..." from the dropdown and paste the PEM or raw base64 SPKI body — the API will normalize the key.

This reduces paste/format related errors when sharing documents.

Important environment variables (common)

- `blockchain/.env` — `PORT`, `P2P_PORT`, `DB_PATH`, `VALIDATOR_PRIV`, `VALIDATOR_PUB`, `NODE_NAME`, `PEERS`
- `api-server/.env` — `PORT`, `MONGO_URI`, `JWT_SECRET`, `BLOCKCHAIN_API`, `VALIDATOR_PRIV`, `VALIDATOR_PUB`, admin seeding vars
- `client` — uses `VITE_API` in `import.meta.env` to talk to the API

Debugging tips

- Blockchain logs: watch the terminal running `node src/server/index.js`. It logs genesis creation, chain loads, pending txs and block proposals.
- API logs: watch the terminal running `node src/server.js`. It logs DB connection, auth events and outgoing requests to the blockchain API.
- Client: open browser DevTools to inspect network requests and console errors.
- Query blockchain directly with `curl` or HTTP client:
  - `GET http://localhost:3001/api/chain` — full chain
  - `GET http://localhost:3001/api/state` — reconstructed state
  - `GET http://localhost:3001/api/pending` — pending transactions
  - `GET http://localhost:3001/api/verify/<docId>` — verify single document

How to drop the current blockchain and create a fresh chain

1. Stop the blockchain node and any services interacting with it.
2. Remove the LevelDB data folder used by the node. Default sample in repo is `.data-node-1` (or `DB_PATH` defined in `blockchain/.env`). On Windows PowerShell:

```powershell
cd blockchain
Remove-Item -Recurse -Force .data-node-1 -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .data-* -ErrorAction SilentlyContinue
```

3. (Optional) If you want to reset the API data (users/documents), drop the `edu-ledger` database in MongoDB:

```powershell
# Open mongosh (or mongo client) and run:
mongosh
use edu-ledger
db.dropDatabase()
```

4. (Optional) Generate new validator keys and update `blockchain/.env` and `api-server/.env` if you want fresh validator identity:

```powershell
cd blockchain
npm run genkeys
```

Copy the printed keys into both `.env` files under `VALIDATOR_PRIV` / `VALIDATOR_PUB` (or provide them via environment variables). 5. Start the blockchain node again; it will create a genesis block and new LevelDB storage.

Full reset (nuclear option)

- Remove `blockchain/.data-*` (chain storage)
- Drop `edu-ledger` MongoDB database
- Re-seed `api-server` (run `npm run seed`) to recreate users

Key files and their roles

- `blockchain/src/blockchain/blockchain.js` — chain logic, block/tx validation, state reconstruction
- `blockchain/src/blockchain/db.js` — LevelDB wrapper used to persist the chain
- `blockchain/src/server/index.js` — node startup & key normalization
- `blockchain/src/server/routes.js` — HTTP routes for tx submission, chain queries and proposals
- `api-server/src/services/blockchain.service.js` — API-server client code that talks to the blockchain
- `api-server/scripts/seed.js` — creates default issuer and user records
- `client/src/api/apiClient.js` — client-side API wrapper; sets `VITE_API`/`BLOCKCHAIN_API` usage

Security notes & caveats

- Private keys are stored encrypted in the database for demo purposes; in production you must use secure key management (HSM, Vault, etc.).
- This is an educational PoA blockchain, not production-grade: no consensus safety, no Byzantine tolerance, and no real token economics.

## Detailed Workflow Documentation

For a **comprehensive, deep-dive guide** covering:

- Complete document lifecycle with actual code paths
- User roles (issuer vs. user) and their permissions
- Step-by-step end-to-end testing scenarios
- Detailed API endpoint reference
- MongoDB database queries
- Troubleshooting and debugging tips
- Network request inspection with real examples

**See `DETAILED_WORKFLOW.md`** in the repository root.

This guide walks you through:

1. System architecture and data models
2. How issuer uploads → document ownership → blockchain issuance works
3. How users view and interact with documents they own
4. How sharing and revoking works end-to-end
5. Public verification without authentication
6. Complete testing scenarios with expected outputs

Further reading & next steps

- Add automated block proposals or a small scheduler for regular block creation if you want continuous finalization.
- Add richer auditing endpoints and block explorers for better observability.

---

Here is the complete, formatted `README.md` file. I have cleaned up the absolute file paths (e.g., `C:\Users...`) to use relative paths so that this README will work for anyone who clones your repository.

You can copy and paste the block below directly into your `README.md` file.

---

````markdown
# DSTL Project - Complete Run & Debug Guide

## 🏗 Architecture Overview

The DSTL project consists of 3 main components working together:

1.  **Blockchain (Port 3001):** Private PoA (Proof of Authority) blockchain using LevelDB.
2.  **API Server (Port 5000):** Express.js server with MongoDB for user management & authentication.
3.  **Client (Vite dev server):** React frontend that connects to the API server.

**Data Flow:** Client → API Server → Blockchain + MongoDB

---

## 🚀 Part 1: Fresh Blockchain Setup

### Step 1.1: Drop Current Blockchain & Generate Keys

The blockchain data is stored in `.data-*` directories. Run the following to start fresh and generate new validator keys.

```powershell
# Open Terminal in project root
cd blockchain

# Remove existing chain data (Windows PowerShell)
Remove-Item -Recurse -Force .data-node-1 -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .data-3001 -ErrorAction SilentlyContinue

# Generate new keys
npm run genkeys
```
````

---

## 🔗 Part 2: Start the Blockchain

### Step 2.1: Start Blockchain Node

This initializes the Genesis block (if it doesn't exist) and starts the peer-to-peer node.

```bash
# In blockchain folder
node src/server/index.js
```

**Expected Output:**

```text
Normalized validator keys loaded
validator pub: { header: '-----BEGIN PUBLIC KEY-----', ... }
validator priv: { header: '-----BEGIN PRIVATE KEY-----', ... }
Creating genesis block...
Genesis block created and saved
Listening on port 3001
```

---

## 🗄 Part 3: Start MongoDB & Seed Database

### Step 3.1: Ensure MongoDB is Running

```powershell
# Windows Service
net start MongoDB

# OR if installed via Chocolatey/Direct
mongod
```

### Step 3.2: Seed the Database

Initialize the database with test users (Issuer and Standard User).

```bash
# In api-server folder
cd api-server
npm run seed
```

**Expected Output:**

```text
✅ Connected to MongoDB
✅ Created: issuer@example.com (issuer)
✅ Created: user@example.com (user)
```

---

## 🌐 Part 4: Start the API Server

### Step 4.1: Start API Server

The server connects to both MongoDB and the Blockchain node.

```bash
# In api-server folder
node src/server.js
```

**Expected Output:**

```text
✅ MongoDB connected
API running on http://localhost:5000
```

---

## 💻 Part 5: Start the Client

### Step 5.1: Start Vite Dev Server

```bash
# In client folder
cd client
npm run dev
```

**Expected Output:**

```text
  ➜  Local:   http://localhost:5173/
```

---

## ⚡ Quick Start Summary (Terminal Order)

Open **4 separate terminals** and run the following commands in order:

| Terminal | Component        | Command                                     | Port  |
| :------- | :--------------- | :------------------------------------------ | :---- |
| **1**    | Blockchain       | `cd blockchain && node src/server/index.js` | 3001  |
| **2**    | API Server       | `cd api-server && node src/server.js`       | 5000  |
| **3**    | Client           | `cd client && npm run dev`                  | 5173  |
| **4**    | Mongo (Optional) | `mongod` (if not running as service)        | 27017 |

---

## 🧪 Part 6: Testing the Full Flow

### 1\. Login & Issue a Document

1.  Go to `http://localhost:5173/`
2.  **Login** using: `issuer@example.com` / `issuer123`
3.  Go to **Upload Document** and upload a file.
    - _Backend:_ File saved to `uploads`, Metadata saved to MongoDB, `ISSUE` transaction sent to Blockchain.

### 2\. View & Share

1.  Go to **My Documents**.
2.  Click a document to view details.
3.  **Share** using another user's public key.
    - _Backend:_ `SHARE` transaction recorded on Blockchain.

### 3\. Public Verification

1.  Get the `docId`.
2.  Use the link: `http://localhost:5173/verify/<docId>`
3.  Verifies existence on the blockchain without login.

---

## 🐞 Part 7: Debugging & Monitoring

### Check Blockchain State (cURL)

Run these commands in a separate terminal to inspect the chain directly.

```bash
# Get entire chain
curl http://localhost:3001/api/chain

# Get blockchain state (ownership info)
curl http://localhost:3001/api/state

# Get pending transactions
curl http://localhost:3001/api/pending

# Verify a specific document
curl http://localhost:3001/api/verify/<docId>
```

### Check MongoDB Data

```bash
mongosh

# Inside the shell:
show databases
use edu-ledger

# View users
db.users.find().pretty()

# View documents
db.documents.find().pretty()
```

---

## ☢️ Part 8: Full Reset (Nuclear Option)

If the chain gets out of sync or you want to restart the demo completely, run this sequence:

### 1\. Drop Blockchain Data

```powershell
cd blockchain
Remove-Item -Recurse -Force .data-* -ErrorAction SilentlyContinue
```

### 2\. Drop MongoDB Database

```bash
mongosh
# In mongosh:
use edu-ledger
db.dropDatabase()
exit
```

### 3\. Restart Services

1.  **Blockchain:** `node src/server/index.js`
2.  **API Server:** `node src/server.js` (Then run `npm run seed` to recreate users)
3.  **Client:** `npm run dev`

---

## 📂 Key Files to Know

| File                             | Purpose                                    |
| :------------------------------- | :----------------------------------------- |
| `blockchain/src/server/index.js` | Blockchain node entry point                |
| `blockchain/src/blockchain.js`   | Core blockchain logic (POW/POA, Blocks)    |
| `blockchain/src/db.js`           | LevelDB persistence layer                  |
| `api-server/src/server.js`       | API Server entry point                     |
| `api-server/src/seed.js`         | Script to create test users                |
| `client/src/apiClient.js`        | Frontend Axios setup for API communication |

```

### Next Step
Would you like me to generate a `seed.js` script or a `package.json` file to ensure all the dependencies mentioned in the guide (like `level`, `express`, `mongoose`) are correctly defined for your project?
```
