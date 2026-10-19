import { Router } from "express";
import {
  bookAppointment,
  listMyAppointments,
  listDoctorAppointments,
} from "../controllers/appointment.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticate, requireRole("patient"), bookAppointment);

// Fixed paths first: these must stay above any "/:id" route
router.get("/mine", authenticate, requireRole("patient"), listMyAppointments);
router.get("/doctor/mine", authenticate, requireRole("doctor"), listDoctorAppointments);

export default router;