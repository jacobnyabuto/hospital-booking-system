import jwt from "jsonwebtoken";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is missing or too short. Check server/.env");
  }
  return secret;
}

// The token holds only the user ID (sub) and role. Never put a password or email in it.
export function signToken(user) {
  return jwt.sign({ role: user.role }, getSecret(), {
    subject: String(user._id),
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    algorithm: "HS256",
  });
}

// Throws if the token is malformed, tampered with, or expired
export function verifyToken(token) {
  return jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
}