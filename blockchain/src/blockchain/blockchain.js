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

      // Try opening LevelDB with a few retries to handle transient LOCK errors
      const maxOpenAttempts = 5;
      let opened = false;
      for (let attempt = 1; attempt <= maxOpenAttempts; attempt++) {
        try {
          await this.db.db.open();
          opened = true;
          console.log('Database opened successfully');
          break;
        } catch (openErr) {
          const locked = openErr && openErr.cause && (openErr.cause.code === 'LEVEL_LOCKED' || openErr.cause.code === 'LEVEL_DATABASE_NOT_OPEN');
          console.warn(`Attempt ${attempt} to open DB failed: ${openErr.message}`);
          // If lock detected and user requested forced clear, attempt to remove LOCK file (dev only)
          if (locked && process.env.FORCE_CLEAR_LOCK === 'true') {
            try {
              const fs = await import('fs');
              const path = this.db.db.location || '.data-node-1';
              const lockPath = path + '/LOCK';
              if (fs.existsSync(lockPath)) {
                console.warn('FORCE_CLEAR_LOCK enabled: removing stale LevelDB LOCK file:', lockPath);
                fs.unlinkSync(lockPath);
              }
            } catch (rmErr) {
              console.warn('Failed to remove LOCK file automatically:', rmErr.message || rmErr);
            }
          }

          if (locked && attempt < maxOpenAttempts) {
            console.warn('LevelDB appears locked. Retrying after delay...');
            // wait before retrying
            await new Promise((r) => setTimeout(r, 500));
            continue;
          }
          // For non-lock or final failure, rethrow with helpful hint
          const e = new Error(`Failed to open LevelDB after ${attempt} attempts: ${openErr.message}`);
          e.cause = openErr;
          throw e;
        }
      }
      if (!opened) {
        throw new Error('Unable to open LevelDB; it may be locked by another process. Stop other nodes or remove the .data-* LOCK file and retry.');
      }
      
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
    if (!tx.isValid(this.getAugmentedState())) {
        console.error("Invalid transaction was rejected:", JSON.stringify(tx, null, 2));
        throw new Error("Invalid transaction signature");
    }
    this.pendingTxs.push(tx);
  }

  async proposeBlock(validatorPrivKey) {
    const block = new Block({
      index: this.chain.length,
      prevHash: this.lastBlock().hash,
      transactions: this.pendingTxs,
      validatorPubKey: this.validatorPubKey
    }).signBlock(validatorPrivKey);

    // Pass the current state to the block validation logic.
    if (!block.isValid(this.lastBlock().hash, this.allowedValidators, this.getState())) {
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
          if (state[docId] && !state[docId].revoked) {
            state[docId].shares.push(to);
            state[docId].owner = to;
          }
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
    const state = this.getState();

    for (const tx of this.pendingTxs) {
        const { type, payload, issuerPubKey } = tx;
        if (type === "ISSUE") {
          const { docId, docHash, ownerPubKey, metadata } = payload;
          if (!state[docId]) {
            state[docId] = { issuer: issuerPubKey, owner: ownerPubKey, hash: docHash, revoked: false, shares: [], metadata };
          }
        }
        if (type === "SHARE") {
          const { docId, to } = payload;
          if (state[docId] && !state[docId].revoked) {
            if (!state[docId].shares.includes(to)) {
                state[docId].shares.push(to);
            }
            state[docId].owner = to;
          }
        }
        if (type === "REVOKE") {
          const { docId } = payload;
          if (state[docId]) {
            state[docId].revoked = true;
          }
        }
    }
    return state;
  }
}
