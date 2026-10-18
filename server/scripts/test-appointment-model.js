import "dotenv/config";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../src/config/db.js";
import Appointment from "../src/models/Appointment.js";

// Random fake IDs: this script never touches real doctors, patients or appointments
const doctorId = new mongoose.Types.ObjectId();
const patientId = new mongoose.Types.ObjectId();

const slot = new Date("2030-01-07T15:00:00.000Z");
const slotEnd = new Date("2030-01-07T15:30:00.000Z");
const nextSlot = new Date("2030-01-07T15:30:00.000Z");
const nextSlotEnd = new Date("2030-01-07T16:00:00.000Z");

const base = {
  patient: patientId,
  doctor: doctorId,
  doctorName: "Dr. Test Doctor",
  specialty: "cardiology",
  consultationFee: 100,
  startTime: slot,
  endTime: slotEnd,
  reason: "Fake reason for model test",
};

function report(pass, label) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
}

async function check(label, data, expectedField) {
  const doc = new Appointment(data);
  let errors = null;
  try {
    await doc.validate();
  } catch (error) {
    errors = error.errors;
  }
  const failedOn = errors ? Object.keys(errors) : [];
  report(
    expectedField ? failedOn.includes(expectedField) : failedOn.length === 0,
    label
  );
  return doc;
}

async function expectDuplicate(label, data) {
  try {
    await Appointment.create(data);
    report(false, label + " (insert unexpectedly succeeded)");
  } catch (error) {
    report(error.code === 11000, label);
  }
}

try {
  await connectDB();
  await Appointment.init(); // creates the collection and its indexes

  // ---- Indexes ----
  const indexes = await Appointment.collection.indexes();
  const byName = (name) => indexes.find((i) => i.name === name);
  const slotIndex = byName("unique_active_slot");
  report(
    !!slotIndex &&
      slotIndex.unique === true &&
      slotIndex.partialFilterExpression &&
      slotIndex.partialFilterExpression.holdsSlot === true,
    "partial unique index unique_active_slot exists"
  );
  report(!!byName("patient_1_startTime_-1"), "patient + startTime index exists");
  report(!!byName("doctor_1_startTime_1"), "doctor + startTime index exists");

  // ---- Validation (nothing saved) ----
  const valid = await check("valid appointment passes", base, null);
  report(valid.status === "pending", "status defaults to pending");
  report(valid.holdsSlot === true, "holdsSlot is true for pending");
  const json = valid.toJSON();
  report(!("holdsSlot" in json) && !("__v" in json), "toJSON hides holdsSlot and __v");

  const cancelled = new Appointment({ ...base, status: "cancelled" });
  await cancelled.validate();
  report(cancelled.holdsSlot === false, "holdsSlot becomes false when cancelled");

  const forced = new Appointment({ ...base, status: "confirmed", holdsSlot: false });
  await forced.validate();
  report(forced.holdsSlot === true, "client cannot force holdsSlot to disagree with status");

  await check("missing patient rejected", { ...base, patient: undefined }, "patient");
  await check("missing doctor rejected", { ...base, doctor: undefined }, "doctor");
  await check("missing startTime rejected", { ...base, startTime: undefined }, "startTime");
  await check("end before start rejected", { ...base, endTime: new Date("2030-01-07T14:00:00.000Z") }, "endTime");
  await check("bad status rejected", { ...base, status: "done" }, "status");
  await check("unknown specialty rejected", { ...base, specialty: "magic" }, "specialty");
  await check("negative fee rejected", { ...base, consultationFee: -1 }, "consultationFee");
  await check("empty reason rejected", { ...base, reason: "   " }, "reason");
  await check("301-char reason rejected", { ...base, reason: "x".repeat(301) }, "reason");
  await check("bad cancelledBy rejected", { ...base, cancelledBy: "admin" }, "cancelledBy");

  // ---- Slot conflict behavior (writes to the database, cleaned up afterwards) ----
  const first = await Appointment.create(base);
  report(!!first._id, "first booking of the slot succeeds");

  await expectDuplicate("second active booking of the same slot is rejected (11000)", base);

  try {
    await Appointment.create({ ...base, startTime: nextSlot, endTime: nextSlotEnd });
    report(true, "a different slot for the same doctor succeeds");
  } catch {
    report(false, "a different slot for the same doctor succeeds");
  }

  first.status = "cancelled";
  first.cancelledBy = "patient";
  await first.save();
  report(first.holdsSlot === false, "cancelling frees the slot (holdsSlot false in database)");

  try {
    await Appointment.create(base);
    report(true, "cancelled slot can be booked again");
  } catch {
    report(false, "cancelled slot can be booked again");
  }

  await expectDuplicate("rebooked slot is protected again (11000)", base);
} catch (error) {
  console.error("Test crashed:", error.name, error.message);
  process.exitCode = 1;
} finally {
  // Remove only the documents this script created
  try {
    const result = await Appointment.deleteMany({ doctor: doctorId });
    console.log(`Cleanup: removed ${result.deletedCount} test appointments`);
  } catch (error) {
    console.error("Cleanup failed:", error.name);
    process.exitCode = 1;
  }
  await disconnectDB();
}