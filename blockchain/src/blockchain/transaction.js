import { createHash } from "crypto";
import { signData, verifySig } from "./wallet.js";

export class Transaction {
  constructor({ type, payload, issuerPubKey, signature }) {
    this.type = type;           // ISSUE | SHARE | REVOKE
    this.payload = payload;     // { docId, docHash?, to? }
    this.issuerPubKey = issuerPubKey;
    this.signature = signature || null;
    this.hash = this.computeHash();
  }

  computeHash() {
    return createHash("sha256")
      .update(JSON.stringify({ type: this.type, payload: this.payload, issuerPubKey: this.issuerPubKey }))
      .digest("hex");
  }

  sign(issuerPrivKey) {
    const data = JSON.stringify({ type: this.type, payload: this.payload, issuerPubKey: this.issuerPubKey });
    this.signature = signData(issuerPrivKey, data);
    return this;
  }

  isValid() {
    if (!this.signature) return false;
    const data = JSON.stringify({ type: this.type, payload: this.payload, issuerPubKey: this.issuerPubKey });
    return verifySig(this.issuerPubKey, data, this.signature);
  }
}
