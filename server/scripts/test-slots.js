import "dotenv/config";
import mongoose from "mongoose";
import { DateTime } from "luxon";
import { connectDB, disconnectDB } from "../src/config/db.js";
import Appointment from "../src/models/Appointment.js";
import {
  buildDaySlots, isValidDateString, todayInClinic, getSlotsForDate,
} from "../src/services/slotService.js";

const TZ = "America/Chicago";
let failures = 0;
function report(pass, label) {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
}
const iso = (d) => d.toISOString();

const weekdayDoctor = { workingDays: [1, 2, 3, 4, 5], workStart: "09:00", workEnd: "17:00", slotMinutes: 30 };
const everyDayDoctor = { ...weekdayDoctor, workingDays: [0, 1, 2, 3, 4, 5, 6] };

// ---- Pure slot generation (no database) ----
let slots = buildDaySlots(weekdayDoctor, "2030-01-07", TZ); // a Monday, winter (UTC-6)
report(slots.length === 16, "09:00-17:00 gives 16 slots");
report(iso(slots[0].start) === "2030-01-07T15:00:00.000Z", "09:00 Chicago in January is 15:00Z");
report(iso(slots[15].start) === "2030-01-07T22:30:00.000Z", "last slot starts 16:30 Chicago (22:30Z)");
report(iso(slots[15].end) === "2030-01-07T23:00:00.000Z", "last slot ends at closing time");
report(slots.every((s, i) => i === 0 || s.start.getTime() === slots[i - 1].end.getTime()), "slots touch but never overlap");

report(buildDaySlots(weekdayDoctor, "2030-01-06", TZ).length === 0, "Sunday is empty for a weekday doctor");
report(buildDaySlots(weekdayDoctor, "2030-01-12", TZ).length === 0, "Saturday is empty for a weekday doctor");

slots = buildDaySlots(weekdayDoctor, "2030-07-01", TZ); // Monday, summer (UTC-5)
report(iso(slots[0].start) === "2030-07-01T14:00:00.000Z", "09:00 Chicago in July is 14:00Z");

// Daylight saving starts Sunday 2030-03-10
const before = buildDaySlots(everyDayDoctor, "2030-03-09", TZ);
const after = buildDaySlots(everyDayDoctor, "2030-03-10", TZ);
report(iso(before[0].start) === "2030-03-09T15:00:00.000Z", "day before DST: 09:00 is 15:00Z");
report(iso(after[0].start) === "2030-03-10T14:00:00.000Z", "day of DST change: 09:00 is 14:00Z");
report(before.length === 16 && after.length === 16, "DST change does not alter slot count");

report(
  buildDaySlots({ ...weekdayDoctor, workStart: "09:00", workEnd: "10:30" }, "2030-01-07", TZ).length === 3,
  "09:00-10:30 gives 3 slots"
);
report(
  buildDaySlots({ ...weekdayDoctor, workStart: "08:00", workEnd: "16:00" }, "2030-01-07", TZ).length === 16,
  "08:00-16:00 gives 16 slots"
);

// ---- Date helpers ----
report(isValidDateString("2030-01-07", TZ), "valid date accepted");
report(!isValidDateString("2030-02-30", TZ), "Feb 30 rejected");
report(!isValidDateString("2030-1-5", TZ), "unpadded date rejected");
report(!isValidDateString("abc", TZ), "text rejected");
report(!isValidDateString({ $ne: "x" }, TZ), "object rejected");

// 03:00 UTC on Jan 8 is still the evening of Jan 7 in Chicago
report(todayInClinic(TZ, new Date("2030-01-08T03:00:00.000Z")) === "2030-01-07", "today is calculated in clinic time, not UTC");

// ---- Availability (uses the database with a fake doctor, cleaned up afterwards) ----
const fakeDoctor = { _id: new mongoose.Types.ObjectId(), ...weekdayDoctor };
try {
  await connectDB();

  const base = {
    patient: new mongoose.Types.ObjectId(),
    doctor: fakeDoctor._id,
    doctorName: "Dr. Test Doctor",
    specialty: "cardiology",
    consultationFee: 100,
    reason: "Fake reason for slot test",
  };
  await Appointment.create({
    ...base,
    startTime: new Date("2030-01-07T15:00:00.000Z"),
    endTime: new Date("2030-01-07T15:30:00.000Z"),
  });
  await Appointment.create({
    ...base,
    startTime: new Date("2030-01-07T15:30:00.000Z"),
    endTime: new Date("2030-01-07T16:00:00.000Z"),
    status: "cancelled",
    cancelledBy: "patient",
  });

  const early = new Date("2030-01-01T00:00:00.000Z");
  const result = await getSlotsForDate(fakeDoctor, "2030-01-07", TZ, early);
  report(result.length === 16, "availability list has 16 slots");
  report(result[0].available === false, "booked slot is unavailable");
  report(result[1].available === true, "cancelled slot is available again");
  report(result[2].available === true, "untouched slot is available");
  report(Object.keys(result[0]).sort().join() === "available,endTime,startTime", "slot has exactly startTime, endTime, available");

  // "now" is 10:00 Chicago on the day: earlier slots and the 10:00 slot are not bookable
  const during = await getSlotsForDate(fakeDoctor, "2030-01-07", TZ, new Date("2030-01-07T16:00:00.000Z"));
  report(during[2].available === false, "slot starting exactly now is unavailable");
  report(during[3].available === true, "later slot the same day is available");

  const empty = await getSlotsForDate(fakeDoctor, "2030-01-06", TZ, early);
  report(Array.isArray(empty) && empty.length === 0, "non-working day gives empty array");
} catch (error) {
  failures++;
  console.error("Test crashed:", error.name, error.message);
} finally {
  try {
    const removed = await Appointment.deleteMany({ doctor: fakeDoctor._id });
    console.log(`Cleanup: removed ${removed.deletedCount} test appointments`);
  } catch (error) {
    failures++;
    console.error("Cleanup failed:", error.name);
  }
  await disconnectDB();
}

console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;