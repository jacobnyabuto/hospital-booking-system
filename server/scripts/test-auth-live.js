import "dotenv/config";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const BASE = process.env.TEST_API_URL || "http://localhost:5000/api";
const SECRET = process.env.JWT_SECRET;
const GENERIC = "Authentication required. Please log in.";

let failures = 0;
function report(pass, label) {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
}

async function call(path, { method = "GET", token, body, scheme = "Bearer" } = {}) {
  const headers = {};
  if (token) headers.Authorization = `${scheme} ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

async function expectGeneric401(label, token, scheme) {
  const r = await call("/auth/me", { token, scheme });
  report(r.status === 401 && r.json?.error === GENERIC, label);
}

async function login(email, password) {
  return call("/auth/login", { method: "POST", body: { email, password } });
}

try {
  if (!SECRET || SECRET.length < 32) throw new Error("JWT_SECRET missing or short in .env");
  const patientPw = process.env.SEED_PATIENT_PASSWORD;
  if (!patientPw) throw new Error("SEED_PATIENT_PASSWORD missing in .env");

  // ---- Real login ----
  const pLogin = await login("demo.patient@hospital-demo.test", patientPw);
  report(pLogin.status === 200 && !!pLogin.json?.token, "patient login returns a token");
  const token = pLogin.json.token;
  const userId = pLogin.json.user._id;

  const me = await call("/auth/me", { token });
  report(me.status === 200 && me.json.role === "patient", "valid token gives 200 and role patient");
  report(me.json && !("passwordHash" in me.json), "/me never returns passwordHash");

  // ---- Bad tokens: all must be the same generic 401 ----
  await expectGeneric401("no token", undefined);
  await expectGeneric401("wrong scheme (Token instead of Bearer)", token, "Token");
  await expectGeneric401("garbage token", "not.a.token");

  const expired = jwt.sign({ role: "patient" }, SECRET, { subject: userId, expiresIn: -10 });
  await expectGeneric401("expired token", expired);

  const wrongSecret = jwt.sign({ role: "patient" }, "x".repeat(40), { subject: userId, expiresIn: "1h" });
  await expectGeneric401("token signed with a different secret", wrongSecret);

  const noneToken = `${b64({ alg: "none", typ: "JWT" })}.${b64({
    sub: userId, role: "doctor", exp: Math.floor(Date.now() / 1000) + 3600,
  })}.`;
  await expectGeneric401("alg:none forged token", noneToken);

  const ghost = jwt.sign({ role: "patient" }, SECRET, {
    subject: new mongoose.Types.ObjectId().toString(), expiresIn: "1h",
  });
  await expectGeneric401("valid signature but user does not exist", ghost);

  const badSub = jwt.sign({ role: "patient" }, SECRET, { subject: "not-an-object-id", expiresIn: "1h" });
  await expectGeneric401("valid signature but subject is not an ObjectId", badSub);

  const noSub = jwt.sign({ role: "patient" }, SECRET, { expiresIn: "1h" });
  await expectGeneric401("valid signature but no subject", noSub);

  // ---- Role comes from the database, not the token ----
  const forgedRole = jwt.sign({ role: "doctor" }, SECRET, { subject: userId, expiresIn: "1h" });
  const forged = await call("/auth/me", { token: forgedRole });
  report(forged.status === 200 && forged.json.role === "patient", "token claiming doctor still gets patient role from the database");

  // ---- PATCH /me validation (changes nothing) ----
  let r = await call("/auth/me", { method: "PATCH", token, body: {} });
  report(r.status === 400, "PATCH with empty body is 400");
  r = await call("/auth/me", { method: "PATCH", token, body: { name: "A" } });
  report(r.status === 400, "PATCH with 1-letter name is 400");
  r = await call("/auth/me", { method: "PATCH", token, body: { name: { $ne: "x" } } });
  report(r.status === 400, "PATCH with object name is 400");
  r = await call("/auth/me", { method: "PATCH", token, body: { insurerName: "x".repeat(81) } });
  report(r.status === 400, "PATCH with 81-char insurer is 400");
  r = await call("/auth/me", { method: "PATCH", token });
  report(r.status === 400 || r.status === 200 ? r.status === 400 : false, "PATCH with no body at all is 400");

  const unauthPatch = await call("/auth/me", { method: "PATCH", body: { name: "Hacker" } });
  report(unauthPatch.status === 401, "PATCH without token is 401");

  // ---- Login failures are indistinguishable ----
  const wrongPw = await login("demo.patient@hospital-demo.test", "definitely-wrong-pw");
  const noUser = await login("nobody@hospital-demo.test", "definitely-wrong-pw");
  report(
    wrongPw.status === 401 && noUser.status === 401 &&
      JSON.stringify(wrongPw.json) === JSON.stringify(noUser.json),
    "wrong password and unknown email give identical 401 bodies"
  );
  const upper = await login("DEMO.Patient@Hospital-Demo.test", patientPw);
  report(upper.status === 200, "login email is case-insensitive");

  // ---- Doctor login (needs SEED_DOCTOR_PASSWORD) ----
  if (process.env.SEED_DOCTOR_PASSWORD) {
    const d = await login("priya.nair@hospital-demo.test", process.env.SEED_DOCTOR_PASSWORD);
    report(d.status === 200 && d.json?.user?.role === "doctor", "seeded doctor logs in with role doctor");
  } else {
    console.log("SKIP  doctor login (SEED_DOCTOR_PASSWORD not set)");
  }

  // ---- Optional rate-limit test: uses up the limiter, so restart the server afterwards ----
  if (process.argv.includes("--rate-limit")) {
    let hit429 = false;
    for (let i = 0; i < 12 && !hit429; i++) {
      const x = await login("nobody@hospital-demo.test", "definitely-wrong-pw");
      if (x.status === 429) hit429 = true;
    }
    report(hit429, "repeated logins eventually return 429");
    console.log("Restart the server now to reset the limiter.");
  }
} catch (error) {
  failures++;
  console.error("Test crashed:", error.name, error.message);
  if (error.cause) console.error("Is the server running on port 5000?");
} finally {
  console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}