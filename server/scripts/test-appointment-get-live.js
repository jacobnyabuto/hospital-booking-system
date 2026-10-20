import "dotenv/config";
import { DateTime } from "luxon";
import { connectDB, disconnectDB } from "../src/config/db.js";
import Appointment from "../src/models/Appointment.js";
import User from "../src/models/User.js";

const BASE = process.env.TEST_API_URL || "http://localhost:5000/api";
const TZ = "America/Chicago";
const TAG = "Get-test fake reason";
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
    name: "Temp Other Patient", email: "temp-get@hospital-demo.test",
    passwordHash: "fake-hash-never-used-for-login", role: "patient", insurerName: "Secret Insurer",
  });

  const patientToken = await login("demo.patient@hospital-demo.test", process.env.SEED_PATIENT_PASSWORD);
  const priyaToken = await login("priya.nair@hospital-demo.test", process.env.SEED_DOCTOR_PASSWORD);
  const bellToken = await login("marcus.bell@hospital-demo.test", process.env.SEED_DOCTOR_PASSWORD);
  report(!!patientToken && !!priyaToken && !!bellToken, "three logins return tokens");

  const doctors = (await call("/doctors")).json;
  const priya = doctors.find((d) => d.fullName === "Dr. Priya Nair");

  const day = DateTime.now().setZone(TZ).plus({ days: 41 }).startOf("day");
  const t = (h, m = 0) => day.set({ hour: h, minute: m }).toUTC().toJSDate();
  const make = (patient, start, tag) => Appointment.create({
    patient, doctor: priya._id, doctorName: "Dr. Priya Nair", specialty: "general-practice",
    consultationFee: 70, startTime: start, endTime: new Date(start.getTime() + 30 * 60 * 1000),
    reason: `${TAG} ${tag}`,
  });
  const mine = await make(demo._id, t(11), "mine");
  const theirs = await make(tempUser._id, t(12), "theirs");

  report((await call(`/appointments/${mine._id}`)).status === 401, "no token: 401");

  let r = await call(`/appointments/${mine._id}`, patientToken);
  report(r.status === 200 && r.json._id === String(mine._id), "owner patient: 200");
  report(r.json && !("patient" in r.json) && !("holdsSlot" in r.json) && !("__v" in r.json), "patient view hides patient, holdsSlot, __v");

  r = await call(`/appointments/${theirs._id}`, patientToken);
  report(r.status === 404 && r.json.error === "Appointment not found", "another patient's appointment: 404");
  const missing = await call("/appointments/000000000000000000000000", patientToken);
  report(missing.status === 404 && JSON.stringify(missing.json) === JSON.stringify(r.json), "'not yours' and 'does not exist' are identical");

  r = await call(`/appointments/${theirs._id}`, priyaToken);
  report(r.status === 200 && r.json.patient?.name === "Temp Other Patient", "owning doctor: 200 with patient name");
  report(Object.keys(r.json.patient).sort().join() === "_id,name", "doctor sees only patient _id and name");
  const raw = JSON.stringify(r.json);
  report(!raw.includes("temp-get@") && !raw.includes("Secret Insurer"), "no patient email or insurer in doctor view");

  r = await call(`/appointments/${mine._id}`, bellToken);
  report(r.status === 404, "a different doctor: 404");

  report((await call("/appointments/abc", patientToken)).status === 400, "malformed ID: 400");
  report((await call("/appointments/mine", patientToken)).status === 200, "/mine is not swallowed by /:id");
  report((await call("/appointments/doctor/mine", priyaToken)).status === 200, "/doctor/mine is not swallowed by /:id");
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