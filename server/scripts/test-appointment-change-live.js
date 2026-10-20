import "dotenv/config";
import jwt from "jsonwebtoken";
import { DateTime } from "luxon";
import { connectDB, disconnectDB } from "../src/config/db.js";
import Appointment from "../src/models/Appointment.js";
import User from "../src/models/User.js";

const BASE = process.env.TEST_API_URL || "http://localhost:5000/api";
const TZ = "America/Chicago";
const TAG = "Change-test fake reason";
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

let tempUser;
try {
  await connectDB();
  tempUser = await User.create({
    name: "Temp Other Patient", email: "temp-change@hospital-demo.test",
    passwordHash: "fake-hash-never-used-for-login", role: "patient",
  });
  // This account can't log in (fake hash), so we sign a token for it
  const tempToken = jwt.sign({ role: "patient" }, process.env.JWT_SECRET, {
    subject: String(tempUser._id), expiresIn: "1h",
  });

  const patientToken = await login("demo.patient@hospital-demo.test", process.env.SEED_PATIENT_PASSWORD);
  const doctorToken = await login("priya.nair@hospital-demo.test", process.env.SEED_DOCTOR_PASSWORD);
  report(!!patientToken && !!doctorToken, "both logins return tokens");

  const priya = (await call("/doctors")).json.find((d) => d.fullName === "Dr. Priya Nair");

  // A Monday about 6 weeks ahead (Priya works Monday 08:00 to 16:00)
  let monday = DateTime.now().setZone(TZ).plus({ days: 45 }).startOf("day");
  while (monday.weekday !== 1) monday = monday.plus({ days: 1 });
  const slot = (h, m = 0) => monday.set({ hour: h, minute: m }).toUTC().toISO();
  const book = (token, start) => call("/appointments", {
    method: "POST", token, body: { doctorId: priya._id, startTime: start, reason: TAG },
  });
  const patch = (id, token, body) => call(`/appointments/${id}`, { method: "PATCH", token, body });
  const del = (id, token) => call(`/appointments/${id}`, { method: "DELETE", token });

  // ---------- Setup ----------
  const A = (await book(patientToken, slot(9))).json;
  report(!!A?._id && A.status === "pending", "setup: patient books A at 09:00");

  // ---------- Authentication and role ----------
  report((await patch(A._id, undefined, { startTime: slot(9, 30) })).status === 401, "PATCH without token: 401");
  report((await del(A._id)).status === 401, "DELETE without token: 401");
  report((await patch(A._id, doctorToken, { startTime: slot(9, 30) })).status === 403, "PATCH with a doctor token: 403");
  report((await del(A._id, doctorToken)).status === 403, "DELETE with a doctor token: 403");

  // ---------- Reschedule ----------
  let r = await patch(A._id, patientToken, { startTime: slot(9, 30) });
  report(r.status === 200 && r.json.startTime === slot(9, 30), "reschedule to 09:30: 200");
  report(
    new Date(r.json.endTime) - new Date(r.json.startTime) === 30 * 60 * 1000,
    "endTime moves with startTime (30 minutes)"
  );
  report(r.json && !("patient" in r.json) && !("holdsSlot" in r.json) && !("__v" in r.json), "response hides patient, holdsSlot, __v");

  const T1 = await book(tempToken, slot(9));
  report(T1.status === 201, "the old 09:00 slot is free for another patient");

  const A2 = (await book(patientToken, slot(10))).json;
  report((await patch(A2._id, patientToken, { startTime: slot(9) })).status === 409, "reschedule onto a booked slot: 409");

  report((await patch(A._id, patientToken, { startTime: slot(9, 45) })).status === 400, "off-boundary time: 400");
  report((await patch(A._id, patientToken, { startTime: "2020-01-06T15:00:00.000Z" })).status === 400, "past time: 400");
  report((await patch(A._id, patientToken, { startTime: "2030-01-07T09:00:00" })).status === 400, "time without timezone: 400");
  report((await patch(A._id, patientToken, {})).status === 400, "empty body: 400");
  report((await patch(A._id, patientToken, { startTime: slot(9, 30) })).status === 400, "same time as now: 400");
  report((await patch(A._id, patientToken, { startTime: { $ne: "x" } })).status === 400, "object as startTime: 400");

  r = await patch(A._id, patientToken, { startTime: slot(11), status: "confirmed", patient: String(tempUser._id) });
  report(r.status === 200 && r.json.status === "pending", "status in the body is ignored");

  await Appointment.updateOne({ _id: A._id }, { status: "confirmed" }); // test setup only
  r = await patch(A._id, patientToken, { startTime: slot(11, 30) });
  report(r.status === 200 && r.json.status === "pending", "rescheduling a confirmed appointment returns it to pending");

  // ---------- Strangers ----------
  const strangerPatch = await patch(A._id, tempToken, { startTime: slot(12) });
  const strangerDel = await del(A._id, tempToken);
  const missingDel = await del("000000000000000000000000", tempToken);
  report(strangerPatch.status === 404, "another patient's PATCH: 404");
  report(strangerDel.status === 404 && JSON.stringify(strangerDel.json) === JSON.stringify(missingDel.json), "another patient's DELETE: same 404 as a missing record");
  report((await Appointment.findById(A._id)).startTime.toISOString() === slot(11, 30), "stranger changed nothing in the database");

  // ---------- Cancel ----------
  r = await del(A2._id, patientToken);
  report(r.status === 200 && r.json.status === "cancelled" && r.json.cancelledBy === "patient", "cancel: 200, cancelled by patient");
  report(r.json && !("patient" in r.json) && !("holdsSlot" in r.json), "cancel response hides patient and holdsSlot");
  report((await Appointment.findById(A2._id)).holdsSlot === false, "database: cancelled appointment no longer holds its slot");
  report((await del(A2._id, patientToken)).status === 409, "cancelling twice: 409");
  report((await patch(A2._id, patientToken, { startTime: slot(13) })).status === 409, "rescheduling a cancelled appointment: 409");
  report((await book(tempToken, slot(10))).status === 201, "the cancelled 10:00 slot can be booked by someone else");

  // ---------- Completed is final ----------
  await Appointment.updateOne({ _id: A._id }, { status: "completed" }); // test setup only
  report((await del(A._id, patientToken)).status === 409, "cancelling a completed appointment: 409");
  report((await patch(A._id, patientToken, { startTime: slot(12) })).status === 409, "rescheduling a completed appointment: 409");

  // ---------- IDs ----------
  report((await patch("abc", patientToken, { startTime: slot(12) })).status === 400, "PATCH with malformed ID: 400");
  report((await del("abc", patientToken)).status === 400, "DELETE with malformed ID: 400");
} catch (error) {
  failures++;
  console.error("Test crashed:", error.name, error.message);
} finally {
  try {
    const removed = await Appointment.deleteMany({ reason: TAG });
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