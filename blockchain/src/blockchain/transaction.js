import crypto from "crypto";

export class Transaction {
  constructor({ type, payload, issuerPubKey, signature }) {
    this.type = type;
    this.payload = payload;
    this.issuerPubKey = issuerPubKey;
    this.signature = signature;
    this.hash = this.calculateHash();
  }

  getCanonicalData() {
    const data = {
        type: this.type,
        issuerPubKey: this.issuerPubKey,
        payload: {}
    };

    if (this.type === 'ISSUE') {
        data.payload = {
            docId: this.payload.docId,
            docHash: this.payload.docHash,
            ownerPubKey: this.payload.ownerPubKey,
            metadata: this.payload.metadata
        };
    } else if (this.type === 'SHARE') {
        data.payload = {
            docId: this.payload.docId,
            to: this.payload.to
        };
    } else if (this.type === 'REVOKE') {
        data.payload = {
            docId: this.payload.docId
        };
    }
    
    return JSON.stringify(data);
  }

  calculateHash() {
    return crypto.createHash("sha256").update(this.getCanonicalData()).digest("hex");
  }

  isValid(chainState) {
    if (!this.signature) return false;
    const dataToVerify = this.getCanonicalData();
    const verify = crypto.createVerify("SHA256");
    verify.write(dataToVerify);
    verify.end();

    // ISSUE transactions are signed by the issuer's pubkey present on the tx
    if (this.type === "ISSUE") {
      if (!this.issuerPubKey) {
        console.error(`Transaction validation failed: ISSUE tx missing issuerPubKey`);
        return false;
      }
      return verify.verify(this.issuerPubKey, this.signature, "base64");
    }

    // For SHARE and REVOKE we must look up the document in the chain state
    const { docId } = this.payload;
    const docState = chainState[docId];
    if (!docState) {
      console.error(`Transaction validation failed: Document with ID ${docId} not found in chain state.`);
      return false;
    }

    // SHARE: allow signature by either the current owner or the original issuer
    if (this.type === "SHARE") {
      const ownerPub = docState.owner;
      const issuerPub = docState.issuer;
      if (ownerPub && verify.verify(ownerPub, this.signature, "base64")) return true;
      if (issuerPub && verify.verify(issuerPub, this.signature, "base64")) return true;
      console.error(`Transaction validation failed: SHARE signature does not match owner or issuer for docId ${docId}.`);
      return false;
    }

    // REVOKE: must be signed by the original issuer
    if (this.type === "REVOKE") {
      const issuerPub = docState.issuer;
      if (!issuerPub) {
        console.error(`Transaction validation failed: Could not determine issuer public key for docId ${docId}.`);
        return false;
      }
      if (verify.verify(issuerPub, this.signature, "base64")) return true;
      console.error(`Transaction validation failed: REVOKE signature does not match issuer for docId ${docId}.`);
      return false;
    }

    // Unknown tx type
    console.error(`Transaction validation failed: Unknown transaction type ${this.type}`);
    return false;
  }
}
