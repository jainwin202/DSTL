import { generateKeyPairSync, createSign, createVerify, createHash } from "crypto";

function formatKey(key, isPrivate = false) {
  if (typeof key !== 'string') return key;
  
  const type = isPrivate ? 'PRIVATE' : 'PUBLIC';
  if (key.includes(`BEGIN ${type} KEY`)) return key;
  
  return `-----BEGIN ${type} KEY-----\n${key}\n-----END ${type} KEY-----`;
}

export function generateKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "secp256k1"
  });

  return {
    publicKey: publicKey.export({ type: "spki", format: "pem" }),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" })
  };
}

export function signData(privateKeyPem, data) {
  privateKeyPem = formatKey(privateKeyPem, true);
  const sign = createSign("SHA256");
  sign.update(data);
  sign.end();
  return sign.sign(privateKeyPem, "base64");
}

export function verifySig(publicKeyPem, data, signature) {
  publicKeyPem = formatKey(publicKeyPem, false);
  const verify = createVerify("SHA256");
  verify.update(data);
  verify.end();
  return verify.verify(publicKeyPem, signature, "base64");
}

export function pubKeyToAddress(pubKey) {
  return createHash("sha256").update(pubKey).digest("hex").slice(0, 40);
}
