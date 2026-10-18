import "dotenv/config";
import { connectDB, disconnectDB } from "../src/config/db.js";
import User from "../src/models/User.js";

const good = {
  name: "  Maya Patel ",
  email: "  MAYA.Patel@Hospital-Demo.test ",
  passwordHash: "fake-hash-for-test-only",
};

// expectedField = the field that should fail, or null if it should pass
async function check(label, data, expectedField) {
  const doc = new User(data);
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

  // Creates the empty users collection and its unique email index
  await User.init();
  const indexes = await User.collection.indexes();
  const emailIndex = indexes.find((i) => i.key.email === 1);
  console.log(
    emailIndex && emailIndex.unique
      ? "PASS  unique email index exists"
      : "FAIL  unique email index missing"
  );

  const valid = await check("valid user passes", good, null);
  console.log(
    valid.email === "maya.patel@hospital-demo.test"
      ? "PASS  email trimmed and lowercased"
      : "FAIL  email not normalized"
  );
  console.log(
    valid.role === "patient" ? "PASS  role defaults to patient" : "FAIL  role default"
  );
  const json = valid.toJSON();
  console.log(
    !("passwordHash" in json) && !("__v" in json)
      ? "PASS  toJSON hides passwordHash and __v"
      : "FAIL  toJSON leaks fields"
  );

  await check("missing name rejected", { ...good, name: undefined }, "name");
  await check("one-letter name rejected", { ...good, name: "A" }, "name");
  await check("invalid email rejected", { ...good, email: "not-an-email" }, "email");
  await check("missing password hash rejected", { ...good, passwordHash: undefined }, "passwordHash");
  await check("role admin rejected", { ...good, role: "admin" }, "role");
  await check("81-char insurer rejected", { ...good, insurerName: "x".repeat(81) }, "insurerName");
} catch (error) {
  console.error("Test crashed:", error.name, error.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}