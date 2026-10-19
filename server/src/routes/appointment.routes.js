import { Router } from "express";
import { bookAppointment } from "../controllers/appointment.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticate, requireRole("patient"), bookAppointment);

export default router;