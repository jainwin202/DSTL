import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS);

export function saveFile(docId, fileBuffer, extension = ".pdf") {
  const filePath = path.join(UPLOADS, docId + extension);
  fs.writeFileSync(filePath, fileBuffer);
  return filePath;
}

export function getFilePath(docId) {
  return path.join(UPLOADS, docId + ".pdf");
}
