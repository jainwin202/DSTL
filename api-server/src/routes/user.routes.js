import { Router } from "express";
import { getOwnedDocs, getSharedDocs, getSingleDoc } from "../controllers/user.controller.js";
import { shareDoc, revokeDoc, downloadDoc } from "../controllers/user.actions.js";

const router = Router();

// Document viewing
router.get("/owned-docs", getOwnedDocs);
router.get("/shared-docs", getSharedDocs);
router.get("/doc/:id", getSingleDoc);
router.get("/download/:id", downloadDoc);

// Document actions
router.post("/share", shareDoc);
router.post("/revoke", revokeDoc);

export default router;
