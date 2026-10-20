import { useEffect, useState } from "react";
import { Container, Alert, Spinner } from "react-bootstrap";
import { api } from "./services/api.js";

export default function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/health", { auth: false, signal: controller.signal })
      .then(setHealth)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, []);

  return (
    <Container className="py-5">
      <h1>Hospital Booking System</h1>
      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
      {!health && !error && <Spinner animation="border" role="status" />}
      {health && (
        <Alert variant="success" className="mt-3">
          API status: {health.status}, database: {health.database}
        </Alert>
      )}
    </Container>
  );
}