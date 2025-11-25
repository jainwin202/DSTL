import crypto from "crypto";

export class Transaction {
  constructor({ type, payload, issuerPubKey, signature }) {
    this.type = type;
    this.payload = payload;
    this.issuerPubKey = issuerPubKey;
    this.signature = signature;
    this.hash = this.calculateHash();
  }

  /**
   * Creates the canonical string representation of the transaction data for hashing and signing.
   * This ensures that both the signing (API server) and verification (blockchain) parts
   * are working with the exact same data string.
   */
  getCanonicalData() {
    const data = {
      type: this.type,
      payload: this.payload,
      issuerPubKey: this.issuerPubKey,
    };
    // Use JSON.stringify to create a consistent, canonical string.
    return JSON.stringify(data);
  }

  calculateHash() {
    return crypto.createHash("sha256").update(this.getCanonicalData()).digest("hex");
  }

  sign(privateKey) {
    if (!privateKey) {
      throw new Error("Private key is required to sign the transaction.");
    }
    const dataToSign = this.getCanonicalData();
    this.signature = crypto.sign("sha256", Buffer.from(dataToSign), privateKey).toString("base64");
    return this;
  }

  isValid(chainState) {
    if (!this.signature) return false;

    let signingPubKey;
    const { docId } = this.payload;

    if (this.type === "ISSUE") {
      // For ISSUE transactions, the signing key is the issuer's public key itself.
      signingPubKey = this.issuerPubKey;
    } else {
      // For SHARE and REVOKE, we need to find the original issuer from the chain state.
      const docState = chainState[docId];
      if (!docState) {
        console.error(`Transaction validation failed: Document with ID ${docId} not found in chain state.`);
        return false;
      }
      signingPubKey = docState.issuer;
    }

    if (!signingPubKey) {
      console.error(`Transaction validation failed: Could not determine signing public key for docId ${docId}.`);
      return false;
    }

    // CRITICAL FIX: Use the canonical data string for verification.
    const dataToVerify = this.getCanonicalData();
    const verify = crypto.createVerify("SHA256");
    verify.write(dataToVerify);
    verify.end();

    return verify.verify(signingPubKey, this.signature, "base64");
  }
}
