import { spawnSync } from "node:child_process";

const UNIT = [
  "test-user-model.js",
  "test-doctor-model.js",
  "test-appointment-model.js",
  "test-validate.js",
  "test-slots.js",
  "test-ownership.js",
  "test-appointment-service.js",
];

// These call the running API. Each one logs in, so the server must be fresh (limiter reset).
const LIVE = [
  "test-auth-live.js",
  "test-booking-live.js",
  "test-appointments-read-live.js",
  "test-appointment-get-live.js",
  "test-appointment-change-live.js",
  "test-appointment-status-live.js",
];

const group = process.argv[2];
if (!["unit", "live"].includes(group)) {
  console.error("Usage: node scripts/run-all-tests.js unit|live");
  process.exit(2);
}
const files = group === "unit" ? UNIT : LIVE;

const results = [];
for (const file of files) {
  console.log(`\n=== ${file} ===`);
  const run = spawnSync(process.execPath, [`scripts/${file}`], { stdio: "inherit" });
  results.push({ file, ok: run.status === 0 });
}

console.log("\n==================== SUMMARY ====================");
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.file}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed === 0 ? `\nAll ${results.length} ${group} test files passed` : `\n${failed} of ${results.length} test files FAILED`);
process.exitCode = failed === 0 ? 0 : 1;5