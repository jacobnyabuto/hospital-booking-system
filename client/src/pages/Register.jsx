import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Alert, Button, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import useAuth from "../hooks/useAuth.js";
import { fieldErrors } from "../services/api.js";
import { homeForRole } from "../utils/roles.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", insurerName: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Spinner animation="border" role="status" />;
  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    const problems = {};
    if (form.name.trim().length < 2) problems.name = "Name must be at least 2 characters";
    if (!EMAIL_PATTERN.test(form.email.trim())) problems.email = "Enter a valid email address";
    if (form.password.length < 8) problems.password = "Password must be at least 8 characters";
    setErrors(problems);
    setFormError("");
    if (Object.keys(problems).length) return;

    setSubmitting(true);
    try {
      const u = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        insurerName: form.insurerName,
      });
      navigate(homeForRole(u.role), { replace: true });
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      if (Object.keys(fields).length === 0) setFormError(err.message);
      setSubmitting(false);
    }
  }

  const field = (id, label, type, key, extra = {}) => (
    <Form.Group className="mb-3" controlId={id}>
      <Form.Label>{label}</Form.Label>
      <Form.Control
        type={type}
        value={form[key]}
        isInvalid={!!errors[key]}
        onChange={set(key)}
        {...extra}
      />
      <Form.Control.Feedback type="invalid">{errors[key]}</Form.Control.Feedback>
    </Form.Group>
  );

  return (
    <Row className="justify-content-center">
      <Col md={7} lg={5}>
        <Card className="shadow-sm">
          <Card.Body>
            <h1 className="h3 mb-3">Create a patient account</h1>
            <p className="text-muted small">Demo project: use fictional details only.</p>
            {formError && <Alert variant="danger">{formError}</Alert>}
            <Form noValidate onSubmit={handleSubmit}>
              {field("reg-name", "Full name", "text", "name", { autoComplete: "name", maxLength: 80 })}
              {field("reg-email", "Email", "email", "email", { autoComplete: "email" })}
              {field("reg-password", "Password (8 or more characters)", "password", "password", {
                autoComplete: "new-password",
              })}
              {field("reg-insurer", "Insurer name (optional)", "text", "insurerName", { maxLength: 80 })}
              <Button type="submit" className="w-100" disabled={submitting}>
                {submitting ? "Creating account..." : "Register"}
              </Button>
            </Form>
            <p className="mt-3 mb-0">
              Already registered? <Link to="/login">Log in</Link>
            </p>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}