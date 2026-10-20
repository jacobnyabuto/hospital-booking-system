import { api } from "./api.js";

export function bookAppointment({ doctorId, startTime, reason }) {
  return api.post("/appointments", { doctorId, startTime, reason });
}
export function listMyAppointments(options) {
  return api.get("/appointments/mine", options);
}
export function listDoctorAppointments(options) {
  return api.get("/appointments/doctor/mine", options);
}
export function rescheduleAppointment(id, startTime) {
  return api.patch(`/appointments/${encodeURIComponent(id)}`, { startTime });
}
export function cancelAppointment(id) {
  return api.delete(`/appointments/${encodeURIComponent(id)}`);
}
export function setAppointmentStatus(id, status) {
  return api.patch(`/appointments/${encodeURIComponent(id)}/status`, { status });
}