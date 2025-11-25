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

export async function deleteFile(docId) {
  const filePath = getFilePath(docId);
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, which is fine for a delete operation.
      console.warn(`File not found during deletion: ${filePath}`);
      return true; 
    }
    console.error(`Error deleting file ${filePath}:`, error);
    throw error; // Re-throw other errors
  }
}
