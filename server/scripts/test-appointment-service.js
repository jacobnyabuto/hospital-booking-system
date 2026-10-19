import "dotenv/config";
import mongoose from "mongoose";
import { DateTime } from "luxon";
import { connectDB, disconnectDB } from "../src/config/db.js";
import Appointment from "../src/models/Appointment.js";
import Doctor from "../src/models/Doctor.js";
import ApiError from "../src/utils/ApiError.js";
import {
  parseStartTime, checkSlotRules, createAppointment, MAX_ACTIVE_APPOINTMENTS,
} from "../src/services/appointmentService.js";

const TZ = "America/Chicago";
let failures = 0;
function report(pass, label) {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
}
const oid = () => new mongoose.Types.ObjectId();

async function expectError(label, promise, status, textPart) {
  try {
    await promise;
    report(false, `${label} (nothing was thrown)`);
  } catch (error) {
    const ok = error instanceof ApiError && error.status === status &&
      (!textPart || JSON.stringify([error.message, error.details]).includes(textPart));
    report(ok, label);
    if (!ok) console.log("      got:", error.name, error.status, error.message);
  }
}

// ---------- Pure checks (no database) ----------
const now = new Date("2030-01-01T00:00:00.000Z");
const weekday = { workingDays: [1, 2, 3, 4, 5], workStart: "09:00", workEnd: "17:00", slotMinutes: 30 };
const everyDay = { ...weekday, workingDays: [0, 1, 2, 3, 4, 5, 6] };

report(parseStartTime("2030-01-07T15:00:00.000Z") instanceof Date, "parse accepts Z time");
report(parseStartTime("2030-01-07T09:00:00-06:00")?.toISOString() === "2030-01-07T15:00:00.000Z", "parse accepts an offset and converts to UTC");
report(parseStartTime("2030-01-07T09:00:00") === null, "parse rejects a time with no timezone");
report(parseStartTime("2030-02-30T10:00:00Z") === null, "parse rejects Feb 30");
report(parseStartTime("tomorrow") === null, "parse rejects text");
report(parseStartTime({ $ne: "x" }) === null && parseStartTime(undefined) === null, "parse rejects objects and undefined");

const at = (iso) => checkSlotRules(weekday, new Date(iso), TZ, now);
report(at("2030-01-07T15:00:00.000Z") === null, "Monday 09:00 Chicago is accepted");
report(at("2030-01-07T22:30:00.000Z") === null, "last slot (16:30) is accepted");
report(at("2030-01-07T23:00:00.000Z") !== null, "closing time (17:00) is rejected");
report(at("2030-01-07T14:30:00.000Z") !== null, "08:30 before opening is rejected");
report(at("2030-01-07T15:15:00.000Z") !== null, "09:15 off the boundary is rejected");
report(at("2030-01-07T15:00:30.000Z") !== null, "09:00:30 (seconds off) is rejected");
report(at("2030-01-06T15:00:00.000Z") !== null, "Sunday is rejected for a weekday doctor");
report(
  checkSlotRules(weekday, parseStartTime("2030-01-07T09:00:00-06:00"), TZ, now) === null,
  "an offset string for the same instant is accepted"
);
report(
  checkSlotRules(weekday, new Date("2030-01-07T15:00:00.000Z"), TZ, new Date("2030-01-07T15:00:00.000Z")) !== null,
  "a slot starting exactly now is rejected"
);
report(
  checkSlotRules(weekday, new Date("2030-01-07T15:00:00.000Z"), TZ, new Date("2030-01-08T00:00:00.000Z")) !== null,
  "a past slot is rejected"
);
report(checkSlotRules(everyDay, new Date("2030-03-29T14:00:00.000Z"), TZ, now) === null, "88 days ahead is accepted");
report(checkSlotRules(everyDay, new Date("2030-04-02T14:00:00.000Z"), TZ, now) !== null, "91 days ahead is rejected");

// ---------- Database checks (temporary doctors, cleaned up afterwards) ----------
const day = DateTime.now().setZone(TZ).plus({ days: 3 }).startOf("day");
const slot = (hour, minute = 0) => day.set({ hour, minute }).toUTC().toISO();
const mkDoctor = (name, isActive = true) => Doctor.create({
  user: oid(), fullName: name, specialty: "cardiology", location: "Test City",
  consultationFee: 55, workingDays: [0, 1, 2, 3, 4, 5, 6], workStart: "09:00", workEnd: "17:00", isActive,
});

