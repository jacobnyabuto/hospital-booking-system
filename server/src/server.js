import "dotenv/config";
import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";

// Last-resort safety net: log briefly, then exit so the host restarts a clean process
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason?.name || "unknown");
  process.exit(1);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error?.name || "unknown");
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
  } catch (error) {
    // Print the error type and message only. The URI is never in them.
    console.error("Database connection failed:", error.name);
    console.error(error.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down...`);

    // Safety net: force exit if cleanup hangs
    setTimeout(() => process.exit(1), 10000).unref();

    server.close(async () => {
      await disconnectDB();
      console.log("Shutdown complete");
      process.exit(0);
    });
  }

  process.on("SIGINT", () => shutdown("SIGINT")); // Ctrl + C
  process.on("SIGTERM", () => shutdown("SIGTERM")); // host stopping the app
}

start();