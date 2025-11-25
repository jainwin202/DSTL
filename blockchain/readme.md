# EduLedger Blockchain (Private PoA Node)

This is a **minimal, educational private blockchain** used for credential/document verification.
It supports 3 transaction types:

| TX Type | Description                                         |
| ------- | --------------------------------------------------- |
| ISSUE   | Issuer creates a new document record (docId + hash) |
| SHARE   | Owner grants view permission to another public key  |
| REVOKE  | Permission or document access is revoked            |

### ✅ Features

- Single-validator **Proof of Authority**
- Blocks linked by SHA256
- Signed transactions (secp256k1)
- LevelDB-based storage (persists chain across restarts)
- REST API used by backend server
- WebSocket peer sync (longest chain rule)
- No crypto coins, no gas, no smart contracts

---

## 🔧 Setup

### 1. Install dependencies

```bash
npm install
```
