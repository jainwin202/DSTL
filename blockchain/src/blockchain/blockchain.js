import { Block } from "./block.js";
import { Transaction } from "./transaction.js";
import { ChainDB } from "./db.js";

export class Blockchain {
  constructor({ dbPath, validatorPubKey, allowedValidators }) {
    this.db = new ChainDB(dbPath);
    this.chain = [];
    this.pendingTxs = [];
    this.validatorPubKey = validatorPubKey;
    this.allowedValidators = allowedValidators || [validatorPubKey];
    this.loaded = false;
  }

  async init() {
    try {
      console.log('Initializing blockchain...');
      await this.db.db.open();
      console.log('Database opened successfully');
      
      const saved = await this.db.loadChain();
      if (saved && saved.length) {
        console.log('Loaded existing chain with', saved.length, 'blocks');
        this.chain = saved;
        this.loaded = true;
        return;
      }

      // genesis block
      console.log('Creating genesis block...');
      const genesis = new Block({
        index: 0,
        prevHash: "0".repeat(64),
        transactions: [],
        validatorPubKey: this.validatorPubKey
      });
      this.chain = [genesis];
      await this.db.saveChain(this.chain);
      console.log('Genesis block created and saved');
      this.loaded = true;
    } catch (err) {
      console.error('Failed to initialize blockchain:', err);
      throw err;
    }
    await this.db.saveChain(this.chain);
    this.loaded = true;
  }

  lastBlock() {
    return this.chain[this.chain.length - 1];
  }

  addTransaction(tx) {
    if (!tx.isValid()) throw new Error("Invalid transaction");
    this.pendingTxs.push(tx);
  }

  async proposeBlock(validatorPrivKey) {
    const block = new Block({
      index: this.chain.length,
      prevHash: this.lastBlock().hash,
      transactions: this.pendingTxs,
      validatorPubKey: this.validatorPubKey
    }).signBlock(validatorPrivKey);

    if (!block.isValid(this.lastBlock().hash, this.allowedValidators)) {
      throw new Error("Block validation failed");
    }

    this.chain.push(block);
    this.pendingTxs = [];
    await this.db.saveChain(this.chain);
    return block;
  }

  async replaceChain(newChain) {
    if (!Array.isArray(newChain) || newChain.length <= this.chain.length) return false;
    this.chain = newChain;
    await this.db.saveChain(newChain);
    return true;
  }

  // Rebuild credential ownership state
  getState() {
    const state = {};

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        const { type, payload, issuerPubKey } = tx;
        if (type === "ISSUE") {
          const { docId, docHash, ownerPubKey, metadata } = payload;
          state[docId] = { issuer: issuerPubKey, owner: ownerPubKey, hash: docHash, revoked: false, shares: [], metadata };
        }
        if (type === "SHARE") {
          const { docId, to } = payload;
          if (state[docId] && !state[docId].revoked) state[docId].shares.push(to);
        }
        if (type === "REVOKE") {
          const { docId } = payload;
          if (state[docId]) state[docId].revoked = true;
        }
      }
    }
    return state;
  }
}
