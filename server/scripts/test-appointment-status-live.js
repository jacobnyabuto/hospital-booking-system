import "dotenv/config";
import { DateTime } from "luxon";
import { connectDB, disconnectDB } from "../src/config/db.js";
import Appointment from "../src/models/Appointment.js";
import User from "../src/models/User.js";

const BASE = process.env.TEST_API_URL || "http://localhost:5000/api";
const TZ = "America/Chicago";
const TAG = "Status-test fake reason";
let failures = 0;
function report(pass, label) {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
}

async function call(path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}
async function login(email, password) {
  const r = await call("/auth/login", { method: "POST", body: { email, password } });
  return r.json?.token;
}

try {
  await connectDB();
  const demo = await User.findOne({ email: "demo.patient@hospital-demo.test" }).select("_id");

  const patientToken = await login("demo.patient@hospital-demo.test", process.env.SEED_PATIENT_PASSWORD);
  const priyaToken = await login("priya.nair@hospital-demo.test", process.env.SEED_DOCTOR_PASSWORD);
  const bellToken = await login("marcus.bell@hospital-demo.test", process.env.SEED_DOCTOR_PASSWORD);
  report(!!patientToken && !!priyaToken && !!bellToken, "three logins return tokens");

  const priya = (await call("/doctors")).json.find((d) => d.fullName === "Dr. Priya Nair");

  // Future slots (booked through the real API) and one past slot (inserted directly)
  const day = DateTime.now().setZone(TZ).plus({ days: 50 }).startOf("day");
  const slot = (h, m = 0) => day.set({ hour: h, minute: m }).toUTC().toISO();
  const book = async (start) => (await call("/appointments", {
    method: "POST", token: patientToken, body: { doctorId: priya._id, startTime: start, reason: TAG },
  })).json;
  const setStatus = (id, token, status) =>
    call(`/appointments/${id}/status`, { method: "PATCH", token, body: { status } });

  const A = await book(slot(9));
  const B = await book(slot(9, 30));
  const C = await book(slot(10));
  report(!!A?._id && !!B?._id && !!C?._id, "setup: three pending appointments booked");

  // Authentication and role
  report((await setStatus(A._id, undefined, "confirmed")).status === 401, "no token: 401");
  report((await setStatus(A._id, patientToken, "confirmed")).status === 403, "patient token: 403");

  // Ownership
  const stranger = await setStatus(A._id, bellToken, "confirmed");
  const missing = await setStatus("000000000000000000000000", bellToken, "confirmed");
  report(stranger.status === 404 && JSON.stringify(stranger.json) === JSON.stringify(missing.json), "another doctor: same 404 as a missing record");
  report((await Appointment.findById(A._id)).status === "pending", "stranger changed nothing");

  // Input
  report((await setStatus(A._id, priyaToken, "bogus")).status === 400, "unknown status: 400");
  report((await setStatus(A._id, priyaToken, "pending")).status === 400, "target 'pending' is not allowed: 400");
  report((await call(`/appointments/${A._id}/status`, { method: "PATCH", token: priyaToken, body: {} })).status === 400, "empty body: 400");
  report((await call(`/appointments/${A._id}/status`, { method: "PATCH", token: priyaToken, body: { status: { $ne: "x" } } })).status === 400, "object status: 400");
  report((await setStatus("abc", priyaToken, "confirmed")).status === 400, "malformed ID: 400");

  // Valid transitions
  let r = await setStatus(A._id, priyaToken, "confirmed");
  report(r.status === 200 && r.json.status === "confirmed", "pending to confirmed: 200");
  report(r.json.patient && Object.keys(r.json.patient).sort().join() === "_id,name", "response shows patient _id and name only");
  report(!("holdsSlot" in r.json) && !("__v" in r.json), "response hides holdsSlot and __v");

  r = await setStatus(B._id, priyaToken, "cancelled");
  report(r.status === 200 && r.json.status === "cancelled" && r.json.cancelledBy === "doctor", "pending to cancelled (decline): cancelledBy doctor");
  report((await Appointment.findById(B._id)).holdsSlot === false, "database: declined appointment frees its slot");
  report((await book(slot(9, 30)))?._id !== undefined, "a declined slot can be booked again");

  // Illegal transitions
  report((await setStatus(B._id, priyaToken, "confirmed")).status === 409, "cancelled to confirmed: 409");
  report((await setStatus(A._id, priyaToken, "confirmed")).status === 409, "confirmed to confirmed: 409");
  report((await setStatus(C._id, priyaToken, "completed")).status === 409, "pending to completed: 409");

  // Completing a future appointment is refused
  r = await setStatus(A._id, priyaToken, "completed");
  report(r.status === 409 && /after its start time/.test(r.json.error), "completing a future appointment: 409");

  // Completing a past confirmed appointment (inserted directly, since booking the past is blocked)
  const past = await Appointment.create({
    patient: demo._id, doctor: priya._id, doctorName: "Dr. Priya Nair", specialty: "general-practice",
    consultationFee: 70, startTime: new Date("2020-01-06T15:00:00.000Z"),
    endTime: new Date("2020-01-06T15:30:00.000Z"), status: "confirmed", reason: TAG,
  });
  r = await setStatus(past._id, priyaToken, "completed");
  report(r.status === 200 && r.json.status === "completed", "confirmed past appointment to completed: 200");
  report((await setStatus(past._id, priyaToken, "cancelled")).status === 409, "completed is final: 409");

  // Confirmed can be cancelled by the doctor
  r = await setStatus(A._id, priyaToken, "cancelled");
  report(r.status === 200 && r.json.cancelledBy === "doctor", "confirmed to cancelled: 200");
} catch (error) {
  failures++;
  console.error("Test crashed:", error.name, error.message);
} finally {
  try {
    const removed = await Appointment.deleteMany({ reason: TAG });
    console.log(`Cleanup: removed ${removed.deletedCount} test appointment(s)`);
  } catch (error) {
    failures++;
    console.error("Cleanup failed:", error.name);
  }
  await disconnectDB();
}
console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;