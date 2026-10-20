export const CLINIC_TIMEZONE = "America/Chicago";

// "2026-10-26" for the given instant, as seen at the clinic
export function clinicDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// Adds whole days to a YYYY-MM-DD string (done in UTC, so no daylight-saving surprises)
export function addDaysToDateString(dateString, days) {
  const [y, m, d] = dateString.split("-").map(Number);
  const result = new Date(Date.UTC(y, m - 1, d + days));
  return result.toISOString().slice(0, 10);
}

// "9:00 AM" in clinic time
export function formatClinicTime(iso) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE, hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}

// "Mon, Oct 26, 2026, 9:00 AM" in clinic time
export function formatClinicDateTime(iso) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE, weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}