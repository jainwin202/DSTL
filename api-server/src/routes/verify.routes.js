import { Router } from "express";
import axios from "axios";

const router = Router();
const BLOCKCHAIN_API = process.env.BLOCKCHAIN_API || "http://localhost:3001/api";

/**
 * Public endpoint to verify a document on the blockchain
 * GET /verify/:docId
 */
router.get("/:docId", async (req, res) => {
    try {
        const { docId } = req.params;
        
        if (!docId || docId.trim() === "") {
            return res.status(400).json({ ok: false, error: "Document ID is required" });
        }

        // Call blockchain verify endpoint
        const response = await axios.get(`${BLOCKCHAIN_API}/verify/${docId}`);
        res.json(response.data);
    } catch (err) {
        const status = err.response?.status || 500;
        const message = err.response?.data?.error || err.message || "Verification failed";
        
        if (status === 404) {
            return res.status(404).json({ ok: false, error: "Document not found on blockchain" });
        }
        
        res.status(status).json({ ok: false, error: message });
    }
});

export default router;
