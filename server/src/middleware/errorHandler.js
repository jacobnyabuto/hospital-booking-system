import ApiError from "../utils/ApiError.js";

export function notFound(req, res) {
  res.status(404).json({ error: "Route not found" });
}

// Must keep exactly 4 parameters, or Express won't treat it as an error handler
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // Errors we threw on purpose
  if (err instanceof ApiError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  // Malformed or oversized JSON body
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON in request body" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large" });
  }

  // Mongoose schema rules failed
  if (err.name === "ValidationError" && err.errors) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({ error: "Validation failed", details });
  }

  // A value could not be converted, such as a malformed ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({ error: `Invalid value for ${err.path}` });
  }

  // MongoDB unique index violated
  if (err.code === 11000) {
    if (err.keyPattern && err.keyPattern.startTime) {
      return res.status(409).json({ error: "That time slot is already booked" });
    }
    return res.status(409).json({ error: "A record with that value already exists" });
  }

  // Anything else is our bug: log briefly, tell the user nothing specific
  console.error("Unhandled error:", err.name, err.message);
  res.status(500).json({ error: "Something went wrong on the server" });
}