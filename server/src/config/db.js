import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing. Check server/.env");
  }

  // Fail after 8 seconds instead of hanging for 30
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

  // Safe message: database name only, never the URI
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

// Used by the health route: "connected", "connecting", "disconnected", ...
export function getDbStatus() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] || "unknown";
}