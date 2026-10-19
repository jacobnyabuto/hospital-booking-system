import "dotenv/config";
import mongoose from "mongoose";
import ApiError from "../src/utils/ApiError.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import Doctor from "../src/models/Doctor.js";
import {
  sameId, isPatientOwner, isDoctorOwner,
  assertPatientOwner, assertDoctorOwner, assertCanAccess, getDoctorProfileId,
} from "../src/utils/ownership.js";

let failures = 0;
function report(pass, label) {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
}
const oid = () => new mongoose.Types.ObjectId();

// Returns the status of a thrown ApiError, "other" for any other error, or null if nothing was thrown
function statusOf(fn) {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof ApiError ? error.status : "other";
  }
}

// ---- Fake data: no database needed for this part ----
const patientA = { _id: oid(), role: "patient" };
const patientB = { _id: oid(), role: "patient" };
const doctorUserX = { _id: oid(), role: "doctor" };
const doctorProfileX = oid();
const doctorProfileY = oid();
const appointment = { patient: patientA._id, doctor: doctorProfileX };

// sameId
report(sameId(patientA._id, String(patientA._id)), "ObjectId equals its string form");
report(sameId(patientA._id, new mongoose.Types.ObjectId(String(patientA._id))), "two ObjectId objects with the same value match");
report(!sameId(patientA._id, patientB._id), "different IDs do not match");
report(!sameId(undefined, undefined), "undefined never matches undefined");
report(!sameId(null, patientA._id), "null never matches");
report(sameId({ _id: patientA._id, name: "Populated" }, patientA._id), "populated document matches by _id");

// patient ownership
report(isPatientOwner(appointment, patientA), "owning patient is the owner");
report(!isPatientOwner(appointment, patientB), "another patient is not the owner");
report(!isPatientOwner(appointment, doctorUserX), "a doctor is not the patient owner");
report(!isPatientOwner(appointment, { _id: patientA._id, role: "doctor" }), "role must also be patient, even with a matching ID");
report(!isPatientOwner(null, patientA) && !isPatientOwner(appointment, null), "missing appointment or user is not an owner");

// doctor ownership
report(isDoctorOwner(appointment, doctorUserX, doctorProfileX), "owning doctor is the owner");
report(!isDoctorOwner(appointment, doctorUserX, doctorProfileY), "another doctor's profile is not the owner");
report(!isDoctorOwner(appointment, doctorUserX, null), "doctor without a profile is not the owner");
report(!isDoctorOwner(appointment, patientA, doctorProfileX), "a patient cannot act as the doctor owner");
report(
  !isDoctorOwner({ patient: patientA._id, doctor: doctorUserX._id }, doctorUserX, doctorProfileX),
  "a doctor's User _id is not their Doctor profile _id"
);

// asserts: 404, never 403
report(statusOf(() => assertPatientOwner(appointment, patientA)) === null, "assertPatientOwner passes for the owner");
report(statusOf(() => assertPatientOwner(appointment, patientB)) === 404, "assertPatientOwner gives 404 for another patient");
report(statusOf(() => assertPatientOwner(undefined, patientA)) === 404, "assertPatientOwner gives 404 for a missing appointment");
report(statusOf(() => assertDoctorOwner(appointment, doctorUserX, doctorProfileX)) === null, "assertDoctorOwner passes for the owner");
report(statusOf(() => assertDoctorOwner(appointment, doctorUserX, doctorProfileY)) === 404, "assertDoctorOwner gives 404 for another doctor");
report(statusOf(() => assertCanAccess(appointment, patientA, null)) === null, "assertCanAccess passes for the patient owner");
report(statusOf(() => assertCanAccess(appointment, doctorUserX, doctorProfileX)) === null, "assertCanAccess passes for the doctor owner");
report(statusOf(() => assertCanAccess(appointment, patientB, null)) === 404, "assertCanAccess gives 404 for a stranger (patient)");
report(statusOf(() => assertCanAccess(appointment, doctorUserX, doctorProfileY)) === 404, "assertCanAccess gives 404 for a stranger (doctor)");

// the message must be identical for "not yours" and "does not exist"
let notYours = "", missing = "";
try { assertCanAccess(appointment, patientB, null); } catch (e) { notYours = e.message; }
try { assertCanAccess(undefined, patientA, null); } catch (e) { missing = e.message; }
report(notYours === "Appointment not found" && notYours === missing, "'not yours' and 'does not exist' give the same message");

// ---- Database part: reads two seeded accounts, writes nothing ----
let connected = false;
try {
  await connectDB();
  connected = true;

  const doctorUser = await User.findOne({ email: "priya.nair@hospital-demo.test" });
  const patientUser = await User.findOne({ email: "demo.patient@hospital-demo.test" });
  report(!!doctorUser && !!patientUser, "seeded doctor and patient exist");

  const profileId = await getDoctorProfileId(doctorUser);
  const realProfile = await Doctor.findOne({ user: doctorUser._id }).select("_id").lean();
  report(!!profileId && sameId(profileId, realProfile._id), "getDoctorProfileId finds the doctor's own profile");
  report(!sameId(profileId, doctorUser._id), "profile _id differs from the user _id");
  report((await getDoctorProfileId(patientUser)) === null, "getDoctorProfileId returns null for a patient");
  report((await getDoctorProfileId(null)) === null, "getDoctorProfileId returns null for no user");
} catch (error) {
  failures++;
  console.error("Test crashed:", error.name, error.message);
} finally {
  if (connected) await disconnectDB();
}

console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;