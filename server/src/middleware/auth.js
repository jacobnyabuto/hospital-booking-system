import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { verifyToken } from "../utils/token.js";
import { isValidObjectId } from "../utils/validate.js";

const UNAUTHORIZED = "Authentication required. Please log in.";

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    throw new ApiError(401, UNAUTHORIZED);
  }

  const token = header.slice(7).trim();
  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    // Expired, tampered, malformed: all look the same to the client
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError" || error.name === "NotBeforeError") {
      throw new ApiError(401, UNAUTHORIZED);
    }
    throw error; // e.g. a missing JWT_SECRET is a real server fault
  }

  if (!isValidObjectId(payload.sub)) throw new ApiError(401, UNAUTHORIZED);

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, UNAUTHORIZED); // account deleted after token was issued

  req.user = user; // role comes from the database, not the token
  next();
});

// Usage: router.get("/x", authenticate, requireRole("doctor"), controller)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission to do that"));
    }
    next();
  };
}