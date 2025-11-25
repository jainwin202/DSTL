import fetch from "node-fetch";
import "dotenv/config";

const docId = process.argv[2];
if (!docId) {
  console.log("Usage: node scripts/verify-doc.js DOC-ID");
  process.exit(1);
}

const API = `${process.env.HOST || "http://localhost:3001"}/api/verify/${docId}`;

const res = await fetch(API);
console.log(await res.json());
