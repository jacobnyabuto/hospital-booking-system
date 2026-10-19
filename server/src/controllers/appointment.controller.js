import asyncHandler from "../utils/asyncHandler.js";
import { createAppointment } from "../services/appointmentService.js";

export const bookAppointment = asyncHandler(async (req, res) => {
  const appointment = await createAppointment({ user: req.user, body: req.body });
  res.status(201).json(appointment);
});