import Appointment, { APPOINTMENT_STATUSES } from "../models/Appointment.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createAppointment } from "../services/appointmentService.js";
import { getDoctorProfileId } from "../utils/ownership.js";
import { optionalString, throwIfErrors } from "../utils/validate.js";

// The only fields ever sent to a client. holdsSlot and __v are deliberately absent.
const VIEW_FIELDS =
  "doctor doctorName specialty consultationFee startTime endTime status reason cancelledBy createdAt updatedAt";

// Builds { status } from ?status=..., or {} when not provided. Rejects objects and unknown values.
function statusFilter(query) {
  const errors = [];
  const status = optionalString(query.status, "status", errors, { max: 20 });
  if (status && !APPOINTMENT_STATUSES.includes(status)) {
    errors.push({ field: "status", message: `status must be one of: ${APPOINTMENT_STATUSES.join(", ")}` });
  }
  throwIfErrors(errors);
  return status ? { status } : {};
}

export const bookAppointment = asyncHandler(async (req, res) => {
  const appointment = await createAppointment({ user: req.user, body: req.body });
  res.status(201).json(appointment);
});

// Patient dashboard: only my appointments, newest first
export const listMyAppointments = asyncHandler(async (req, res) => {
  const filter = { patient: req.user._id, ...statusFilter(req.query) };

  const appointments = await Appointment.find(filter)
    .select(VIEW_FIELDS)
    .sort({ startTime: -1 })
    .limit(200)
    .lean();

  res.status(200).json(appointments);
});

// Doctor dashboard: only appointments booked with me, soonest first
export const listDoctorAppointments = asyncHandler(async (req, res) => {
  const profileId = await getDoctorProfileId(req.user);
  if (!profileId) return res.status(200).json([]); // doctor account without a profile

  const filter = { doctor: profileId, ...statusFilter(req.query) };

  const appointments = await Appointment.find(filter)
    .select(`patient ${VIEW_FIELDS}`)
    .populate("patient", "name") // name only: never email or insurer
    .sort({ startTime: 1 })
    .limit(200)
    .lean();

  res.status(200).json(appointments);
});