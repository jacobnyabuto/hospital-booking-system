import mongoose from "mongoose";

const uri = process.env.CHECK_URI;
if (!uri) {
  console.error("Set CHECK_URI in this PowerShell window first.");
  process.exit(1);
}

let failures = 0;
function report(pass, label) {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const client = mongoose.connection.getClient();
  report(mongoose.connection.name === "hospital_booking_prod", "connected to hospital_booking_prod");

  // Ask MongoDB which roles this login really holds (no secrets in this output)
  const status = await client.db("admin").command({ connectionStatus: 1 });
  const roles = (status.authInfo?.authenticatedUserRoles || []).map((r) => `${r.role}@${r.db}`);
  console.log("      roles held by this login:", roles.join(", ") || "(none)");
  report(roles.length === 1 && roles[0] === "readWrite@hospital_booking_prod", "holds only readWrite on hospital_booking_prod");

  const probe = client.db("hospital_booking_prod").collection("_probe");
  const inserted = await probe.insertOne({ checkedAt: new Date() });
  report(!!inserted.insertedId, "can write to hospital_booking_prod");
  await probe.deleteMany({});

  // Try to read the development database with the plain driver
  let blocked = false;
  try {
    await client.db("hospital_booking").collection("users").findOne({}, { maxTimeMS: 5000 });
    console.log("      development read: ALLOWED");
  } catch (error) {
    const message = String(error.message || "");
    blocked = error.code === 13 || error.code === 8000 || /not allowed to do action|not authorized|unauthorized/i.test(message);
    console.log(`      development read refused: ${message.slice(0, 110)}`);
  }
  report(blocked, "cannot read the development database (least privilege)");
} catch (error) {
  failures++;
  const detail = error.name === "MongoServerError" ? String(error.message).slice(0, 120) : "";
  console.error("Check failed:", error.name, error.codeName || "", error.code || "", detail);
} finally {
  await mongoose.disconnect();
}

console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
