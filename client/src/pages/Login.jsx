import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import useAuth from "../hooks/useAuth.js";
import { fieldErrors } from "../services/api.js";
import { homeForRole } from "../utils/roles.js";

export default function Login() {
  const { user, loading, sessionExpired, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Spinner animation="border" role="status" />;
  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    const problems = {};
    if (!email.trim()) problems.email = "Email is required";
    if (!password) problems.password = "Password is required";
    setErrors(problems);
    setFormError("");
    if (Object.keys(problems).length) return;

    setSubmitting(true);
    try {
      const u = await login({ email: email.trim(), password });
      const from = location.state?.from;
      navigate(from || homeForRole(u.role), { replace: true });
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      if (Object.keys(fields).length === 0) setFormError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Row className="justify-content-center">
      <Col md={6} lg={5}>
        <Card className="shadow-sm">
          <Card.Body>
            <h1 className="h3 mb-3">Log in</h1>
            {sessionExpired && !formError && (
              <Alert variant="warning">Your session expired. Please log in again.</Alert>
            )}
            {formError && <Alert variant="danger">{formError}</Alert>}
            <Form noValidate onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="login-email">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  autoComplete="email"
                  value={email}
                  isInvalid={!!errors.email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-3" controlId="login-password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  isInvalid={!!errors.password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
              </Form.Group>
              <Button type="submit" className="w-100" disabled={submitting}>
                {submitting ? "Logging in..." : "Log in"}
              </Button>
            </Form>
            <p className="mt-3 mb-0">
              New patient? <Link to="/register">Create an account</Link>
            </p>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}