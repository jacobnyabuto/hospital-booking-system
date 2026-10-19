import { Router } from "express";
import { listDoctors, getDoctor } from "../controllers/doctor.controller.js";
import { publicReadLimiter } from "../middleware/rateLimiters.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = Router();

router.get("/", publicReadLimiter, listDoctors);
router.get("/:id", publicReadLimiter, validateObjectId("id"), getDoctor);

export default router;