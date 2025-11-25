import fetch from "node-fetch";
import "dotenv/config";

const API = `${process.env.HOST || "http://localhost:3001"}/api/tx/share`;

const body = {
  docId: "DOC-XYZ-001",
  to: "RECIPIENT_PUBLIC_KEY",
  issuerPubKey: process.env.VALIDATOR_PUB,
  issuerPrivKey: process.env.VALIDATOR_PRIV
};

const res = await fetch(API, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

console.log(await res.json());
