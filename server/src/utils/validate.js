import mongoose from "mongoose";
import ApiError from "./ApiError.js";

// Copy only the allowed keys from an object (blocks mass assignment)
export function pick(source, allowedKeys) {
  const result = {};
  if (!source || typeof source !== "object") return result;
  for (const key of allowedKeys) {
    if (Object.hasOwn(source, key)) result[key] = source[key];
  }
  return result;
}

export function isValidObjectId(value) {
  return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);
}

// Throws the approved 400 shape: { error: "Validation failed", details: [...] }
export function failValidation(details) {
  throw new ApiError(400, "Validation failed", details);
}

// Returns a trimmed string, or records a problem and returns undefined.
// Rejects arrays and objects, which blocks query-operator injection.
export function requireString(value, field, errors, { min = 1, max = 300, label } = {}) {
  const name = label || field;
  if (typeof value !== "string") {
    errors.push({ field, message: `${name} is required` });
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    errors.push({
      field,
      message: min <= 1 ? `${name} is required` : `${name} must be at least ${min} characters`,
    });
    return undefined;
  }
  if (trimmed.length > max) {
    errors.push({ field, message: `${name} must be at most ${max} characters` });
    return undefined;
  }
  return trimmed;
}

// Like requireString, but a missing value is fine (returns undefined, no error)
export function optionalString(value, field, errors, options = {}) {
  if (value === undefined || value === "") return undefined;
  return requireString(value, field, errors, options);
}

export function requireObjectId(value, field, errors) {
  if (!isValidObjectId(value)) {
    errors.push({ field, message: `${field} is not a valid ID` });
    return undefined;
  }
  return value;
}

// Escape characters that have special meaning in a regular expression
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Throw once, after all checks have run, if any problems were collected
export function throwIfErrors(errors) {
  if (errors.length > 0) failValidation(errors);
}

// Convenience for tests and controllers that need a typed ObjectId
export function toObjectId(value) {
  return new mongoose.Types.ObjectId(value);
}