import Document from "../models/Document.js";
import User from "../models/User.js";
import blockchainService from "../services/blockchain.service.js";

/**
 * Gets documents that the user either owns or has issued.
 */
export async function getOwnedDocs(req, res) {
  const userId = req.user._id;
  const role = req.user.role;

  const query = role === "issuer" ? { issuer: userId } : { owner: userId };
  query.status = 'active'; // Only return active documents

  const docs = await Document.find(query);

  const chainState = await blockchainService.getAugmentedState ? await blockchainService.getAugmentedState() : await blockchainService.getState();
  const merged = docs.map((d) => ({
    docId: d.docId,
    metadata: d.metadata,
    hash: (chainState[d.docId] && chainState[d.docId].hash) || d.hash,
    revoked: (chainState[d.docId] && chainState[d.docId].revoked) || false
  }));

  res.json({ ok: true, docs: merged });
}

/**
 * Gets documents that have been shared with the user.
 * PRIMARY SOURCE: Document.shares array (local database)
 * FALLBACK: Blockchain augmented state (for historical compatibility)
 */
export async function getSharedDocs(req, res) {
  const userPubKey = req.user.blockchainPublicKey;

  console.log(`[getSharedDocs] Looking for docs shared to user pubkey (first 50 chars): ${userPubKey ? userPubKey.slice(0, 50) : 'NONE'}...`);

  // PRIMARY SOURCE: Query MongoDB for documents where user's pubkey is in the shares array
  // Normalize both the query and stored values to handle whitespace variations
  const docs = await Document.find({ 
    status: 'active',
    shares: { $exists: true, $ne: [] }
  });

  // Filter to documents where the user's pubkey is in the shares array
  const sharedDocs = docs.filter(doc => {
    if (!doc.shares || doc.shares.length === 0) return false;
    const found = doc.shares.some(shareKey => {
      const normalizedShare = (shareKey || '').trim();
      const normalizedUser = (userPubKey || '').trim();
      return normalizedShare === normalizedUser;
    });
    if (found) {
      console.log(`[getSharedDocs] Found shared doc ${doc.docId}`);
    }
    return found;
  });

  console.log(`[getSharedDocs] Found ${sharedDocs.length} docs from Database shares array`);

  // Also check blockchain augmented state as fallback/additional source
  let chainState = {};
  try {
    chainState = await blockchainService.getAugmentedState ? await blockchainService.getAugmentedState() : await blockchainService.getState();
  } catch (e) {
    console.warn(`[getSharedDocs] Could not fetch blockchain state: ${e.message}`);
  }

  // Build result with merged data
  const merged = sharedDocs.map((d) => {
    const chainEntry = chainState[d.docId];
    return {
      docId: d.docId,
      metadata: d.metadata,
      hash: chainEntry?.hash || d.hash,
      revoked: chainEntry?.revoked || (d.status === 'revoked')
    };
  });

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
    status: doc.status, // Return the DB status ('active' or 'revoked')
    // Use on-chain value when available; otherwise fall back to stored values
    hash: (chainEntry && chainEntry.hash) || doc.hash || doc.metadata?.txHash,
    revoked: (chainEntry && chainEntry.revoked) || doc.status === 'revoked', // Combine DB and chain status
    issuer: doc.issuer,
    owner: doc.owner
  });
}
