import rateLimit from "express-rate-limit";

// Public read routes: generous, just stops runaway scripts
export const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Login and register: strict, to slow down password guessing
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit:Number(process.env.AUTH_RATE_LIMIT) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

// AI assistant: per logged-in user (not per IP). Must run after authenticate.
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.AI_RATE_LIMIT) || 10,
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You have used the assistant too many times. Please try again later." },
});