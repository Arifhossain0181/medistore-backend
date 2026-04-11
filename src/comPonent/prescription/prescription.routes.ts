import { Router } from "express";
import { handleScan, handleScanAndAddToCart } from "./prescription.controller.js";

const router = Router();

// POST /api/prescription/scan
router.post("/scan", handleScan);
router.post("/scan-and-add", handleScanAndAddToCart);

export default router;