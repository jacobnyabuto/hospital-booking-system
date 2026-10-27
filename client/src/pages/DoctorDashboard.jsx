import { useState } from "react";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import useAuth from "../hooks/useAuth.js";
import DoctorAppointmentRow from "../components/DoctorAppointmentRow.jsx";
import { listDoctorAppointments, setAppointmentStatus } from "../services/appointmentService.js";
import useApiData from "../hooks/useApiData.js";

const FILTERS = ["all", "pending", "confirmed", "completed", "cancelled"];

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

   const { data, setData, loading, error, reload } = useApiData(
    (signal) => listDoctorAppointments({ signal }),
    "doctor-mine"
  );
  const items = data || [];

  async function handleAction(appointment, status) {
    if (busyId) return;
    setBusyId(appointment._id);
    setActionError("");
    try {
      const updated = await setAppointmentStatus(appointment._id, status);
      setData((list) => (list || []).map((a) => (a._id === updated._id ? { ...a, ...updated } : a)));
    } catch (err) {
      setActionError(err.message);
      if (err.status === 409) reload(); // state changed elsewhere: reload
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
        <Button size="sm" variant="outline-danger" onClick={reload}>Try again</Button>
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