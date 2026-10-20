import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Form } from "react-bootstrap";
import useAuth from "../hooks/useAuth.js";
import { bookAppointment } from "../services/appointmentService.js";
import { fieldErrors } from "../services/api.js";
import { formatClinicDateTime } from "../utils/dates.js";

const MAX_REASON = 300;

// onBooked() is called after a successful booking; onConflict() after a 409 so the slots can refresh
export default function BookingForm({ doctor, slot, onBooked, onConflict }) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(null);

  if (!user) {
    return (
      <Button as={Link} to="/login" state={{ from: `/doctors/${doctor._id}` }} className="w-100">
        Log in to book
      </Button>
    );
  }

  if (user.role !== "patient") {
    return <Alert variant="secondary" className="mb-0">Only patient accounts can book appointments.</Alert>;
  }

  if (booked) {
    return (
      <Alert variant="success" className="mb-0">
        <p className="mb-2">
          Booked for <strong>{formatClinicDateTime(booked.startTime)}</strong>. The doctor will confirm it.
        </p>
        <Button as={Link} to="/dashboard" size="sm" variant="success">
          View my appointments
        </Button>
      </Alert>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting || !slot) return;

    const trimmed = reason.trim();
    if (!trimmed) {
      setErrors({ reason: "Please describe the reason for your visit" });
      return;
    }
    setErrors({});
    setFormError("");
    setSubmitting(true);

    try {
      const appointment = await bookAppointment({
        doctorId: doctor._id,
        startTime: slot,
        reason: trimmed,
      });
      setBooked(appointment);
      onBooked();
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      if (err.status === 409) {
        setFormError(err.message + ". Please choose another time.");
        onConflict();
      } else if (err.status !== 401 && Object.keys(fields).length === 0) {
        setFormError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form noValidate onSubmit={handleSubmit}>
      {formError && <Alert variant="danger">{formError}</Alert>}
      {slot ? (
        <p className="mb-2">
          Selected: <strong>{formatClinicDateTime(slot)}</strong>
        </p>
      ) : (
        <p className="text-muted">Choose a date and time above.</p>
      )}
      <Form.Group controlId="booking-reason" className="mb-3">
        <Form.Label>Reason for visit</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          maxLength={MAX_REASON}
          value={reason}
          isInvalid={!!errors.reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Form.Control.Feedback type="invalid">{errors.reason}</Form.Control.Feedback>
        <Form.Text muted>
          {reason.length}/{MAX_REASON}. Demo project: use fictional details only.
        </Form.Text>
      </Form.Group>
      <Button type="submit" className="w-100" disabled={!slot || submitting}>
        {submitting ? "Booking..." : "Confirm booking"}
      </Button>
    </Form>
  );
}