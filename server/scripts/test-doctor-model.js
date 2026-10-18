import "dotenv/config";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../src/config/db.js";
import Doctor from "../src/models/Doctor.js";

const good = {
  user: new mongoose.Types.ObjectId(),
  fullName: "  Dr. Priya Nair ",
  specialty: "general-practice",
  location: "Fort Worth, TX",
};

// expectedField = field that should fail, or null if validation should pass
async function check(label, data, expectedField) {
  const doc = new Doctor(data);
  let errors = null;
  try {
    await doc.validate();
  } catch (error) {
    errors = error.errors;
  }
  const failedOn = errors ? Object.keys(errors) : [];
  const pass = expectedField
    ? failedOn.includes(expectedField)
    : failedOn.length === 0;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
  return doc;
}

try {
  await connectDB();

  await Doctor.init(); // creates the collection and its indexes
  const indexes = await Doctor.collection.indexes();
  const has = (keys, unique) =>
    indexes.some(
      (i) =>
        JSON.stringify(i.key) === JSON.stringify(keys) &&
        (unique ? i.unique === true : true)
    );
  console.log(has({ user: 1 }, true) ? "PASS  unique user index" : "FAIL  unique user index");
  console.log(has({ isActive: 1, specialty: 1 }) ? "PASS  isActive+specialty index" : "FAIL  isActive+specialty index");
  console.log(has({ fullName: 1 }) ? "PASS  fullName index" : "FAIL  fullName index");

  const valid = await check("valid doctor passes", good, null);
  console.log(valid.fullName === "Dr. Priya Nair" ? "PASS  fullName trimmed" : "FAIL  fullName trim");
  console.log(
    JSON.stringify(Array.from(valid.workingDays)) === "[1,2,3,4,5]" &&
      valid.workStart === "09:00" &&
      valid.workEnd === "17:00" &&
      valid.slotMinutes === 30 &&
      valid.isActive === true
      ? "PASS  defaults applied"
      : "FAIL  defaults"
  );
  const json = valid.toJSON();
  console.log(
    !("user" in json) && !("__v" in json)
      ? "PASS  toJSON hides user and __v"
      : "FAIL  toJSON leaks fields"
  );

  await check("missing user rejected", { ...good, user: undefined }, "user");
  await check("unknown specialty rejected", { ...good, specialty: "magic" }, "specialty");
  await check("negative fee rejected", { ...good, consultationFee: -5 }, "consultationFee");
  await check("rating 5.1 rejected", { ...good, rating: 5.1 }, "rating");
  await check("fractional ratingCount rejected", { ...good, ratingCount: 1.5 }, "ratingCount");
  await check("working day 7 rejected", { ...good, workingDays: [1, 7] }, "workingDays");
  await check("empty working days rejected", { ...good, workingDays: [] }, "workingDays");
  await check("duplicate working days rejected", { ...good, workingDays: [1, 1] }, "workingDays");
  await check("bad time format rejected", { ...good, workStart: "9:00" }, "workStart");
  await check("minutes other than 00/30 rejected", { ...good, workEnd: "17:10" }, "workEnd");
  await check("end before start rejected", { ...good, workStart: "09:00", workEnd: "08:30" }, "workEnd");
  await check("end equal to start rejected", { ...good, workStart: "09:00", workEnd: "09:00" }, "workEnd");
  await check("15-minute slots rejected", { ...good, slotMinutes: 15 }, "slotMinutes");
  await check("601-char bio rejected", { ...good, bio: "x".repeat(601) }, "bio");
} catch (error) {
  console.error("Test crashed:", error.name, error.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}