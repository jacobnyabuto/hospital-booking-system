import { api } from "./api.js";

// filters: { specialty, search, location } (empty values are skipped)
export function listDoctors(filters = {}, options = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) params.set(key, text);
  }
  const query = params.toString();
  return api.get(`/doctors${query ? `?${query}` : ""}`, { auth: false, ...options });
}

export function getDoctor(id, options = {}) {
  return api.get(`/doctors/${encodeURIComponent(id)}`, { auth: false, ...options });
}

export function getDoctorSlots(id, date, options = {}) {
  return api.get(`/doctors/${encodeURIComponent(id)}/slots?date=${encodeURIComponent(date)}`, {
    auth: false,
    ...options,
  });
}