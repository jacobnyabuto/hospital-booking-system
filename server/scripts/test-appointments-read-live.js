import "dotenv/config";
import mongoose from "mongoose";
import { DateTime } from "luxon";
import { connectDB, disconnectDB } from "../src/config/db.js";
import Appointment from "../src/models/Appointment.js";
import User from "../src/models/User.js";

const BASE = process.env.TEST_API_URL || "http://localhost:5000/api";
const TZ = "America/Chicago";
const TAG = "Read-test fake reason";
let failures = 0;
function report(pass, label) {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
}

async function call(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BASE}${path}`, { headers });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}
async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return (await res.json()).token;
}

let tempUser;
try {
  await connectDB();

  const demo = await User.findOne({ email: "demo.patient@hospital-demo.test" }).select("_id");
  tempUser = await User.create({
    name: "Temp Other Patient",
    email: "temp-other@hospital-demo.test",
    passwordHash: "fake-hash-never-used-for-login",
    role: "patient",
    insurerName: "Secret Insurer",
  });

  const patientToken = await login("demo.patient@hospital-demo.test", process.env.SEED_PATIENT_PASSWORD);
  const priyaToken = await login("priya.nair@hospital-demo.test", process.env.SEED_DOCTOR_PASSWORD);
  const bellToken = await login("marcus.bell@hospital-demo.test", process.env.SEED_DOCTOR_PASSWORD);
  report(!!patientToken && !!priyaToken && !!bellToken, "three logins return tokens");

  const doctors = (await call("/doctors")).json;
  const priya = doctors.find((d) => d.fullName === "Dr. Priya Nair");
  const bell = doctors.find((d) => d.fullName === "Dr. Marcus Bell");

  // Direct inserts (the booking rules are tested elsewhere). Far-ahead times avoid real bookings.
  const day = DateTime.now().setZone(TZ).plus({ days: 40 }).startOf("day");
  const t = (h, m = 0) => day.set({ hour: h, minute: m }).toUTC().toJSDate();
  const make = (patient, doctor, name, start, extra = {}) => Appointment.create({
    patient, doctor: doctor._id, doctorName: name, specialty: "cardiology", consultationFee: 50,
    startTime: start, endTime: new Date(start.getTime() + 30 * 60 * 1000), reason: `${TAG} ${extra.tag || ""}`.trim(),
    ...extra.fields,
  });
  const a1 = await make(demo._id, priya, "Dr. Priya Nair", t(11), { tag: "A1" });
  const a2 = await make(demo._id, priya, "Dr. Priya Nair", t(11, 30), { tag: "A2", fields: { status: "cancelled", cancelledBy: "patient" } });
  const a3 = await make(tempUser._id, priya, "Dr. Priya Nair", t(12), { tag: "A3" });
  const a4 = await make(tempUser._id, bell, "Dr. Marcus Bell", t(13), { tag: "A4" });
  const ids = (list) => list.map((x) => x._id);
  const has = (list, doc) => ids(list).includes(String(doc._id));

  // ---------- Patient list ----------
  report((await call("/appointments/mine")).status === 401, "mine without token: 401");
  report((await call("/appointments/mine", priyaToken)).status === 403, "mine with a doctor token: 403");

  let r = await call("/appointments/mine", patientToken);
  report(r.status === 200 && Array.isArray(r.json), "patient mine: 200 and an array");
  report(has(r.json, a1) && has(r.json, a2), "patient sees their own appointments");
  report(!has(r.json, a3) && !has(r.json, a4), "patient does NOT see another patient's appointments");
  report(
    r.json.every((x) => !("holdsSlot" in x) && !("__v" in x) && !("patient" in x)),
    "patient items hide holdsSlot, __v and the patient field"
  );
  report(ids(r.json).indexOf(String(a2._id)) < ids(r.json).indexOf(String(a1._id)), "newest first (11:30 before 11:00)");

  r = await call("/appointments/mine?status=cancelled", patientToken);
  report(r.status === 200 && r.json.length >= 1 && r.json.every((x) => x.status === "cancelled") && has(r.json, a2) && !has(r.json, a1), "status filter returns only cancelled");
  report((await call("/appointments/mine?status=bogus", patientToken)).status === 400, "unknown status: 400");
    // Operator injection must never widen the result: either rejected (400) or ignored (200 with the normal list)
  const inj = await call("/appointments/mine?status[$ne]=cancelled", patientToken);
  report(
    inj.status === 400 ||
      (inj.status === 200 && inj.json.every((x) => x.patient === undefined) && inj.json.length === (await call("/appointments/mine", patientToken)).json.length),
    "status operator injection is rejected or ignored, never applied"
  );
  const inj2 = await call("/appointments/mine?status=pending&status=confirmed", patientToken);
  report(inj2.status === 400 || inj2.status === 200, "repeated status parameter does not crash the server");

  // ---------- Doctor list ----------
  report((await call("/appointments/doctor/mine")).status === 401, "doctor/mine without token: 401");
  report((await call("/appointments/doctor/mine", patientToken)).status === 403, "doctor/mine with a patient token: 403");

  r = await call("/appointments/doctor/mine", priyaToken);
  report(r.status === 200 && Array.isArray(r.json), "doctor mine: 200 and an array");
  report(has(r.json, a1) && has(r.json, a2) && has(r.json, a3), "Priya sees her three appointments");
  report(!has(r.json, a4), "Priya does NOT see Dr. Bell's appointment");
  const seenA3 = r.json.find((x) => x._id === String(a3._id));
  report(seenA3?.patient?.name === "Temp Other Patient", "doctor sees the patient's name");
  report(Object.keys(seenA3.patient).sort().join() === "_id,name", "patient object has only _id and name");
  const raw = JSON.stringify(r.json);
  report(!raw.includes("temp-other@") && !raw.includes("Secret Insurer"), "no patient email or insurer anywhere in the response");
  report(r.json.every((x) => !("holdsSlot" in x) && !("__v" in x)), "doctor items hide holdsSlot and __v");
  report(ids(r.json).indexOf(String(a1._id)) < ids(r.json).indexOf(String(a3._id)), "soonest first (11:00 before 12:00)");

  r = await call("/appointments/doctor/mine?status=cancelled", priyaToken);
  report(r.status === 200 && r.json.every((x) => x.status === "cancelled") && has(r.json, a2), "doctor status filter works");

  r = await call("/appointments/doctor/mine", bellToken);
  report(has(r.json, a4) && !has(r.json, a1), "Dr. Bell sees only his own appointment");
} catch (error) {
  failures++;
  console.error("Test crashed:", error.name, error.message);
} finally {
  try {
    const removed = await Appointment.deleteMany({ reason: { $regex: `^${TAG}` } });
    console.log(`Cleanup: removed ${removed.deletedCount} test appointment(s)`);
    if (tempUser) await User.deleteOne({ _id: tempUser._id });
  } catch (error) {
    failures++;
    console.error("Cleanup failed:", error.name);
  }
  await disconnectDB();
}
console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;