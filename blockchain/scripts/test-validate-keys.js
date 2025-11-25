import 'dotenv/config';
import { readFileSync } from 'fs';

// Copy of normalizeKey from server index.js
function normalizeKey(key) {
  if (!key || typeof key !== 'string') return key;
  // Convert escaped newlines (literal \n) into actual newlines and trim
  key = key.replace(/\\n/g, '\n').trim();

  // If the key already contains PEM header/footer, canonicalize it
  if (key.includes('-----BEGIN')) {
    const lines = key.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    return lines.join('\n') + '\n';
  }

  // If it contains the words PRIVATE KEY or PUBLIC KEY but no header, wrap appropriately
  if (key.includes('PRIVATE KEY')) {
    const body = key.replace(/.*PRIVATE KEY.*|.*END.*/g, '').trim();
    return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
  }
  if (key.includes('PUBLIC KEY')) {
    const body = key.replace(/.*PUBLIC KEY.*|.*END.*/g, '').trim();
    return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----\n`;
  }

  // Fallback: return as-is
  return key;
}

function keyInfo(pem) {
  if (!pem) return { header: '', footer: '', bodyLen: 0 };
  const lines = pem.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return { header: lines[0] || '', footer: lines[lines.length-1] || '', bodyLen: lines.slice(1,-1).join('').length };
}

(async () => {
  try {
    const { VALIDATOR_PRIV, VALIDATOR_PUB } = process.env;
    console.log('raw VALIDATOR_PRIV length:', VALIDATOR_PRIV ? VALIDATOR_PRIV.length : 'missing');
    console.log('raw VALIDATOR_PUB length:', VALIDATOR_PUB ? VALIDATOR_PUB.length : 'missing');

    const priv = normalizeKey(VALIDATOR_PRIV);
    const pub = normalizeKey(VALIDATOR_PUB);

    console.log('normalized priv info:', keyInfo(priv));
    console.log('normalized pub info:', keyInfo(pub));

    const crypto = await import('crypto');

    try {
      const pk = crypto.createPrivateKey(priv);
      console.log('createPrivateKey succeeded. type:', pk.type || 'unknown');
    } catch (e) {
      console.error('createPrivateKey ERROR:', e && e.message ? e.message : e);
    }

    try {
      const pubk = crypto.createPublicKey(pub);
      console.log('createPublicKey succeeded. type:', pubk.type || 'unknown');
    } catch (e) {
      console.error('createPublicKey ERROR:', e && e.message ? e.message : e);
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
})();
