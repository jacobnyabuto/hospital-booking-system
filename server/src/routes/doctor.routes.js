import { Router } from "express";
import { listDoctors } from "../controllers/doctor.controller.js";
import { publicReadLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.get("/", publicReadLimiter, listDoctors);

export default router;