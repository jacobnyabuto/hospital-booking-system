import { api, setToken, clearToken, getToken } from "./api.js";

export async function registerUser({ name, email, password, insurerName }) {
  const body = { name, email, password };
  if (insurerName && insurerName.trim()) body.insurerName = insurerName.trim();
  const { token, user } = await api.post("/auth/register", body, { auth: false });
  setToken(token);
  return user;
}

export async function loginUser({ email, password }) {
  const { token, user } = await api.post("/auth/login", { email, password }, { auth: false });
  setToken(token);
  return user;
}

export function logoutUser() {
  clearToken(); // JWTs are stateless: logging out means forgetting the token
}

export function hasStoredToken() {
  return !!getToken();
}

export function fetchCurrentUser(options = {}) {
  return api.get("/auth/me", options);
}