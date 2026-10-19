import { Router } from "express";
import { register } from "../controllers/auth.controller.js";
import { authLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.post("/register", authLimiter, register);

export default router;