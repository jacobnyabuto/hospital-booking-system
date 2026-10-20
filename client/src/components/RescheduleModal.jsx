import { useState } from "react";
import { Alert, Button, Modal } from "react-bootstrap";
import SlotPicker from "./SlotPicker.jsx";
import { rescheduleAppointment } from "../services/appointmentService.js";
import { formatClinicDateTime } from "../utils/dates.js";

export default function RescheduleModal({ appointment, onClose, onDone }) {
  const [slot, setSlot] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    if (!slot || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const updated = await rescheduleAppointment(appointment._id, slot);
      onDone(updated);
    } catch (err) {
      setError(err.message);
      if (err.status === 409) setRefreshKey((n) => n + 1);
      setSubmitting(false);
    }
  }

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h2" className="h5">Reschedule with {appointment.doctorName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="small text-muted">Current: {formatClinicDateTime(appointment.startTime)}</p>
        {error && <Alert variant="danger">{error}</Alert>}
        <SlotPicker doctorId={appointment.doctor} selected={slot} onSelect={setSlot} refreshKey={refreshKey} />
        {slot && <p className="mt-3 mb-0">New time: <strong>{formatClinicDateTime(slot)}</strong></p>}
        {appointment.status === "confirmed" && (
          <p className="small text-muted mt-2 mb-0">A confirmed appointment returns to pending until the doctor confirms the new time.</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button onClick={save} disabled={!slot || submitting}>
          {submitting ? "Saving..." : "Save new time"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}