import express from "express";
import helmet from "helmet";
import { getDbStatus } from "./config/db.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import doctorRoutes from "./routes/doctor.routes.js";
import authRoutes from "./routes/auth.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";


const app = express();

// 1. Security headers on every response
app.use(helmet());

// 2. Parse JSON bodies, and reject very large ones
app.use(express.json({ limit: "10kb" }));

// 3. Routes
app.get("/api/health", (req, res) => {
  const database = getDbStatus();
  const healthy = database === "connected";

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
app.use("/api/appointments", appointmentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);

// 4. Not found: runs only if no route above answered
app.use(notFound);

// 5. Central error handler: always last
app.use(errorHandler);

export default app;