import { Router } from "express";
import { register, login, getMe, updateMe } from "../controllers/auth.controller.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateMe);

export default router;