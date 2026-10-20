export function homeForRole(role) {
  return role === "doctor" ? "/doctor/dashboard" : "/dashboard";
}