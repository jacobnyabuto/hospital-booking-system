// Must match SPECIALTIES in server/src/models/Doctor.js
export const SPECIALTIES = [
  { value: "general-practice", label: "General Practice" },
  { value: "cardiology", label: "Cardiology" },
  { value: "dermatology", label: "Dermatology" },
  { value: "pediatrics", label: "Pediatrics" },
  { value: "orthopedics", label: "Orthopedics" },
  { value: "neurology", label: "Neurology" },
  { value: "gynecology", label: "Gynecology" },
  { value: "psychiatry", label: "Psychiatry" },
];

export function specialtyLabel(value) {
  const found = SPECIALTIES.find((s) => s.value === value);
  return found ? found.label : value;
}