// Wraps an async controller so a thrown error or rejected promise reaches the error handler
export default function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}