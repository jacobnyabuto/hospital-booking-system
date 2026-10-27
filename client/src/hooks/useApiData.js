import { useCallback, useEffect, useRef, useState } from "react";

// fetcher(signal) returns a promise. key identifies the request: when it changes, a new request starts.
export default function useApiData(fetcher, key, { enabled = true } = {}) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ requestKey: null, data: null, error: null });
  const fetcherRef = useRef(fetcher);
  const requestKey = `${key}#${attempt}`;

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    fetcherRef.current(controller.signal)
      .then((data) => setResult({ requestKey, data, error: null }))
      .catch((error) => {
        if (error.name === "AbortError") return; // replaced by a newer request
        setResult({ requestKey, data: null, error });
      });
    return () => controller.abort();
  }, [requestKey, enabled]);

  const setData = useCallback((updater) => {
    setResult((r) => ({ ...r, data: typeof updater === "function" ? updater(r.data) : updater }));
  }, []);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const current = result.requestKey === requestKey;
  return {
    data: current ? result.data : null,
    loading: enabled && !current,
    error: current && result.error ? result.error.message : "",
    errorStatus: current && result.error ? result.error.status : null,
    setData,
    reload,
  };
}