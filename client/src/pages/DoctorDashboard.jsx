import { useEffect, useState } from "react";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import useAuth from "../hooks/useAuth.js";
import DoctorAppointmentRow from "../components/DoctorAppointmentRow.jsx";
import { listDoctorAppointments, setAppointmentStatus } from "../services/appointmentService.js";

const FILTERS = ["all", "pending", "confirmed", "completed", "cancelled"];

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    listDoctorAppointments({ signal: controller.signal })
      .then((data) => { setItems(data); setLoading(false); })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError(e.message);
        setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  async function handleAction(appointment, status) {
    if (busyId) return;
    setBusyId(appointment._id);
    setActionError("");
    try {
      const updated = await setAppointmentStatus(appointment._id, status);
      setItems((list) => list.map((a) => (a._id === updated._id ? { ...a, ...updated } : a)));
    } catch (err) {
      setActionError(err.message);
      if (err.status === 409) setAttempt((n) => n + 1); // state changed elsewhere: reload
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status"><span className="visually-hidden">Loading schedule...</span></Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <p className="mb-2">{error}</p>
        <Button size="sm" variant="outline-danger" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
      </Alert>
    );
  }

  const visible = filter === "all" ? items : items.filter((a) => a.status === filter);
  const pendingCount = items.filter((a) => a.status === "pending").length;

  return (
    <>
      <h1 className="mb-1">My schedule</h1>
      <p className="text-muted">
        {user.name}. {pendingCount} appointment{pendingCount === 1 ? "" : "s"} waiting for confirmation.
      </p>

      <Form.Group controlId="status-filter" className="mb-3" style={{ maxWidth: 260 }}>
        <Form.Label>Show</Form.Label>
        <Form.Select value={filter} onChange={(e) => setFilter(e.target.value)}>
          {FILTERS.map((f) => (
            <option key={f} value={f}>{f === "all" ? "All appointments" : f}</option>
          ))}
        </Form.Select>
      </Form.Group>

      {actionError && <Alert variant="danger" dismissible onClose={() => setActionError("")}>{actionError}</Alert>}

      {items.length === 0 && <Alert variant="info">No appointments have been booked with you yet.</Alert>}
      {items.length > 0 && visible.length === 0 && <Alert variant="secondary">No appointments with that status.</Alert>}

      {visible.map((a) => (
        <DoctorAppointmentRow key={a._id} appointment={a} busy={busyId === a._id} onAction={handleAction} />
      ))}
    </>
  );
}