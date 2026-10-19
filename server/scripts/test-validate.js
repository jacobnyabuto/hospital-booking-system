import ApiError from "../src/utils/ApiError.js";
import {
  pick, isValidObjectId, requireString, optionalString,
  requireObjectId, escapeRegex, throwIfErrors,
} from "../src/utils/validate.js";
import validateObjectId from "../src/middleware/validateObjectId.js";

let failures = 0;
function report(pass, label) {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
}

// pick: role must be dropped
const picked = pick({ name: "A", role: "doctor", __proto__: { evil: 1 } }, ["name", "email"]);
report(picked.name === "A" && !("role" in picked) && !("evil" in picked), "pick keeps only allowed keys");
report(Object.keys(pick(null, ["a"])).length === 0, "pick handles null body");

// ObjectId
report(isValidObjectId("665f1c2a9b1e8a0012a1b001"), "valid ObjectId accepted");
report(!isValidObjectId("123"), "short ID rejected");
report(!isValidObjectId("zzzzzzzzzzzzzzzzzzzzzzzz"), "non-hex ID rejected");
report(!isValidObjectId({ $ne: "x" }), "object instead of ID rejected");

// requireString
let errors = [];
report(requireString("  Maya  ", "name", errors, { min: 2, max: 80 }) === "Maya" && errors.length === 0, "string trimmed");
errors = [];
requireString(undefined, "name", errors);
report(errors.length === 1 && errors[0].message === "name is required", "missing string reported");
errors = [];
requireString({ $ne: "x" }, "search", errors);
report(errors.length === 1, "object rejected as string (operator injection)");
errors = [];
requireString(["a"], "search", errors);
report(errors.length === 1, "array rejected as string");
errors = [];
requireString("x".repeat(301), "reason", errors, { max: 300 });
report(errors.length === 1, "too-long string reported");
errors = [];
requireString("a", "name", errors, { min: 2 });
report(errors[0]?.message === "name must be at least 2 characters", "too-short message");
errors = [];
requireString("   ", "reason", errors);
report(errors.length === 1, "whitespace-only rejected");

// optionalString
errors = [];
report(optionalString(undefined, "bio", errors) === undefined && errors.length === 0, "optional missing is fine");
report(optionalString("", "bio", errors) === undefined && errors.length === 0, "optional empty is fine");
optionalString({ a: 1 }, "bio", errors);
report(errors.length === 1, "optional present but wrong type reported");

// requireObjectId
errors = [];
requireObjectId("bad", "doctorId", errors);
report(errors.length === 1 && errors[0].field === "doctorId", "bad doctorId reported");

// throwIfErrors
let thrown = null;
try { throwIfErrors([{ field: "email", message: "Email is required" }]); } catch (e) { thrown = e; }
report(thrown instanceof ApiError && thrown.status === 400 && thrown.details.length === 1, "throwIfErrors throws 400 ApiError with details");
let notThrown = true;
try { throwIfErrors([]); } catch { notThrown = false; }
report(notThrown, "throwIfErrors does nothing when empty");

// escapeRegex
report(escapeRegex("a.b*c") === "a\\.b\\*c", "regex symbols escaped");
const re = new RegExp(escapeRegex(".*"), "i");
report(!re.test("anything") && re.test("x.*y"), "escaped input matches literally");

// middleware
let result = "unset";
validateObjectId("id")({ params: { id: "bad" } }, {}, (arg) => { result = arg; });
report(result instanceof ApiError && result.status === 400, "middleware rejects bad ID with 400");
result = "unset";
validateObjectId("id")({ params: { id: "665f1c2a9b1e8a0012a1b001" } }, {}, (arg) => { result = arg; });
report(result === undefined, "middleware passes valid ID");

console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;