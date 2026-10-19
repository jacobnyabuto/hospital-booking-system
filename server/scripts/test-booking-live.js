import "dotenv/config";
import mongoose from "mongoose";
import { DateTime } from "luxon";
import { connectDB, disconnectDB } from "../src/config/db.js";
import Appointment from "../src/models/Appointment.js";
import User from "../src/models/User.js";

const BASE = process.env.TEST_API_URL || "http://localhost:5000/api";
const TZ = "America/Chicago";
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

let patientId;
try {
  await connectDB();
  const patient = await User.findOne({ email: "demo.patient@hospital-demo.test" }).select("_id");
  patientId = patient._id;

  const patientToken = await login("demo.patient@hospital-demo.test", process.env.SEED_PATIENT_PASSWORD);
  const doctorToken = await login("priya.nair@hospital-demo.test", process.env.SEED_DOCTOR_PASSWORD);
  report(!!patientToken && !!doctorToken, "both logins return tokens");

  const list = await call("/doctors");
  const priya = list.json.find((d) => d.fullName === "Dr. Priya Nair");
  const bell = list.json.find((d) => d.fullName === "Dr. Marcus Bell");

  // A Monday about 3 weeks ahead: Priya (Mon-Sat 08-16) and Bell (Tue-Sat) differ on Mondays
  let monday = DateTime.now().setZone(TZ).plus({ days: 21 }).startOf("day");
  while (monday.weekday !== 1) monday = monday.plus({ days: 1 });
  const slot = (h, m = 0) => monday.set({ hour: h, minute: m }).toUTC().toISO();

  const good = { doctorId: priya._id, startTime: slot(9), reason: "Fake live-test reason" };

  report((await call("/appointments", { method: "POST", body: good })).status === 401, "no token: 401");
  report((await call("/appointments", { method: "POST", token: doctorToken, body: good })).status === 403, "doctor token: 403");

  let r = await call("/appointments", {
    method: "POST", token: patientToken,
    body: { ...good, patient: "665f1c2a9b1e8a0012a1b999", status: "confirmed", endTime: slot(20) },
  });
  report(r.status === 201 && r.json.status === "pending", "patient books: 201 and pending");
  report(String(r.json?.patient) === String(patientId), "patient ID comes from the token, not the body");
  report(r.json && !("holdsSlot" in r.json) && !("__v" in r.json), "response hides holdsSlot and __v");

  r = await call("/appointments", { method: "POST", token: patientToken, body: good });
  report(r.status === 409, "same slot again: 409");

  r = await call("/appointments", { method: "POST", token: patientToken, body: { ...good, doctorId: bell._id } });
  report(r.status === 400 || r.status === 409, "second doctor at same time is refused (400 or 409)");

  r = await call("/appointments", { method: "POST", token: patientToken, body: { ...good, startTime: slot(9, 15) } });
  report(r.status === 400, "off-boundary time: 400");
  r = await call("/appointments", { method: "POST", token: patientToken, body: { ...good, startTime: "2020-01-06T15:00:00.000Z" } });
  report(r.status === 400, "past time: 400");
  r = await call("/appointments", { method: "POST", token: patientToken, body: { ...good, doctorId: "abc" } });
  report(r.status === 400, "bad doctorId: 400");
  r = await call("/appointments", { method: "POST", token: patientToken, body: { ...good, doctorId: "000000000000000000000000", startTime: slot(10) } });
  report(r.status === 404, "unknown doctor: 404");
  r = await call("/appointments", { method: "POST", token: patientToken, body: {} });
  report(r.status === 400, "empty body: 400");
} catch (error) {
  failures++;
  console.error("Test crashed:", error.name, error.message);
} finally {
  try {
    if (patientId) {
      const removed = await Appointment.deleteMany({ patient: patientId, reason: "Fake live-test reason" });
      console.log(`Cleanup: removed ${removed.deletedCount} test appointment(s)`);
    }
  } catch (error) {
    failures++;
    console.error("Cleanup failed:", error.name);
  }
  await disconnectDB();
}
console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;