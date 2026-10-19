import { DateTime } from "luxon";
import Appointment from "../models/Appointment.js";

export function getClinicTimezone() {
  return process.env.CLINIC_TIMEZONE || "America/Chicago";
}

// A real calendar date written as YYYY-MM-DD (rejects 2030-02-30, 2030-1-5, "abc")
export function isValidDateString(value, timezone) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    DateTime.fromISO(value, { zone: timezone }).isValid
  );
}

// Today's date as seen at the clinic, not in UTC
export function todayInClinic(timezone, now = new Date()) {
  return DateTime.fromJSDate(now).setZone(timezone).toISODate();
}

// Pure function: every slot a doctor offers on one clinic-local date.
// Returns [{ start: Date, end: Date }] in UTC-based Dates. No database.
export function buildDaySlots(doctor, dateString, timezone) {
  const day = DateTime.fromISO(dateString, { zone: timezone });
  if (!day.isValid) return [];

  // luxon: Monday=1..Sunday=7. Ours: Sunday=0..Saturday=6.
  if (!doctor.workingDays.includes(day.weekday % 7)) return [];

  const [startHour, startMinute] = doctor.workStart.split(":").map(Number);
  const [endHour, endMinute] = doctor.workEnd.split(":").map(Number);
  const open = day.set({ hour: startHour, minute: startMinute });
  const close = day.set({ hour: endHour, minute: endMinute });
  const step = doctor.slotMinutes || 30;

  const slots = [];
  let cursor = open;
  while (cursor.plus({ minutes: step }) <= close) {
    const next = cursor.plus({ minutes: step });
    slots.push({ start: cursor.toJSDate(), end: next.toJSDate() });
    cursor = next;
  }
  return slots;
}

// Slots for one date, each marked available or not
export async function getSlotsForDate(doctor, dateString, timezone, now = new Date()) {
  const slots = buildDaySlots(doctor, dateString, timezone);
  if (slots.length === 0) return [];

  const dayStart = DateTime.fromISO(dateString, { zone: timezone }).startOf("day");
  const dayEnd = dayStart.plus({ days: 1 });

  // Only appointments that currently occupy a slot (cancelled ones are ignored)
  const taken = await Appointment.find({
    doctor: doctor._id,
    holdsSlot: true,
    startTime: { $gte: dayStart.toJSDate(), $lt: dayEnd.toJSDate() },
  })
    .select("startTime")
    .lean();
  const takenTimes = new Set(taken.map((a) => a.startTime.getTime()));

  return slots.map((slot) => ({
    startTime: slot.start.toISOString(),
    endTime: slot.end.toISOString(),
    available: slot.start > now && !takenTimes.has(slot.start.getTime()),
  }));
}