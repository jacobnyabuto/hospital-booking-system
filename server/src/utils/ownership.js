import Doctor from "../models/Doctor.js";
import ApiError from "./ApiError.js";

const NOT_FOUND = "Appointment not found";

// A populated field is a document with _id; an unpopulated one is the ID itself
function idOf(value) {
  return value && value._id ? value._id : value;
}

// ObjectIds are objects, so === fails. Compare their string forms.
export function sameId(a, b) {
  const left = idOf(a);
  const right = idOf(b);
  return left != null && right != null && String(left) === String(right);
}

export function isPatientOwner(appointment, user) {
  return !!appointment && !!user && user.role === "patient" && sameId(appointment.patient, user._id);
}

// doctorProfileId is the _id of the Doctor profile that belongs to the logged-in doctor
export function isDoctorOwner(appointment, user, doctorProfileId) {
  return (
    !!appointment &&
    !!user &&
    user.role === "doctor" &&
    doctorProfileId != null &&
    sameId(appointment.doctor, doctorProfileId)
  );
}

// Throw 404 unless the user is the owning patient
export function assertPatientOwner(appointment, user) {
  if (!isPatientOwner(appointment, user)) throw new ApiError(404, NOT_FOUND);
}

// Throw 404 unless the user is the owning doctor
export function assertDoctorOwner(appointment, user, doctorProfileId) {
  if (!isDoctorOwner(appointment, user, doctorProfileId)) throw new ApiError(404, NOT_FOUND);
}

// Throw 404 unless the user is the owning patient OR the owning doctor
export function assertCanAccess(appointment, user, doctorProfileId) {
  if (!isPatientOwner(appointment, user) && !isDoctorOwner(appointment, user, doctorProfileId)) {
    throw new ApiError(404, NOT_FOUND);
  }
}

// Returns the Doctor profile _id for a doctor user, or null for anyone else.
// The profile is looked up by Doctor.user, never taken from the request.
export async function getDoctorProfileId(user) {
  if (!user || user.role !== "doctor") return null;
  const profile = await Doctor.findOne({ user: user._id }).select("_id").lean();
  return profile ? profile._id : null;
}