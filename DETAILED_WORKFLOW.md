# DSTL — Detailed End-to-End Workflow, Testing, and Debugging Guide

This guide provides a **complete, deeply analyzed** walkthrough of how DSTL works, covering user roles, document ownership, blockchain transactions, and how to test and debug the entire system.

---

## Table of Contents

1. [System Architecture & Data Models](#system-architecture--data-models)
2. [User Roles and Capabilities](#user-roles-and-capabilities)
3. [Complete Data Flow: Document Lifecycle](#complete-data-flow-document-lifecycle)
4. [Step-by-Step End-to-End Testing](#step-by-step-end-to-end-testing)
5. [Running the System](#running-the-system)
6. [Debugging Guide](#debugging-guide)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Database Queries](#database-queries)

---

## System Architecture & Data Models

### MongoDB Collections

**Users Collection:**

```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (bcrypt hashed),
  role: "issuer" | "user",
  blockchainPublicKey: String,        // Public key for signing/verification
  blockchainPrivateKeyEnc: String,    // AES encrypted private key
  timestamps: { createdAt, updatedAt }
}
```

**Documents Collection:**

```javascript
{
  _id: ObjectId,
  docId: String (unique UUID),
  issuer: ObjectId (ref: User),       // User who issued the document
  owner: ObjectId (ref: User),        // User who owns the document (important!)
  hash: String,                       // SHA256 hash of file content
  filePath: String,                   // Local file path in api-server/uploads/
  metadata: {
    title: String,
    ownerPubKey: String,              // Blockchain public key of owner
    txHash: String,                   // Blockchain transaction hash
    // ...other custom metadata
  },
  createdAt: Date
}
```

### Blockchain State

The blockchain maintains an **in-memory state** reconstructed from all transactions:

```javascript
{
  "[docId]": {
    issuer: String,                   // Issuer's public key
    owner: String,                    // Owner's public key (from ISSUE tx)
    hash: String,                     // SHA256 hash from ISSUE tx
    revoked: Boolean,                 // True if REVOKE transaction exists
    shares: [String],                 // Array of public keys given SHARE access
    metadata: Object                  // From ISSUE transaction
  }
}
```

**Transaction Types:**

1. **ISSUE** — Issuer creates a credential record

   - Payload: `{ docId, docHash, ownerPubKey, metadata }`
   - Signed by: Issuer's private key
   - Effect: Initializes state entry with owner

2. **SHARE** — Owner grants access to another public key

   - Payload: `{ docId, to }` (to = recipient public key)
   - Signed by: Issuer's private key
   - Effect: Adds recipient to `shares[]` array

3. **REVOKE** — Issuer revokes the document
   - Payload: `{ docId }`
   - Signed by: Issuer's private key
   - Effect: Sets `revoked: true`

---

## User Roles and Capabilities

### Role: "issuer"

**Signup/Login:**

- Create account with role `"issuer"`
- Gets a blockchain keypair (public + encrypted private key)

**Permissions:**

- ✅ Upload and issue documents (POST `/api/issuer/upload`)
- ✅ View documents they issued (GET `/api/user/docs` filters by `issuer`)
- ✅ Share documents they issued (POST `/api/user/share`)
- ✅ Revoke documents (POST `/api/user/revoke`)
- ✅ Download documents (GET `/api/user/download/:id`)

**Typical Flow:**

1. Issuer logs in
2. Goes to "Upload & Issue Document" page
3. Selects a file (PDF, etc.)
4. **Provides the Owner User ID** (this is the key difference!)
5. Adds metadata (title, etc.)
6. Submits → Document is issued to blockchain with owner's public key

### Role: "user"

**Signup/Login:**

- Create account with role `"user"`
- Gets a blockchain keypair

**Permissions:**

- ✅ View documents they own (GET `/api/user/docs` filters by `owner`)
- ✅ Share documents (if owner) (POST `/api/user/share`)
- ✅ Download documents (GET `/api/user/download/:id`)
- ❌ Cannot upload/issue documents
- ❌ Cannot revoke documents

**Typical Flow:**

1. User logs in
2. Goes to "My Documents" page
3. Sees documents where they are listed as `owner`
4. Can view, download, and share documents

### Anyone (Unauthenticated)

**Permissions:**

- ✅ Verify a document publicly (GET `/api/verify/:docId`)
- ✅ Query blockchain directly (GET `/api/chain`, `/api/state`, etc.)

---

## Complete Data Flow: Document Lifecycle

### Phase 1: Registration & Keypair Generation

**Client → API → Database**

```
Client (Issuer or User)
  ↓
[Login Page]
  ↓ POST /api/auth/login
API Server
  ↓
Check MongoDB.users by email
  ↓ Match password (bcrypt)
  ↓ Generate JWT token
  ↓ Return token + user object
Client stores JWT in localStorage
  ↓
User is now authenticated
```

**Important:** During initial registration or seeding:

```
seed.js or /api/auth/register
  ↓
generateKeyPair() → { publicKey, privateKey }
  ↓ Encrypt privateKey with AES
  ↓
Save to MongoDB:
{
  blockchainPublicKey: publicKey,
  blockchainPrivateKeyEnc: encrypt(privateKey)
}
```

### Phase 2: Issuer Uploads & Issues Document

**Client (Issuer) → API Server → Blockchain**

#### 2.1 Frontend (React)

User at `/upload` page:

```
[UploadDoc.jsx]
  ↓ User selects file
  ↓ User enters OWNER_USER_ID (MongoDB ObjectId of the user receiving the doc)
  ↓ User enters metadata JSON: { "title": "B.Tech Degree" }
  ↓ Submits form
  ↓
FormData {
  file: File,
  ownerId: "65abc123...",       ← USER_ID from MongoDB
  metadata: "{\"title\":\"B.Tech\"}"
}
  ↓ POST /api/issuer/upload (with JWT)
```

#### 2.2 API Server (Node.js)

```
POST /api/issuer/upload
  ↓
[issuer.controller.js uploadDocument()]
  ↓
1. Extract file from request
2. Extract ownerId from body (this is MongoDB ObjectId)
3. Generate docId = UUID()
4. Hash file content = SHA256(file.buffer)
5. Save file locally: uploads/[docId]
6. Save to MongoDB:
   Document {
     docId: "550e8400-e29b-41d4-a716-446655440000",
     issuer: req.user._id,         ← Logged-in issuer
     owner: ownerId,               ← The target user
     hash: "abc123def456...",
     filePath: "uploads/550e8400-...",
     metadata: { title: "B.Tech Degree" }
   }
7. **Issue to blockchain:**
   ↓
   a) Generate ownerPublicKey via generateKeyPair()
   b) Decrypt issuer's privateKey from blockchainPrivateKeyEnc
   c) Create ISSUE transaction:
      {
        type: "ISSUE",
        payload: {
          docId: "550e8400-...",
          docHash: "abc123def456...",
          ownerPubKey: "-----BEGIN PUBLIC KEY-----\n...",
          metadata: { title: "B.Tech Degree" }
        },
        issuerPubKey: derive_from_privateKey(issuerPriv)
      }
   d) Sign transaction with issuer's private key
   e) POST http://localhost:3001/api/tx/issue {
        type: "ISSUE",
        payload: {...},
        issuerPubKey: "...",
        signature: "base64_signature"
      }
   ↓
8. Blockchain validates & stores in pendingTxs
9. Return { ok: true, docId, hash }
```

#### 2.3 Blockchain Node

```
POST /api/tx/issue
  ↓
[blockchain/src/server/routes.js]
  ↓
1. Validate all required fields present
2. Create Transaction object
3. Verify signature with issuerPubKey
4. Add to chain.pendingTxs
5. Broadcast to P2P peers (if any)
6. Return { ok: true, tx: transaction_hash }

State after ISSUE:
{
  "550e8400-...": {
    issuer: "-----BEGIN PUBLIC KEY-----\n[issuer_pub]...",
    owner: "-----BEGIN PUBLIC KEY-----\n[owner_pub]...",
    hash: "abc123def456...",
    revoked: false,
    shares: [],
    metadata: { title: "B.Tech Degree" }
  }
}
```

#### 2.4 Block Proposal

After transactions are pending, someone proposes a block:

```
POST /api/blocks/propose
  ↓
1. Take all pendingTxs
2. Create new Block:
   {
     index: chain.length,
     prevHash: lastBlock.hash,
     transactions: pendingTxs,
     validatorPubKey: validator.pub,
     timestamp: Date.now()
   }
3. Sign block with validator's private key
4. Validate block signature
5. Append to chain
6. Persist to LevelDB
7. Clear pendingTxs = []
8. Return block
```

### Phase 3: User Views Their Documents

**Client (User) → API → MongoDB + Blockchain**

```
[DocsList.jsx]
  ↓ User clicks "My Documents"
  ↓ GET /api/user/docs (with JWT)
  ↓
[user.controller.js getMyDocs()]
  ↓
1. Get logged-in user ID
2. Check role:
   - If issuer: Find docs where issuer = userId
   - If user: Find docs where owner = userId
3. Query MongoDB:
   await Document.find({ owner: userId })
   Result: [
     {
       docId: "550e8400-...",
       issuer: ObjectId("..."),
       owner: ObjectId("..."),
       hash: "abc123...",
       metadata: { title: "B.Tech Degree" }
     }
   ]
4. Query blockchain state:
   GET /api/state
   Result: {
     "550e8400-...": {
       issuer: "pub_key_...",
       owner: "pub_key_...",
       hash: "abc123...",
       revoked: false,
       shares: []
     }
   }
5. Merge both sources:
   [
     {
       docId: "550e8400-...",
       metadata: { title: "B.Tech Degree" },
       hash: "abc123...",           ← From blockchain (preferred)
       revoked: false               ← From blockchain
     }
   ]
6. Return to client
  ↓
[Client displays list with VALID/REVOKED badge]
```

### Phase 4: View Single Document Details

```
[ViewDoc.jsx]
  ↓ User clicks on a document
  ↓ GET /api/user/doc/:docId (with JWT)
  ↓
[user.controller.js getSingleDoc()]
  ↓
1. Find document in MongoDB:
   await Document.findOne({ docId })
     .populate("issuer owner", "email role blockchainPublicKey")
2. Get blockchain state for this docId
3. Return merged result:
   {
     docId: "550e8400-...",
     metadata: { title: "B.Tech Degree" },
     hash: "abc123...",
     revoked: false,
     issuer: {
       _id: "65abc123...",
       email: "issuer@example.com",
       role: "issuer",
       blockchainPublicKey: "-----BEGIN PUBLIC KEY-----\n..."
     },
     owner: {
       _id: "65def456...",
       email: "user@example.com",
       role: "user",
       blockchainPublicKey: "-----BEGIN PUBLIC KEY-----\n..."
     }
   }
```

### Phase 5: Share Document (Owner/Issuer)

**Only owner or issuer can share:**

```
[ViewDoc.jsx]
  ↓ Owner/Issuer enters target public key
  ↓ POST /api/user/share
  ↓
Body: {
  docId: "550e8400-...",
  targetPubKey: "-----BEGIN PUBLIC KEY-----\n[recipient_pub]..."
}
  ↓
[user.actions.js shareDoc()]
  ↓
1. Find document
2. Verify requester is owner or issuer
3. Call blockchainService.shareDoc(docId, targetPubKey)
   ↓
   a) Create SHARE transaction:
      {
        type: "SHARE",
        payload: { docId, to: targetPubKey },
        issuerPubKey: "...",
        signature: "..."
      }
   b) POST /api/tx/share to blockchain
4. Blockchain adds to pendingTxs
5. Block is proposed → SHARE recorded
6. State updated:
   {
     "550e8400-...": {
       ...existing fields...,
       shares: ["-----BEGIN PUBLIC KEY-----\n[recipient_pub]..."]
     }
   }
```

### Phase 6: Revoke Document

**Only issuer can revoke:**

```
[ViewDoc.jsx]
  ↓ Issuer clicks "Revoke"
  ↓ POST /api/user/revoke
  ↓
Body: { docId: "550e8400-..." }
  ↓
[user.actions.js revokeDoc()]
  ↓
1. Find document
2. Verify requester is issuer (NOT owner)
3. Create REVOKE transaction:
   {
     type: "REVOKE",
     payload: { docId },
     issuerPubKey: "...",
     signature: "..."
   }
4. POST /api/tx/revoke to blockchain
5. Blockchain records transaction
6. Block is proposed
7. State updated:
   {
     "550e8400-...": {
       ...fields...,
       revoked: true
     }
   }
8. Next time user views docs → shows REVOKED badge
```

### Phase 7: Public Verification (No Authentication)

**Anyone can verify a document:**

```
Browser → /verify/550e8400-...
  ↓ No login required
  ↓ GET /api/verify/550e8400-... (no JWT needed)
  ↓
[blockchain/src/server/routes.js]
  ↓
1. Get blockchain state
2. Find entry for docId
3. Return:
   {
     issuer: "pub_key_...",
     owner: "pub_key_...",
     hash: "abc123...",
     revoked: false,
     shares: [...]
   }
  ↓
[Client displays verification info]
✅ Document is valid
or
⚠️ This document has been revoked
```

---

## Step-by-Step End-to-End Testing

### Scenario: Issuer Issues a Document to a User

**Setup:**

- MongoDB running and empty
- Blockchain running (fresh genesis block)
- API server running
- Client (Vite) running

### Test Steps

#### Step 1: Seed Default Users

```powershell
cd api-server
npm run seed
```

**Result:**

- `issuer@example.com` / `issuer123` (role: issuer)
- `user@example.com` / `user123` (role: user)

**DB Check:**

```javascript
use edu-ledger
db.users.find()
// See: _id, email, role, blockchainPublicKey, blockchainPrivateKeyEnc
```

#### Step 2: Issuer Logs In

**Client:**

1. Go to `http://localhost:5173/`
2. Click "Login"
3. Enter:
   - Email: `issuer@example.com`
   - Password: `issuer123`
4. Click "Login"

**Expected:**

- Page redirects to `/dashboard`
- Navbar shows: "Logged in as issuer@example.com (issuer)"

**Network Check (DevTools):**

```
POST http://localhost:5000/api/auth/login
Request: { email: "issuer@example.com", password: "issuer123" }
Response: {
  ok: true,
  token: "eyJhbGc...",
  user: {
    id: "65abc123...",
    email: "issuer@example.com",
    role: "issuer",
    blockchainPublicKey: "-----BEGIN PUBLIC KEY-----\n..."
  }
}
```

**API Server Log:**

```
✅ MongoDB connected
API running on http://localhost:5000
```

#### Step 3: Issuer Uploads & Issues Document

**Client:**

1. Click "Upload & Issue Document"
2. Select a file (any PDF, image, etc.)
3. **Owner User ID field:** Get the MongoDB `_id` of the "user" account:

   ```powershell
   # In MongoDB shell:
   mongosh
   use edu-ledger
   db.users.findOne({ email: "user@example.com" })
   // Copy the _id value, e.g., "65def456..."
   ```

   Paste this into the "Owner User ID" field.

4. Metadata: `{"title":"Diploma"}`
5. Click "Upload & Issue"

**Expected:**

- Alert: "Uploaded + issued to blockchain!"
- Redirects to `/docs/[docId]`

**Network Check (DevTools):**

```
POST http://localhost:5000/api/issuer/upload
Headers: Authorization: Bearer [token]
FormData:
  file: [file]
  ownerId: "65def456..."
  metadata: "{"title":"Diploma"}"

Response: {
  ok: true,
  docId: "550e8400-e29b-41d4-a716-446655440000",
  hash: "abc123def456..."
}
```

**API Server Log:**

```
Received issue request: { type: 'ISSUE', payload: {...}, ... }
Generating blockchain keys for document
Getting issuer private key
Issuing document on blockchain: { docId, fileHash }
Created transaction: { hash: 'abc...' }
```

**Blockchain Log:**

```
Received issue request: { type: 'ISSUE', ... }
Created transaction: { hash: ..., type: ISSUE }
```

**DB Check:**

```javascript
db.documents.findOne({ docId: "550e8400-..." })
{
  docId: "550e8400-...",
  issuer: ObjectId("65abc123..."),    // Issuer
  owner: ObjectId("65def456..."),     // User
  hash: "abc123def456...",
  filePath: "uploads/550e8400-...",
  metadata: { title: "Diploma", ownerPubKey: "...", txHash: "..." },
  createdAt: ISODate("...")
}

db.documents.find()
// Count: 1 (one document)
```

**Blockchain State Check:**

```powershell
# In another terminal:
curl http://localhost:3001/api/state
{
  "550e8400-...": {
    issuer: "-----BEGIN PUBLIC KEY-----\n[issuer_pub]...",
    owner: "-----BEGIN PUBLIC KEY-----\n[owner_pub]...",
    hash: "abc123def456...",
    revoked: false,
    shares: [],
    metadata: { title: "Diploma" }
  }
}
```

#### Step 4: User Logs In & Sees Document

**Client:**

1. Logout issuer (click logout button or clear localStorage)
2. Login as user:
   - Email: `user@example.com`
   - Password: `user123`
3. Click "My Documents"

**Expected:**

- Page displays: `[Diploma] VALID`
- Shows the document with docId

**Network Check:**

```
GET http://localhost:5000/api/user/docs
Headers: Authorization: Bearer [user_token]

Response: {
  ok: true,
  docs: [
    {
      docId: "550e8400-...",
      metadata: { title: "Diploma" },
      hash: "abc123def456...",
      revoked: false
    }
  ]
}
```

**API Server Log:**

```
User called GET /api/user/docs
Found 1 document where owner = userId
Queried blockchain state
```

#### Step 5: User Views Document Details

**Client:**

1. Click on the document in the list
2. Page shows:
   - Title: "Diploma"
   - Issued By: issuer@example.com
   - Owner: user@example.com
   - Hash: abc123def456...
   - Status: VALID
   - Download, Share, Revoke buttons (owner can see)

**Network Check:**

```
GET http://localhost:5000/api/user/doc/550e8400-...

Response: {
  ok: true,
  docId: "550e8400-...",
  metadata: { title: "Diploma" },
  hash: "abc123def456...",
  revoked: false,
  issuer: {
    _id: "65abc123...",
    email: "issuer@example.com",
    blockchainPublicKey: "..."
  },
  owner: {
    _id: "65def456...",
    email: "user@example.com",
    blockchainPublicKey: "..."
  }
}
```

#### Step 6: Download Document

**Client:**

1. Click "Download PDF"
2. Browser downloads file as `550e8400-....pdf`

**Network Check:**

```
GET http://localhost:5000/api/user/download/550e8400-...

Response: [file binary data]
```

**API Server Log:**

```
User requested download of docId
Verified user is owner or issuer
Sent file from uploads/550e8400-...
```

#### Step 7: Share Document

**Client (as user/owner):**

1. Enter another user's public key in "Share access" field

   - You can use the issuer's public key or generate a new one:

   ```powershell
   cd blockchain
   npm run genkeys
   # Copy the PUBLIC KEY output
   ```

2. Click "Share"

**Expected:**

- Alert: "Shared!"

**Network Check:**

```
POST http://localhost:5000/api/user/share
Body: {
  docId: "550e8400-...",
  targetPubKey: "-----BEGIN PUBLIC KEY-----\n..."
}

Response: { ok: true }
```

**Blockchain Check:**

```powershell
curl http://localhost:3001/api/state
{
  "550e8400-...": {
    ...fields...,
    shares: ["-----BEGIN PUBLIC KEY-----\n[recipient_pub]..."]
  }
}
```

#### Step 8: Revoke Document

**Client (as issuer):**

1. Login back as issuer
2. Go to "Documents Issued"
3. Click on the document
4. Click "Revoke"

**Expected:**

- Alert: "Revoked!"

**Network Check:**

```
POST http://localhost:5000/api/user/revoke
Body: { docId: "550e8400-..." }

Response: { ok: true }
```

**Blockchain Check:**

```powershell
curl http://localhost:3001/api/state
{
  "550e8400-...": {
    ...fields...,
    revoked: true
  }
}
```

**User's View:**

- Re-login as user and check "My Documents"
- Document now shows: `[Diploma] REVOKED`

#### Step 9: Public Verification

**Client (anyone, no login):**

```
Open in new browser/incognito:
http://localhost:5173/verify/550e8400-...
```

**Expected:**

```
Document Verification

Document ID: 550e8400-...
Issuer: [issuer's public key]
Owner: [owner's public key]
SHA256: abc123def456...
⚠️ This document has been revoked
```

---

## Running the System

### Prerequisites

- Node.js (v16+)
- MongoDB (running on `127.0.0.1:27017`)
- All npm dependencies installed

### Full Startup Sequence

**Terminal 1 — Blockchain Node:**

```powershell
cd blockchain
node src/server/index.js
```

**Expected Output:**

```
Normalized validator keys loaded
validator pub: { header: '-----BEGIN PUBLIC KEY-----', ... }
validator priv: { header: '-----BEGIN PRIVATE KEY-----', ... }
Creating genesis block...
Genesis block created and saved
Listening on port 3001
```

**Terminal 2 — API Server:**

```powershell
cd api-server
node src/server.js
```

**Expected Output:**

```
✅ MongoDB connected
API running on http://localhost:5000
```

**Terminal 3 — Seed Database:**

```powershell
cd api-server
npm run seed
```

**Expected Output:**

```
✅ Connected to MongoDB
✅ Created: issuer@example.com (issuer)
✅ Created: user@example.com (user)
```

**Terminal 4 — Client (Vite):**

```powershell
cd client
npm run dev
```

**Expected Output:**

```
  ➜  Local:   http://localhost:5173/
```

**Browser:**

- Open `http://localhost:5173/`

---

## Debugging Guide

### Issue: MongoDB Connection Failed

**Error:**

```
❌ MongoDB connection failed MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**

1. Check if MongoDB is running:

```powershell
Get-Process mongod
```

2. If not running, start it:

```powershell
# If installed as service:
net start MongoDB

# Or manually:
mongod
```

### Issue: Blockchain Node Won't Start

**Error:**

```
❌ Missing validator keys in .env
```

**Solution:**

1. Check `blockchain/.env` has `VALIDATOR_PRIV` and `VALIDATOR_PUB`
2. If not, generate keys:

```powershell
cd blockchain
npm run genkeys
```

3. Copy keys to `blockchain/.env` and `api-server/.env`

### Issue: Document Upload Fails

**Error in Network Tab:**

```
POST /api/issuer/upload → 500
"error": "Missing ownerId"
```

**Solution:**

- Check that the "Owner User ID" field is filled with a valid MongoDB ObjectId
- Get valid ID from MongoDB:

```powershell
mongosh
use edu-ledger
db.users.findOne({ email: "user@example.com" })
// Copy _id value
```

### Issue: Document Not Appearing on Blockchain

**Check:**

1. Blockchain received the transaction:

```powershell
curl http://localhost:3001/api/pending
```

Should show pending transactions.

2. Propose a block:

```powershell
curl -X POST http://localhost:3001/api/blocks/propose
```

3. Check state again:

```powershell
curl http://localhost:3001/api/state
```

### Issue: User Can't See Document

**Check:**

1. Verify document is in MongoDB with correct owner:

```powershell
mongosh
use edu-ledger
db.documents.findOne({ docId: "550e8400-..." })
// Check owner field matches logged-in user _id
```

2. Verify user is logged in with correct JWT:

```javascript
// In browser console:
localStorage.getItem("token");
```

3. Verify API endpoint:

```powershell
curl -H "Authorization: Bearer [token]" http://localhost:5000/api/user/docs
```

### Debugging Logs

**API Server Logs:**

```
Received issue request: {...}
Generating blockchain keys for document
Issuing document on blockchain: { docId, fileHash }
```

**Blockchain Logs:**

```
Received issue request: { type: 'ISSUE', ... }
Created transaction: { hash: ..., type: ... }
Proposing block...
Genesis block created and saved
```

**Browser Console (F12):**

```
POST http://localhost:5000/api/issuer/upload
GET http://localhost:5000/api/user/docs
```

Use DevTools Network tab to inspect:

- Request headers (Authorization)
- Response bodies
- Status codes

---

## API Endpoints Reference

### Authentication (`/api/auth`)

| Method | Endpoint         | Auth | Body                              | Response              |
| ------ | ---------------- | ---- | --------------------------------- | --------------------- |
| POST   | `/auth/register` | ❌   | `{ name, email, password, role }` | `{ ok, user }`        |
| POST   | `/auth/login`    | ❌   | `{ email, password }`             | `{ ok, token, user }` |
| GET    | `/auth/me`       | ✅   | -                                 | `{ ok, user }`        |

### Issuer (`/api/issuer`)

| Method | Endpoint         | Auth | Body                                    | Response              |
| ------ | ---------------- | ---- | --------------------------------------- | --------------------- |
| POST   | `/issuer/upload` | ✅   | `FormData: { file, ownerId, metadata }` | `{ ok, docId, hash }` |

### User (`/api/user`)

| Method | Endpoint             | Auth | Body                      | Response                                       |
| ------ | -------------------- | ---- | ------------------------- | ---------------------------------------------- |
| GET    | `/user/docs`         | ✅   | -                         | `{ ok, docs }`                                 |
| GET    | `/user/doc/:id`      | ✅   | -                         | `{ ok, docId, metadata, hash, issuer, owner }` |
| GET    | `/user/download/:id` | ✅   | -                         | `[file binary]`                                |
| POST   | `/user/share`        | ✅   | `{ docId, targetPubKey }` | `{ ok }`                                       |
| POST   | `/user/revoke`       | ✅   | `{ docId }`               | `{ ok }`                                       |

### Blockchain (`/api` on port 3001)

| Method | Endpoint          | Auth | Body                                         | Response                |
| ------ | ----------------- | ---- | -------------------------------------------- | ----------------------- |
| GET    | `/chain`          | ❌   | -                                            | `[block, block, ...]`   |
| GET    | `/state`          | ❌   | -                                            | `{ docId: {...}, ... }` |
| GET    | `/pending`        | ❌   | -                                            | `[transaction, ...]`    |
| GET    | `/verify/:docId`  | ❌   | -                                            | `{ ok, entry: {...} }`  |
| POST   | `/tx/issue`       | ❌   | `{ type, payload, issuerPubKey, signature }` | `{ ok, tx }`            |
| POST   | `/tx/share`       | ❌   | `{ docId, to, issuerPubKey, signature }`     | `{ ok, tx }`            |
| POST   | `/tx/revoke`      | ❌   | `{ docId, issuerPubKey, signature }`         | `{ ok, tx }`            |
| POST   | `/blocks/propose` | ❌   | -                                            | `{ ok, block }`         |

---

## Database Queries

### View All Users

```powershell
mongosh
use edu-ledger
db.users.find().pretty()
```

### View All Documents

```javascript
db.documents.find().pretty();
```

### Find Documents by Owner

```javascript
db.documents.find({ owner: ObjectId("65def456...") });
```

### Find Documents by Issuer

```javascript
db.documents.find({ issuer: ObjectId("65abc123...") });
```

### Delete All Documents (Keep Users)

```javascript
db.documents.deleteMany({});
```

### Delete All Users

```javascript
db.users.deleteMany({});
```

### Drop Entire Database

```javascript
db.dropDatabase();
```

---

## Troubleshooting Summary

| Issue                      | Check                 | Fix                             |
| -------------------------- | --------------------- | ------------------------------- |
| MongoDB won't connect      | `Get-Process mongod`  | Start MongoDB                   |
| Blockchain won't start     | `blockchain/.env`     | Add validator keys              |
| Document upload fails      | Owner User ID         | Get valid ObjectId from MongoDB |
| Document not on blockchain | Pending transactions  | POST `/api/blocks/propose`      |
| User can't see document    | MongoDB `owner` field | Verify correct user ID          |
| Share fails                | Recipient public key  | Use valid PEM format key        |
| Revoke fails               | User is not issuer    | Only issuer can revoke          |

---

## Key Takeaways

1. **Issuer uploads** → Creates MongoDB document with owner=targetUserId
2. **Owner field is critical** → Determines who sees the document
3. **Blockchain issues** → Creates transaction with ownerPubKey (generated or provided)
4. **State reconstruction** → Blockchain maintains in-memory state from all transactions
5. **Revocation** → Only issuer can revoke; sets state.revoked = true
6. **Public verification** → Anyone can check blockchain state without authentication

---

This guide covers the complete workflow from signup to public verification, including real code paths, expected outputs, and debugging steps for each component.
