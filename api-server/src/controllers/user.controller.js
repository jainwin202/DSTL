import Document from "../models/Document.js";
import User from "../models/User.js";
import blockchainService from "../services/blockchain.service.js";

export async function getMyDocs(req, res) {
  const userId = req.user._id;
  const role = req.user.role;

  let docs;

  if (role === "issuer") {
    // Show docs issued by this institution
    docs = await Document.find({ issuer: userId });
  } else {
    // Normal user: show owned docs
    docs = await Document.find({ owner: userId });
  }

  const chainState = await blockchainService.getState();

  const merged = docs.map((d) => ({
    docId: d.docId,
    metadata: d.metadata,
    // Prefer on-chain hash, fall back to stored file hash or stored tx hash
    hash: (chainState[d.docId] && chainState[d.docId].hash) || d.hash || d.metadata?.txHash,
    revoked: (chainState[d.docId] && chainState[d.docId].revoked) || false
  }));

  res.json({ ok: true, docs: merged });
}

export async function getSingleDoc(req, res) {
  const docId = req.params.id;
  const doc = await Document.findOne({ docId }).populate("issuer owner", "email role blockchainPublicKey");

  if (!doc) return res.status(404).json({ ok: false, error: "Not found" });

  const chainState = await blockchainService.getState();
  const chainEntry = chainState[docId];
  res.json({
    ok: true,
    docId,
    metadata: doc.metadata,
    // Use on-chain value when available; otherwise fall back to stored values
    hash: (chainEntry && chainEntry.hash) || doc.hash || doc.metadata?.txHash,
    revoked: (chainEntry && chainEntry.revoked) || false,
    issuer: doc.issuer,
    owner: doc.owner
  });
}
