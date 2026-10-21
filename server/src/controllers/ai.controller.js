import asyncHandler from "../utils/asyncHandler.js";
import { pick } from "../utils/validate.js";
import { recommendDoctor } from "../services/aiService.js";

export const recommend = asyncHandler(async (req, res) => {
  // Only "message" is accepted. Any other field is dropped.
  const { message } = pick(req.body, ["message"]);
  const result = await recommendDoctor({ message });
  res.status(200).json(result);
});