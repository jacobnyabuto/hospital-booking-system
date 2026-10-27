import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Col, Modal, Row, Card, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import AppointmentRow from "../components/AppointmentRow.jsx";
import RescheduleModal from "../components/RescheduleModal.jsx";
import { listMyAppointments, cancelAppointment } from "../services/appointmentService.js";
import useNow from "../hooks/useNow.js";

export default function PatientDashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [toCancel, setToCancel] = useState(null);
  const [toReschedule, setToReschedule] = useState(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
const now = useNow(60000);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    listMyAppointments({ signal: controller.signal })
      .then((data) => { setItems(data); setLoading(false); })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError(e.message);
        setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  const { upcoming, past, counts } = useMemo(() => {
        const isUpcoming = (a) =>
      (a.status === "pending" || a.status === "confirmed") && new Date(a.startTime).getTime() > now;
    const up = items.filter(isUpcoming).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    const rest = items.filter((a) => !isUpcoming(a));
    return {
      upcoming: up,
      past: rest,
      counts: {
        upcoming: up.length,
        completed: items.filter((a) => a.status === "completed").length,
        cancelled: items.filter((a) => a.status === "cancelled").length,
      },
    };
 }, [items, now]);

  const replaceItem = (updated) =>
    setItems((list) => list.map((a) => (a._id === updated._id ? { ...a, ...updated } : a)));

  async function confirmCancel() {
    if (busy) return;
    setBusy(true);
    setActionError("");
    try {
      replaceItem(await cancelAppointment(toCancel._id));
      setToCancel(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status"><span className="visually-hidden">Loading appointments...</span></Spinner>
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

  return (
    <>
      <h1 className="mb-3">My appointments</h1>
      <p className="text-muted">Welcome, {user.name}.</p>

      <Row xs={1} md={3} className="g-3 mb-4">
        {[["Upcoming", counts.upcoming], ["Completed", counts.completed], ["Cancelled", counts.cancelled]].map(([label, n]) => (
          <Col key={label}>
            <Card className="text-center shadow-sm">
              <Card.Body>
                <div className="display-6">{n}</div>
                <div className="text-muted">{label}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {actionError && !toCancel && <Alert variant="danger" dismissible onClose={() => setActionError("")}>{actionError}</Alert>}

      {items.length === 0 ? (
        <Alert variant="info">
          You have no appointments yet. <Link to="/doctors">Find a doctor</Link> to book one.
        </Alert>
      ) : (
        <>
          <h2 className="h5">Upcoming</h2>
          {upcoming.length === 0 && <p className="text-muted">No upcoming appointments.</p>}
          {upcoming.map((a) => (
            <AppointmentRow key={a._id} appointment={a} onCancel={setToCancel} onReschedule={setToReschedule} />
          ))}

          <h2 className="h5 mt-4">Past and cancelled</h2>
          {past.length === 0 && <p className="text-muted">Nothing here yet.</p>}
          {past.map((a) => (
            <AppointmentRow key={a._id} appointment={a} onCancel={setToCancel} onReschedule={setToReschedule} />
          ))}
        </>
      )}

      <Modal show={!!toCancel} onHide={() => !busy && setToCancel(null)} centered>
        <Modal.Header closeButton><Modal.Title as="h2" className="h5">Cancel appointment?</Modal.Title></Modal.Header>
        <Modal.Body>
          {actionError && <Alert variant="danger">{actionError}</Alert>}
          Cancel your appointment with {toCancel?.doctorName}? The time will be released for others.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setToCancel(null)} disabled={busy}>Keep it</Button>
          <Button variant="danger" onClick={confirmCancel} disabled={busy}>
            {busy ? "Cancelling..." : "Yes, cancel"}
          </Button>
        </Modal.Footer>
      </Modal>

      {toReschedule && (
        <RescheduleModal
          appointment={toReschedule}
          onClose={() => setToReschedule(null)}
          onDone={(updated) => { replaceItem(updated); setToReschedule(null); }}
        />
      )}
    </>
  );
}