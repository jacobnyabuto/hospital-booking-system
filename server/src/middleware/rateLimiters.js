import rateLimit from "express-rate-limit";

// Public read routes: generous, just stops runaway scripts
export const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});