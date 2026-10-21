import ApiError from "../src/utils/ApiError.js";
import {
  cleanMessage, isEmergency, fallbackSpecialty, EMERGENCY_MESSAGE, MAX_MESSAGE_LENGTH,
} from "../src/services/aiSafety.js";

let failures = 0;
function report(pass, label) {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
}
function rejects(value) {
  try {
    cleanMessage(value);
    return false;
  } catch (e) {
    return e instanceof ApiError && e.status === 400 && e.details?.[0]?.field === "message";
  }
}

// ---- cleanMessage ----
report(cleanMessage("  hello   world \n\t there ") === "hello world there", "whitespace collapsed and trimmed");
report(cleanMessage("a\u0000b") === "a b", "control characters become spaces");
report(cleanMessage("x".repeat(MAX_MESSAGE_LENGTH)).length === 500, "exactly 500 characters accepted");
report(cleanMessage("caf\u00e9 \u4e2d\u6587") === "caf\u00e9 \u4e2d\u6587", "unicode text preserved");
report(rejects("x".repeat(501)), "501 characters rejected");
report(rejects(""), "empty string rejected");
report(rejects("   \n\t  "), "whitespace-only rejected");
report(rejects(undefined), "missing message rejected");
report(rejects({ $ne: "x" }), "object rejected");
report(rejects(["a"]), "array rejected");
report(rejects(12345), "number rejected");
report(rejects(null), "null rejected");
report(cleanMessage("a" + " ".repeat(600) + "b") === "a b", "length is measured after cleaning, not before");
report(rejects("a ".repeat(300)), "599 characters after cleaning is rejected");

// ---- isEmergency: must trigger ----
const urgent = [
  "I have chest pain",
  "I CAN'T BREATHE!!!",
  "I can\u2019t breathe",
  "having trouble breathing since morning",
  "I am short of breath",
  "I think my dad is having a stroke",
  "his face is drooping",
  "her smile is drooping on one side",
  "facial droop since this morning",
  "I took an overdose",
  "I am thinking about suicide",
  "I want to kill myself",
  "I want to die",
  "I keep wanting to hurt myself",
  "bleeding won't stop",
  "heavy bleeding after the accident",
  "she is unconscious",
  "he had a seizure",
  "my throat is swelling after eating nuts",
  "possible heart attack?",
];
for (const text of urgent) report(isEmergency(text), `emergency: "${text}"`);

// ---- isEmergency: must NOT trigger ----
const calm = [
  "itchy rash on my arm for a week",
  "I need a yearly checkup",
  "my knee hurts when I climb stairs",
  "keystroke injury in my wrist",
  "I want a dermatologist near Dallas",
];
for (const text of calm) report(!isEmergency(text), `not an emergency: "${text}"`);

// ---- fallbackSpecialty ----
report(fallbackSpecialty("itchy rash on my arm") === "dermatology", "rash maps to dermatology");
report(fallbackSpecialty("my knee hurts") === "orthopedics", "knee maps to orthopedics");
report(fallbackSpecialty("bad migraine headache") === "neurology", "migraine headache maps to neurology");
report(fallbackSpecialty("I am pregnant and need advice") === "gynecology", "pregnant maps to gynecology");
report(fallbackSpecialty("I feel anxious and stressed") === "psychiatry", "anxious and stressed maps to psychiatry");
report(fallbackSpecialty("I need a general checkup") === "general-practice", "checkup maps to general practice");
report(fallbackSpecialty("my baby has a fever") === "pediatrics", "a tie goes to the earlier specialty (pediatrics)");
report(fallbackSpecialty("heartburn after dinner") === null, "'heartburn' does not match 'heart'");
report(fallbackSpecialty("tell me a joke") === null, "unrelated text gives null");
report(fallbackSpecialty("RASH!!!") === "dermatology", "case and punctuation ignored");

// ---- constants ----
report(EMERGENCY_MESSAGE.includes("911") && EMERGENCY_MESSAGE.includes("988"), "emergency message names 911 and 988");

console.log(failures === 0 ? "\nAll checks passed" : `\n${failures} check(s) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;