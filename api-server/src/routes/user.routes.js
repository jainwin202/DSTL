import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getMyDocs, getSingleDoc } from "../controllers/user.controller.js";
import { shareDoc, revokeDoc, downloadDoc } from "../controllers/user.actions.js";

const r = Router();
r.use(requireAuth);

r.get("/docs", getMyDocs);
r.get("/doc/:id", getSingleDoc);
r.get("/download/:id", downloadDoc);
r.post("/share", shareDoc);
r.post("/revoke", revokeDoc);

export default r;
