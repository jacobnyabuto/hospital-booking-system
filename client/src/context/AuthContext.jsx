import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { setUnauthorizedHandler } from "../services/api.js";
import {
  registerUser, loginUser, logoutUser, hasStoredToken, fetchCurrentUser,
} from "../services/authService.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(hasStoredToken()); // only wait if there is a token to check
  const [sessionExpired, setSessionExpired] = useState(false);

  // Restore the session on page load
  useEffect(() => {
    if (!hasStoredToken()) return;
    const controller = new AbortController();
    fetchCurrentUser({ signal: controller.signal })
      .then((u) => setUser(u))
      .catch((e) => {
        if (e.name === "AbortError") return;
        // 401 already cleared the token inside api.js. Other errors: stay logged out.
        setUser(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  // Any 401 on an authenticated request means the token is no longer valid
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setSessionExpired(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const u = await loginUser(credentials);
    setSessionExpired(false);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (details) => {
    const u = await registerUser(details);
    setSessionExpired(false);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
    setSessionExpired(false);
  }, []);

  const value = useMemo(
    () => ({ user, loading, sessionExpired, login, register, logout }),
    [user, loading, sessionExpired, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}