import { useEffect, useState } from "react";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import useApiData from "../hooks/useApiData.js";
import { getDoctorSlots } from "../services/doctorService.js";
import {
  CLINIC_TIMEZONE, clinicDateString, addDaysToDateString, formatClinicTime,
} from "../utils/dates.js";

// onSelect receives the chosen slot's startTime (ISO string), or null when cleared
export default function SlotPicker({ doctorId, selected, onSelect, refreshKey = 0 }) {
  const today = clinicDateString();
  const [date, setDate] = useState("");

  // A new date, doctor or refresh clears any chosen slot
  useEffect(() => {
    onSelect(null);
    // onSelect is a state setter from the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, date, refreshKey]);

  const { data, loading, error, reload } = useApiData(
    (signal) => getDoctorSlots(doctorId, date, { signal }),
    `${doctorId}|${date}|${refreshKey}`,
    { enabled: !!date }
  );
  const slots = data?.slots || [];
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
            <Button size="sm" variant="outline-danger" onClick={reload}>
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