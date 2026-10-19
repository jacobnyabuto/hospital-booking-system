import Doctor, { SPECIALTIES } from "../models/Doctor.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { optionalString, requireString, escapeRegex, throwIfErrors } from "../utils/validate.js";
import {
  getClinicTimezone,
  isValidDateString,
  todayInClinic,
  getSlotsForDate,
} from "../services/slotService.js";

// Fields sent to the public. "user" and "__v" are deliberately absent.
export const PUBLIC_DOCTOR_FIELDS =
  "fullName specialty location bio consultationFee rating ratingCount acceptedInsurers workingDays workStart workEnd slotMinutes";

export const listDoctors = asyncHandler(async (req, res) => {
  const errors = [];
  const specialty = optionalString(req.query.specialty, "specialty", errors, { max: 40 });
  const search = optionalString(req.query.search, "search", errors, { max: 80 });
  const location = optionalString(req.query.location, "location", errors, { max: 100 });
  const insurer = optionalString(req.query.insurer, "insurer", errors, { max: 80 });

  if (specialty && !SPECIALTIES.includes(specialty)) {
    errors.push({ field: "specialty", message: "specialty is not supported" });
  }
  throwIfErrors(errors);

  // We build the filter ourselves: req.query is never passed to MongoDB
  const filter = { isActive: true };
  if (specialty) filter.specialty = specialty;
  if (search) filter.fullName = { $regex: escapeRegex(search), $options: "i" };
  if (location) filter.location = { $regex: escapeRegex(location), $options: "i" };
  if (insurer) filter.acceptedInsurers = insurer; // exact match against the array

  const doctors = await Doctor.find(filter)
    .select(PUBLIC_DOCTOR_FIELDS)
    .sort({ fullName: 1 })
    .limit(50)
    .lean();

  res.status(200).json(doctors);
});

export const getDoctor = asyncHandler(async (req, res) => {
  // The ID format was already checked by validateObjectId in the route
  const doctor = await Doctor.findOne({ _id: req.params.id, isActive: true })
    .select(PUBLIC_DOCTOR_FIELDS)
    .lean();

  if (!doctor) throw new ApiError(404, "Doctor not found");

  res.status(200).json(doctor);
});

export const getDoctorSlots = asyncHandler(async (req, res) => {
  const timezone = getClinicTimezone();

  const errors = [];
  const date = requireString(req.query.date, "date", errors, { max: 10 });
  if (date && !isValidDateString(date, timezone)) {
    errors.push({ field: "date", message: "date must be a real date in YYYY-MM-DD format" });
  } else if (date && date < todayInClinic(timezone)) {
    // YYYY-MM-DD strings compare correctly as text
    errors.push({ field: "date", message: "date cannot be in the past" });
  }
  throwIfErrors(errors);

  const doctor = await Doctor.findOne({ _id: req.params.id, isActive: true })
    .select("workingDays workStart workEnd slotMinutes")
    .lean();
  if (!doctor) throw new ApiError(404, "Doctor not found");

  const slots = await getSlotsForDate(doctor, date, timezone);
  res.status(200).json({ date, timezone, slots });
});