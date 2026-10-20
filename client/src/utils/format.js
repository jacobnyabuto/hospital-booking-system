const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// [1,2,3,4,5] -> "Monday to Friday"; [1,3,4,5] -> "Monday, Wednesday, Thursday, Friday"
export function formatWorkingDays(days) {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 0) return "No working days";
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (consecutive && sorted.length > 2) {
    return `${DAY_NAMES[sorted[0]]} to ${DAY_NAMES[sorted[sorted.length - 1]]}`;
  }
  return sorted.map((d) => DAY_NAMES[d]).join(", ");
}

// "16:00" -> "4:00 PM"
export function formatClock(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}