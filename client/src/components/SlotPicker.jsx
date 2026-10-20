import { useEffect, useState } from "react";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import { getDoctorSlots } from "../services/doctorService.js";
import {
  CLINIC_TIMEZONE, clinicDateString, addDaysToDateString, formatClinicTime,
} from "../utils/dates.js";

// onSelect receives the chosen slot's startTime (ISO string), or null when cleared
export default function SlotPicker({ doctorId, selected, onSelect, refreshKey = 0 }) {
  const today = clinicDateString();
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onSelect(null);
    if (!date) {
      setSlots([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");

    getDoctorSlots(doctorId, date, { signal: controller.signal })
      .then((data) => {
        setSlots(data.slots);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setSlots([]);
        setError(e.message);
        setLoading(false);
      });

    return () => controller.abort();
    // onSelect is intentionally left out: it is a state setter from the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doctorId, date, attempt, refreshKey]);

  const available = slots.filter((s) => s.available);

  return (
    <div>
      <Form.Group controlId="slot-date" className="mb-3">
        <Form.Label>Choose a date</Form.Label>
        <Form.Control
          type="date"
          value={date}
          min={today}
          max={addDaysToDateString(today, 90)}
          onChange={(e) => setDate(e.target.value)}
        />
        <Form.Text muted>Times are shown in clinic time ({CLINIC_TIMEZONE}).</Form.Text>
      </Form.Group>

      <div aria-live="polite">
        {loading && <Spinner animation="border" size="sm" role="status"><span className="visually-hidden">Loading times...</span></Spinner>}

        {!loading && error && (
          <Alert variant="danger">
            <p className="mb-2">{error}</p>
            <Button size="sm" variant="outline-danger" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          </Alert>
        )}

        {!loading && !error && date && slots.length === 0 && (
          <Alert variant="secondary">This doctor does not work on that day. Try another date.</Alert>
        )}

        {!loading && !error && slots.length > 0 && available.length === 0 && (
          <Alert variant="secondary">No free times left on that day. Try another date.</Alert>
        )}

        {!loading && !error && slots.length > 0 && (
          <div className="d-flex flex-wrap gap-2" role="group" aria-label="Available times">
            {slots.map((slot) => (
              <Button
                key={slot.startTime}
                size="sm"
                variant={selected === slot.startTime ? "primary" : "outline-primary"}
                disabled={!slot.available}
                aria-pressed={selected === slot.startTime}
                onClick={() => onSelect(slot.startTime)}
              >
                {formatClinicTime(slot.startTime)}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}