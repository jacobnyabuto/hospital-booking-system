import express from "express";
import helmet from "helmet";

const app = express();

// 1. Security headers on every response
app.use(helmet());

// 2. Parse JSON bodies, and reject very large ones
app.use(express.json({ limit: "10kb" }));

// 3. Routes
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 4. Not found: runs only if no route above answered
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// 5. Central error handler: must have exactly 4 parameters
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Malformed JSON from the client is a 400, not a server fault
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON in request body" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large" });
  }

  // Log a short message for us, but never send details to the user
  console.error("Unhandled error:", err.name, err.message);
  res.status(500).json({ error: "Something went wrong on the server" });
});

export default app;