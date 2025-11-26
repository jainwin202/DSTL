import { Router } from "express";
import { testIssue } from "../controllers/test.controller.js";

const router = Router();

// Dev-only endpoints
router.post('/issue', testIssue);

export default router;
