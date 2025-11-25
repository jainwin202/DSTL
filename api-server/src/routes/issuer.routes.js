import { Router } from "express";
import multer from "multer";
import requireAuth from "../middleware/requireAuth.js";
import requireIssuer from "../middleware/requireIssuer.js";
import { uploadDocument } from "../controllers/issuer.controller.js";

const upload = multer({ storage: multer.memoryStorage() });

const r = Router();

r.post(
  "/upload",
  requireAuth,
  requireIssuer,
  upload.single("file"),
  uploadDocument
);

export default r;
