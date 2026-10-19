// An expected failure with an HTTP status code, for example: throw new ApiError(404, "Doctor not found")
export default class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details; // optional: [{ field, message }]
  }
}