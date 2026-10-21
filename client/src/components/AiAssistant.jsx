import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Alert, Badge, Button, Card, Form, Spinner } from "react-bootstrap";
import useAuth from "../hooks/useAuth.js";
import { recommendDoctors } from "../services/aiService.js";
import { specialtyLabel } from "../constants/specialties.js";

const MAX_LENGTH = 500;

export default function AiAssistant() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // the API's success body
  const [error, setError] = useState(null); // { status, message }
  const controllerRef = useRef(null);

  // Cancel any request still running when the component disappears
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function submit() {
    const text = message.trim();
    if (!text || loading) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await recommendDoctors(text, { signal: controller.signal });
      if (!controller.signal.aborted) setResult(data);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError({ status: err.status, message: err.message });
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    submit();
  }

  if (authLoading) {
    return <Spinner animation="border" role="status"><span className="visually-hidden">Loading...</span></Spinner>;
  }

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Card.Title as="h2" className="h4">Not sure which doctor to see?</Card.Title>

        {!user ? (
          <>
            <p>Describe your concern and the assistant will suggest doctors from our list.</p>
            <Button as={Link} to="/login" state={{ from: location.pathname }}>Log in to use the assistant</Button>
          </>
        ) : (
          <Form onSubmit={handleSubmit} noValidate>
            <Form.Group controlId="ai-message" className="mb-2">
              <Form.Label>Describe what you need help with</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                maxLength={MAX_LENGTH}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-describedby="ai-help"
                placeholder="e.g. An itchy rash on my arm for a week"
              />
              <Form.Text id="ai-help" muted>
                {message.length}/{MAX_LENGTH}. Demo project: use fictional details only.
              </Form.Text>
            </Form.Group>
            <Button type="submit" disabled={!message.trim() || loading}>
              {loading ? "Finding doctors..." : "Find doctors"}
            </Button>
          </Form>
        )}

        <div aria-live="polite" className="mt-3">
          {loading && <Spinner animation="border" size="sm" role="status"><span className="visually-hidden">Finding doctors...</span></Spinner>}

          {error && (
            <Alert variant={error.status === 429 ? "warning" : error.status === 400 ? "danger" : "secondary"}>
              <p className="mb-2">{error.message}</p>
              {(error.status === 503 || error.status === 0) && (
                <div className="d-flex flex-wrap gap-2">
                  <Button size="sm" variant="outline-secondary" onClick={submit} disabled={loading}>Try again</Button>
                  <Button size="sm" as={Link} to="/doctors" variant="outline-primary">Browse doctors by specialty</Button>
                </div>
              )}
            </Alert>
          )}

          {result?.urgent && (
            <Alert variant="danger" role="alert">
              <Alert.Heading as="h3" className="h5">This may be an emergency</Alert.Heading>
              <p className="mb-0">{result.message}</p>
            </Alert>
          )}

          {result && !result.urgent && (
            <>
              <p className="mb-2">
                {result.summary}{" "}
                {result.source === "fallback" && <Badge bg="secondary">keyword-based</Badge>}
              </p>

              {result.recommendations.length === 0 ? (
                <Button as={Link} to="/doctors" variant="outline-primary" size="sm">Browse all doctors</Button>
              ) : (
                result.recommendations.map((r) => (
                  <Card key={r.doctorId} className="mb-2">
                    <Card.Body className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <div>
                        <div className="fw-bold">{r.doctorName}</div>
                        <div className="text-muted small">{specialtyLabel(r.specialty)}</div>
                        <div>{r.reason}</div>
                      </div>
                      <Button as={Link} to={`/doctors/${r.doctorId}`} size="sm">View profile</Button>
                    </Card.Body>
                  </Card>
                ))
              )}
            </>
          )}
        </div>

        <p className="small text-muted mt-3 mb-0">
          This is not medical advice. Review the doctor's profile before booking. In an emergency, call your local
          emergency number.
        </p>
      </Card.Body>
    </Card>
  );
}