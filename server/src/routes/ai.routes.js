import { Router } from "express";
import { recommend } from "../controllers/ai.controller.js";
import { authenticate } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.post("/recommend-doctor", authenticate, aiLimiter, recommend);

export default router;