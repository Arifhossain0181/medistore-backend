import { Router } from "express";
import { handleMessage } from "./chat.controller.js";

const router = Router();

// Public — login 
router.post('/message', handleMessage);

export default router;