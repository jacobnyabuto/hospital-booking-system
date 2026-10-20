const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/+$/, "");
const TOKEN_KEY = "hbs_token";

// ---- token storage (every read and write is guarded: storage can be blocked) ----
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable: the user will simply need to log in again */
  }
}
export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

// ---- unauthorized notification (AuthContext subscribes in Step 24) ----
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// ---- error type ----
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details || [];
  }
}

// Turns [{ field, message }] into { field: message } for forms
export function fieldErrors(error) {
  const result = {};
  if (error instanceof ApiError) {
    for (const d of error.details) {
      if (d.field && !result[d.field]) result[d.field] = d.message;
    }
  }
  return result;
}

// ---- the one request function ----
async function request(path, { method = "GET", body, auth = true, signal } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error; // a cancelled request is not a failure
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
  }

  // The body may be empty or not JSON (for example a gateway error page)
  let data = null;
  try {
    data = await response.json();
  } catch {
    /* no JSON body */
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      clearToken();
      if (onUnauthorized) onUnauthorized();
    }
    const message =
      (data && typeof data.error === "string" && data.error) ||
      (response.status >= 500 ? "Something went wrong on the server. Please try again." : "Request failed.");
    throw new ApiError(response.status, message, data && data.details);
  }

  return data;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};