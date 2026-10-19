import { DateTime } from "luxon";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import ApiError from "../utils/ApiError.js";
import {
  pick, requireObjectId, requireString, throwIfErrors, failValidation,
} from "../utils/validate.js";
import { buildDaySlots, getClinicTimezone } from "./slotService.js";

export const MAX_DAYS_AHEAD = 90;
export const MAX_ACTIVE_APPOINTMENTS = 10;

// Full ISO 8601 with an explicit offset: 2026-10-26T13:00:00.000Z or ...-05:00
const ISO_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

// Returns a Date, or null if the value is not a real ISO instant with an offset
export function parseStartTime(value) {
  if (typeof value !== "string" || !ISO_WITH_OFFSET.test(value)) return null;
  const parsed = DateTime.fromISO(value, { setZone: true });
  return parsed.isValid ? parsed.toJSDate() : null;
}

// Pure rule check. Returns an error message, or null if the time is acceptable.
export function checkSlotRules(doctor, startTime, timezone, now = new Date()) {
  if (startTime.getTime() <= now.getTime()) return "startTime must be in the future";

  const latest = now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;
  if (startTime.getTime() > latest) {
    return `startTime cannot be more than ${MAX_DAYS_AHEAD} days ahead`;
  }

  // Which clinic-local calendar day is this instant on?
  const dateString = DateTime.fromJSDate(startTime).setZone(timezone).toISODate();
  const slots = buildDaySlots(doctor, dateString, timezone);
  const isRealSlot = slots.some((s) => s.start.getTime() === startTime.getTime());
  if (!isRealSlot) {
    return "startTime must match one of the doctor's available time slots";
  }
  return null;
}

export async function createAppointment({ user, body, now = new Date() }) {
  // Whitelist: patient, status, endTime, fee and anything else are dropped
  const input = pick(body, ["doctorId", "startTime", "reason"]);

  const errors = [];
  const doctorId = requireObjectId(input.doctorId, "doctorId", errors);
  const reason = requireString(input.reason, "reason", errors, { min: 1, max: 300, label: "Reason" });
  const startTime = parseStartTime(input.startTime);
  if (!startTime) {
    errors.push({
      field: "startTime",
      message: "startTime must be an ISO 8601 date-time with a timezone, e.g. 2026-10-26T13:00:00.000Z",
    });
  }
  throwIfErrors(errors);

  const doctor = await Doctor.findOne({ _id: doctorId, isActive: true })
    .select("fullName specialty consultationFee workingDays workStart workEnd slotMinutes")
    .lean();
  if (!doctor) throw new ApiError(404, "Doctor not found");

  const timezone = getClinicTimezone();
  const problem = checkSlotRules(doctor, startTime, timezone, now);
  if (problem) failValidation([{ field: "startTime", message: problem }]);

  // Friendly conflict messages. The unique index remains the real guard.
  if (await Appointment.exists({ doctor: doctor._id, startTime, holdsSlot: true })) {
    throw new ApiError(409, "That time slot is already booked");
  }
  if (await Appointment.exists({ patient: user._id, startTime, holdsSlot: true })) {
    throw new ApiError(409, "You already have an appointment at that time");
  }
  const activeCount = await Appointment.countDocuments({
    patient: user._id,
    status: { $in: ["pending", "confirmed"] },
    startTime: { $gt: now },
  });
  if (activeCount >= MAX_ACTIVE_APPOINTMENTS) {
    throw new ApiError(409, `You can have at most ${MAX_ACTIVE_APPOINTMENTS} active appointments`);
  }

  try {
    return await Appointment.create({
      patient: user._id, // from the verified token, never the body
      doctor: doctor._id,
      doctorName: doctor.fullName, // snapshots
      specialty: doctor.specialty,
      consultationFee: doctor.consultationFee,
      startTime,
      endTime: new Date(startTime.getTime() + (doctor.slotMinutes || 30) * 60 * 1000),
      reason,
      status: "pending",
    });
  } catch (error) {
    // Two requests raced and the unique index rejected the loser
    if (error.code === 11000) throw new ApiError(409, "That time slot is already booked");
    throw error;
  }
}