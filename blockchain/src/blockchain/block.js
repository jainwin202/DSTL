import { createHash } from "crypto";
import { signData, verifySig } from "./wallet.js";

export class Block {
  constructor({ index, prevHash, timestamp, transactions, validatorPubKey, signature, hash }) {
    this.index = index;
    this.prevHash = prevHash;
    this.timestamp = timestamp || Date.now();
    this.transactions = transactions || [];
    this.validatorPubKey = validatorPubKey || null;
    this.signature = signature || null;
    this.hash = hash || this.computeHash();
  }

  computeHash() {
    return createHash("sha256")
      .update(
        JSON.stringify({
          index: this.index,
          prevHash: this.prevHash,
          timestamp: this.timestamp,
          txs: this.transactions.map((t) => t.hash)
        })
      )
      .digest("hex");
  }

  signBlock(privKey) {
    this.signature = signData(privKey, this.hash);
    return this;
  }

  isValid(prevHash, allowedValidators, chainState) {
    if (this.prevHash !== prevHash) return false;
    if (this.computeHash() !== this.hash) return false;

    // Validate validator signature
    if (!this.validatorPubKey || !allowedValidators.includes(this.validatorPubKey)) return false;
    if (!verifySig(this.validatorPubKey, this.hash, this.signature)) return false;

    // Validate all tx
    for (const tx of this.transactions) {
      // DEFINITIVE FIX: The chainState MUST be passed to isValid here.
      // Without it, tx.isValid cannot look up the document owner for SHARE/REVOKE transactions.
      if (!tx.isValid(chainState)) return false;
    }
    return true;
  }
}
