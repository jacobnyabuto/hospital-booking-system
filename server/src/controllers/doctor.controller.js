import Doctor, { SPECIALTIES } from "../models/Doctor.js";
import asyncHandler from "../utils/asyncHandler.js";
import { optionalString, escapeRegex, throwIfErrors } from "../utils/validate.js";

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