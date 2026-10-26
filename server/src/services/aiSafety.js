import { failValidation } from "../utils/validate.js";

export const MAX_MESSAGE_LENGTH = 500;

export const EMERGENCY_MESSAGE =
  "Your description may indicate an emergency. Call 911 (or your local emergency number) now. " +
  "If you are thinking about harming yourself, call or text 988 in the US.";

// Returns the cleaned message, or throws the approved 400 shape.
export function cleanMessage(value) {
  if (typeof value !== "string") {
    failValidation([{ field: "message", message: "message is required" }]);
  }
  const text = value
    .replace(/[\u0000-\u001F\u007F]/g, " ") // control characters (including newlines and tabs)
    .replace(/\s+/g, " ")
    .trim();

  if (text.length === 0) {
    failValidation([{ field: "message", message: "message is required" }]);
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    failValidation([{ field: "message", message: `message must be at most ${MAX_MESSAGE_LENGTH} characters` }]);
  }
  return text;
}

// "I CAN'T breathe!!!" -> "i cant breathe"
function normalize(text) {
  return text.toLowerCase().replace(/['\u2019`]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

const EMERGENCY_PATTERNS = [
  /\bchest (pain|pains|tightness|pressure)\b/,
  /\bpressure in (my |the )?chest\b/,
  /\bheart attack\b/,
  /\b(cant|cannot|can not|unable to) breathe\b/,
  /\b(trouble|difficulty|hard to|struggling to|struggling with) breath(e|ing)\b/,
  /\bshort(ness)? of breath\b/,
  /\bstroke\b/,
  /\b(face|smile|mouth)\b.{0,20}\bdroop/,
  /\bdroop(y|ing)?\b.{0,20}\b(face|smile|mouth)\b/,
  /\bfacial droop/,
  /\bslurred speech\b/,
  /\bsudden (numbness|weakness|confusion)\b/,
  /\boverdos(e|ed|ing)\b/,
  /\bsuicid(e|al)\b/,
  /\bkill (myself|my self)\b/,
  /\bend (my|my own) life\b/,
  /\b(want|wanna) to die\b/,
  /\bself harm\b/,
  /\b(hurt|harm|cut) myself\b/,
  /\b(severe|heavy) bleeding\b/,
  /\bbleeding (wont|will not) stop\b/,
  /\bcoughing (up )?blood\b/,
  /\bunconscious\b/,
  /\bpassed out\b/,
  /\bseizure\b/,
  /\bchoking\b/,
  /\banaphyla/,
  /\bthroat (is )?swelling\b/,
];

export function isEmergency(text) {
  const normalized = normalize(text);
  return EMERGENCY_PATTERNS.some((pattern) => pattern.test(normalized));
}

// Order matters: on a tie, the earlier specialty wins
const FALLBACK_KEYWORDS = [
  ["dermatology", ["rash", "skin", "itch", "itchy", "acne", "eczema", "mole", "hives"]],
  ["cardiology", ["heart", "palpitations", "blood pressure", "cholesterol"]],
  ["pediatrics", ["child", "children", "baby", "infant", "toddler", "kid", "kids", "my son", "my daughter"]],
  ["orthopedics", ["bone", "joint", "knee", "back pain", "shoulder", "fracture", "sprain", "hip", "ankle"]],
  ["neurology", ["headache", "migraine", "dizzy", "tingling", "memory", "nerve"]],
  ["gynecology", ["period", "pregnant", "pregnancy", "menstrual", "pelvic"]],
  ["psychiatry", ["anxiety", "anxious", "depressed", "depression", "stress", "stressed", "panic", "insomnia", "mood"]],
  ["general-practice", ["fever", "cold", "flu", "cough", "sore throat", "checkup", "check up", "fatigue", "tired"]],
];

// Returns a specialty value, or null when nothing matches
export function fallbackSpecialty(text) {
  const padded = ` ${normalize(text)} `;
  let best = null;
  let bestScore = 0;
  for (const [specialty, keywords] of FALLBACK_KEYWORDS) {
    const score = keywords.filter((k) => padded.includes(` ${k} `)).length;
    if (score > bestScore) {
      best = specialty;
      bestScore = score;
    }
  }
  return best;
}

// Removes obvious personal identifiers before text is sent to the AI provider.
// Names and street addresses cannot be detected reliably and are NOT removed.
export function redactPersonalInfo(text) {
  return text
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email removed]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, (match) =>
      match.replace(/\D/g, "").length >= 9 ? "[number removed]" : match
    );
}