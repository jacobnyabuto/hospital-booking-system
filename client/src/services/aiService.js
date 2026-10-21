import { api } from "./api.js";

export function recommendDoctors(message, options = {}) {
  return api.post("/ai/recommend-doctor", { message }, options);
}