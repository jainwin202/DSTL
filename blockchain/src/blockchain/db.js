// blockchain/src/blockchain/db.js
import { Level } from "level";

/**
 * ChainDB - simple LevelDB wrapper for storing the chain.
 * Uses `level` package v9+ which exposes a Level class.
 */
export class ChainDB {
  constructor(path) {
    // create a Level instance that stores JSON values
    this.db = new Level(path, { valueEncoding: "json" });
  }

  async loadChain() {
    try {
      return await this.db.get("chain");
    } catch (err) {
      // if not found, return null (caller creates genesis)
      if (err && err.code === "LEVEL_NOT_FOUND") return null;
      throw err;
    }
  }

  async saveChain(chain) {
    return this.db.put("chain", chain);
  }
}
