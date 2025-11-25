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
    // Pass the augmented state to isValid so it can validate all tx types
    if (!tx.isValid(this.getAugmentedState())) throw new Error("Invalid transaction");
    this.pendingTxs.push(tx);
  }

  async proposeBlock(validatorPrivKey) {
    // CRITICAL FIX: The validator's private key must be passed to signBlock.
    const block = new Block({
      index: this.chain.length,
      prevHash: this.lastBlock().hash,
      transactions: this.pendingTxs,
      validatorPubKey: this.validatorPubKey
    }).signBlock(validatorPrivKey); // Pass the key here.

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

  getAugmentedState() {
    // Start with the confirmed state from the blocks
    const state = this.getState();

    // Now, apply pending transactions on top of that state
    for (const tx of this.pendingTxs) {
        const { type, payload, issuerPubKey } = tx;
        if (type === "ISSUE") {
          const { docId, docHash, ownerPubKey, metadata } = payload;
          // Add the document to the state if it's not already there from a mined block
          if (!state[docId]) {
            state[docId] = { issuer: issuerPubKey, owner: ownerPubKey, hash: docHash, revoked: false, shares: [], metadata };
          }
        }
        if (type === "SHARE") {
          const { docId, to } = payload;
          // Add a share if the doc exists and is not revoked
          if (state[docId] && !state[docId].revoked) {
            // Avoid duplicate shares if the tx is already in a block
            if (!state[docId].shares.includes(to)) {
                state[docId].shares.push(to);
            }
          }
        }
        if (type === "REVOKE") {
          const { docId } = payload;
          // Revoke if the doc exists
          if (state[docId]) {
            state[docId].revoked = true;
          }
        }
    }
    return state;
  }
}
