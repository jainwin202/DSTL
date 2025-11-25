import express from "express";
import { Transaction } from "../blockchain/transaction.js";

export function buildRouter({ chain, p2p, validator }) {
  const r = express.Router();

  r.get("/health", (_, res) => res.json({ ok: true, node: process.env.NODE_NAME }));

  r.get("/chain", (_, res) => res.json(chain.chain));
  r.get("/state", (_, res) => res.json(chain.getState()));
  r.get("/pending", (_, res) => res.json(chain.pendingTxs));

  r.get("/verify/:docId", (req, res) => {
    const state = chain.getState();
    const entry = state[req.params.docId];
    if (!entry) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, entry });
  });

  // ---- ISSUE TX ----
  r.post("/tx/issue", async (req, res) => {
    try {
      console.log('Received issue request:', req.body);
      const { type, payload, issuerPubKey, signature } = req.body;

      if (!type || !payload || !issuerPubKey || !signature) {
        return res.status(400).json({
          ok: false,
          error: "Missing required fields",
          received: { type: !!type, payload: !!payload, issuerPubKey: !!issuerPubKey, signature: !!signature }
        });
      }

      const tx = new Transaction({ type, payload, issuerPubKey, signature });

      if (!tx.isValid()) {
        console.error('Invalid transaction signature');
        return res.status(400).json({ ok: false, error: "Invalid transaction signature" });
      }

      console.log('Created transaction:', { hash: tx.hash, type: tx.type });
      
      chain.addTransaction(tx);
      p2p.broadcastTx(tx);

      res.json({ ok: true, tx: tx.hash });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // ---- SHARE TX ----
  r.post("/tx/share", async (req, res) => {
    try {
      const { docId, to, issuerPubKey, issuerPrivKey } = req.body;

      const tx = new Transaction({
        type: "SHARE",
        payload: { docId, to },
        issuerPubKey
      }).sign(issuerPrivKey);

      chain.addTransaction(tx);
      p2p.broadcastTx(tx);

      res.json({ ok: true, tx: tx.hash });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // ---- REVOKE TX ----
  r.post("/tx/revoke", async (req, res) => {
    try {
      const { docId, issuerPubKey, issuerPrivKey } = req.body;

      const tx = new Transaction({
        type: "REVOKE",
        payload: { docId },
        issuerPubKey
      }).sign(issuerPrivKey);

      chain.addTransaction(tx);
      p2p.broadcastTx(tx);

      res.json({ ok: true, tx: tx.hash });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // ---- PROPOSE BLOCK (PoA) ----
  r.post("/blocks/propose", async (_, res) => {
    try {
        // Ensure private key is properly formatted
        let privKey = validator.priv;
        if (typeof privKey === 'string' && !privKey.includes('BEGIN PRIVATE KEY')) {
          privKey = `-----BEGIN PRIVATE KEY-----\n${privKey}\n-----END PRIVATE KEY-----`;
        }
        console.log('Proposing block with validator key');
        // Log minimal info about key for debugging (do not print full key)
        try {
          const header = privKey.split(/\r?\n/)[0] || '';
          const footer = privKey.split(/\r?\n/).slice(-1)[0] || '';
          const body = privKey.split(/\r?\n/).slice(1, -1).join('');
          console.log('Validator key header:', header);
          console.log('Validator key footer:', footer);
          console.log('Validator key body length:', body.length);

          // quick validation of PEM using crypto.createPrivateKey to get clearer errors
          const crypto = await import('crypto');
          crypto.createPrivateKey(privKey);
        } catch (pkErr) {
          console.error('Validator private key invalid:', pkErr.message);
          return res.status(400).json({ ok: false, error: `Validator private key invalid: ${pkErr.message}` });
        }

        const block = await chain.proposeBlock(privKey);
      p2p.broadcastNewBlock();
      res.json({ ok: true, block });
    } catch (e) {
        console.error('Block proposal error:', e.message);
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  return r;
}
