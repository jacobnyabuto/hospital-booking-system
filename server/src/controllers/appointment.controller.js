import Appointment, { APPOINTMENT_STATUSES } from "../models/Appointment.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  createAppointment,
  rescheduleAppointment,
  cancelAppointmentAsPatient,
  changeStatusAsDoctor,
} from "../services/appointmentService.js";import { getDoctorProfileId, assertCanAccess } from "../utils/ownership.js";
import ApiError from "../utils/ApiError.js";
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

export const getAppointment = asyncHandler(async (req, res) => {
  // The ID format was already checked by validateObjectId in the route
  const appointment = await Appointment.findById(req.params.id)
    .select(`patient ${VIEW_FIELDS}`)
    .lean();

  // Same message for "missing" and "not yours"
  if (!appointment) throw new ApiError(404, "Appointment not found");

  const profileId = await getDoctorProfileId(req.user);
  assertCanAccess(appointment, req.user, profileId);

  if (req.user.role === "doctor") {
    // Doctors get the patient's name only
    const patient = await User.findById(appointment.patient).select("name").lean();
    appointment.patient = { _id: appointment.patient, name: patient ? patient.name : "Unknown" };
  } else {
    delete appointment.patient; // patients already know it is themselves
  }

  res.status(200).json(appointment);
});

// Patient view: no patient field, and toJSON hides holdsSlot and __v
function patientView(appointment) {
  const view = appointment.toJSON();
  delete view.patient;
  return view;
}

export const rescheduleMyAppointment = asyncHandler(async (req, res) => {
  const appointment = await rescheduleAppointment({
    user: req.user, id: req.params.id, body: req.body,
  });
  res.status(200).json(patientView(appointment));
});

export const cancelMyAppointment = asyncHandler(async (req, res) => {
  const appointment = await cancelAppointmentAsPatient({ user: req.user, id: req.params.id });
  res.status(200).json(patientView(appointment));
});

export const changeAppointmentStatus = asyncHandler(async (req, res) => {
  const appointment = await changeStatusAsDoctor({
    user: req.user, id: req.params.id, body: req.body,
  });
  const patient = await User.findById(appointment.patient).select("name").lean();

  const view = appointment.toJSON();
  view.patient = { _id: appointment.patient, name: patient ? patient.name : "Unknown" };
  res.status(200).json(view);
});