const created = { doctors: [], patients: [] };
try {
  await connectDB();

  const docA = await mkDoctor("Dr. Test Alpha");
  const docB = await mkDoctor("Dr. Test Beta");
  const docOff = await mkDoctor("Dr. Test Inactive", false);
  created.doctors.push(docA._id, docB._id, docOff._id);

  const patient1 = { _id: oid(), role: "patient" };
  const patient2 = { _id: oid(), role: "patient" };
  const patient3 = { _id: oid(), role: "patient" };
  created.patients.push(patient1._id, patient2._id, patient3._id);

  // Happy path, with attempts to smuggle in server-controlled fields
  const appt = await createAppointment({
    user: patient1,
    body: {
      doctorId: String(docA._id), startTime: slot(10), reason: "  Fake checkup reason  ",
      patient: String(oid()), status: "confirmed", consultationFee: 1, endTime: slot(23), doctorName: "Hacker",
    },
  });
  report(String(appt.patient) === String(patient1._id), "patient comes from the user, not the body");
  report(appt.status === "pending", "status is pending even if the body says confirmed");
  report(appt.consultationFee === 55 && appt.doctorName === "Dr. Test Alpha", "fee and name are snapshotted from the doctor");
  report(appt.endTime.getTime() - appt.startTime.getTime() === 30 * 60 * 1000, "endTime is startTime plus 30 minutes");
  report(appt.reason === "Fake checkup reason", "reason is trimmed");
  report(appt.holdsSlot === true && !("holdsSlot" in appt.toJSON()), "holdsSlot is set but hidden from JSON");

  // Conflicts
  await expectError("same slot, different patient: 409", createAppointment({ user: patient2, body: { doctorId: String(docA._id), startTime: slot(10), reason: "x" } }), 409, "already booked");
  await expectError("same patient, different doctor, same time: 409", createAppointment({ user: patient1, body: { doctorId: String(docB._id), startTime: slot(10), reason: "x" } }), 409, "already have an appointment");

  // Not found
  await expectError("inactive doctor: 404", createAppointment({ user: patient2, body: { doctorId: String(docOff._id), startTime: slot(11), reason: "x" } }), 404);
  await expectError("unknown doctor: 404", createAppointment({ user: patient2, body: { doctorId: String(oid()), startTime: slot(11), reason: "x" } }), 404);

  // Validation
  await expectError("bad doctorId: 400", createAppointment({ user: patient2, body: { doctorId: "abc", startTime: slot(11), reason: "x" } }), 400, "doctorId");
  await expectError("missing reason: 400", createAppointment({ user: patient2, body: { doctorId: String(docA._id), startTime: slot(11) } }), 400, "reason");
  await expectError("301-char reason: 400", createAppointment({ user: patient2, body: { doctorId: String(docA._id), startTime: slot(11), reason: "x".repeat(301) } }), 400, "at most 300");
  await expectError("object as doctorId: 400", createAppointment({ user: patient2, body: { doctorId: { $ne: "x" }, startTime: slot(11), reason: "x" } }), 400, "doctorId");
  await expectError("no timezone in startTime: 400", createAppointment({ user: patient2, body: { doctorId: String(docA._id), startTime: "2030-01-07T09:00:00", reason: "x" } }), 400, "startTime");
  await expectError("off-boundary time: 400", createAppointment({ user: patient2, body: { doctorId: String(docA._id), startTime: slot(11, 15), reason: "x" } }), 400, "available time slots");
  await expectError("past time: 400", createAppointment({ user: patient2, body: { doctorId: String(docA._id), startTime: "2020-01-06T15:00:00.000Z", reason: "x" } }), 400, "future");
  await expectError("empty body: 400", createAppointment({ user: patient2, body: {} }), 400);
  await expectError("missing body: 400", createAppointment({ user: patient2, body: undefined }), 400);

  // Race: two patients, same slot, same instant. Exactly one must win.
  const race = await Promise.allSettled([
    createAppointment({ user: patient2, body: { doctorId: String(docB._id), startTime: slot(12), reason: "race 1" } }),
    createAppointment({ user: patient3, body: { doctorId: String(docB._id), startTime: slot(12), reason: "race 2" } }),
  ]);
  const wins = race.filter((r) => r.status === "fulfilled").length;
  const losses = race.filter((r) => r.status === "rejected" && r.reason instanceof ApiError && r.reason.status === 409).length;
  report(wins === 1 && losses === 1, "simultaneous bookings of one slot: one wins, one gets 409");

  // Cancelled slot can be booked again
  appt.status = "cancelled";
  appt.cancelledBy = "patient";
  await appt.save();
  const again = await createAppointment({ user: patient2, body: { doctorId: String(docA._id), startTime: slot(10), reason: "after cancel" } });
  report(!!again._id, "a cancelled slot can be booked by someone else");

  // Cap: patient3 already holds one (the race may have given it to patient2 or patient3)
  const capPatient = { _id: oid(), role: "patient" };
  created.patients.push(capPatient._id);
  for (let i = 0; i < MAX_ACTIVE_APPOINTMENTS; i++) {
       await createAppointment({ user: capPatient, body: { doctorId: String(docA._id), startTime: slot(11 + Math.floor(i / 2), (i % 2) * 30), reason: `cap ${i}` } });
  }
  report(true, `patient reached ${MAX_ACTIVE_APPOINTMENTS} active appointments`);
  await expectError("11th active appointment: 409", createAppointment({ user: capPatient, body: { doctorId: String(docB._id), startTime: slot(9), reason: "one too many" } }), 409, "at most");
} catch (error) {
  failures++;
  console.error("Test crashed:", error.name, error.message);
} finally {
  try {
    const a = await Appointment.deleteMany({ doctor: { $in: created.doctors } });
    const d = await Doctor.deleteMany({ _id: { $in: created.doctors } });
    console.log(`Cleanup: removed ${a.deletedCount} test appointments and ${d.deletedCount} test doctors`);
  } catch (error) {
    failures++;
    console.error("Cleanup failed:", error.name);
  }
  await disconnectDB();
}

console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;