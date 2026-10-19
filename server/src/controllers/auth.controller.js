import bcrypt from "bcryptjs";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { signToken } from "../utils/token.js";
import { pick, requireString, optionalString, throwIfErrors } from "../utils/validate.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Passwords are never trimmed. bcrypt only reads the first 72 bytes.
function checkPassword(value, errors) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push({ field: "password", message: "Password is required" });
    return undefined;
  }
  if (value.length < 8) {
    errors.push({ field: "password", message: "Password must be at least 8 characters" });
    return undefined;
  }
  if (Buffer.byteLength(value, "utf8") > 72) {
    errors.push({ field: "password", message: "Password must be at most 72 bytes" });
    return undefined;
  }
  return value;
}

export const register = asyncHandler(async (req, res) => {
  // Whitelist: a "role" sent by the client is dropped here
  const body = pick(req.body, ["name", "email", "password", "insurerName"]);

  const errors = [];
  const name = requireString(body.name, "name", errors, { min: 2, max: 80, label: "Name" });
  const email = requireString(body.email, "email", errors, { max: 254, label: "Email" });
  if (email && !EMAIL_PATTERN.test(email)) {
    errors.push({ field: "email", message: "Email is not valid" });
  }
  const password = checkPassword(body.password, errors);
  const insurerName = optionalString(body.insurerName, "insurerName", errors, {
    max: 80,
    label: "Insurer name",
  });
  throwIfErrors(errors);

  const passwordHash = await bcrypt.hash(password, 10);

  let user;
  try {
    user = await User.create({
      name,
      email, // the model lowercases it
      passwordHash,
      role: "patient", // always. Public registration can never create a doctor.
      insurerName: insurerName ?? "",
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "An account with this email already exists");
    }
    throw error;
  }

  // res.json calls user.toJSON(), which removes passwordHash and __v
  res.status(201).json({ token: signToken(user), user });
});

// Compared against when the email doesn't exist, so both failures take equally long
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password-for-timing", 10);

export const login = asyncHandler(async (req, res) => {
  const body = pick(req.body, ["email", "password"]);

  const errors = [];
  const email = requireString(body.email, "email", errors, { max: 254, label: "Email" });
  if (typeof body.password !== "string" || body.password.length === 0) {
    errors.push({ field: "password", message: "Password is required" });
  } else if (body.password.length > 200) {
    errors.push({ field: "password", message: "Password is too long" });
  }
  throwIfErrors(errors);

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");

  // Always run one bcrypt comparison, whether or not the user exists
  const matches = await bcrypt.compare(body.password, user ? user.passwordHash : DUMMY_HASH);

  if (!user || !matches) {
    throw new ApiError(401, "Invalid email or password");
  }

  res.status(200).json({ token: signToken(user), user });
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(req.user);
});

export const updateMe = asyncHandler(async (req, res) => {
  // Only these two fields can ever change. Email and role are not in the list.
  const body = pick(req.body, ["name", "insurerName"]);

  const errors = [];
  const name = body.name === undefined
    ? undefined
    : requireString(body.name, "name", errors, { min: 2, max: 80, label: "Name" });

  // An empty string is allowed for insurerName: it clears the field
  let insurerName;
  if (body.insurerName !== undefined) {
    if (body.insurerName === "") {
      insurerName = "";
    } else {
      insurerName = requireString(body.insurerName, "insurerName", errors, { max: 80, label: "Insurer name" });
    }
  }

  if (body.name === undefined && body.insurerName === undefined) {
    errors.push({ field: "body", message: "Provide name or insurerName" });
  }
  throwIfErrors(errors);

  if (name !== undefined) req.user.name = name;
  if (insurerName !== undefined) req.user.insurerName = insurerName;
  await req.user.save();

  res.status(200).json(req.user);
});