import { generateKeyPair } from "../src/blockchain/wallet.js";

const kp = generateKeyPair();
console.log("----- PUBLIC KEY -----\n" + kp.publicKey);
console.log("\n----- PRIVATE KEY -----\n" + kp.privateKey);
