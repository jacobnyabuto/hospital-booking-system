import { Button, Card } from "react-bootstrap";
import StatusBadge from "./StatusBadge.jsx";
import { formatClinicDateTime } from "../utils/dates.js";
import useNow from "../hooks/useNow.js";

export default function DoctorAppointmentRow({ appointment, busy, onAction }) {
  const a = appointment;
   const now = useNow();
  const started = new Date(a.startTime).getTime() <= now;
  return (
    <Card className="mb-3 shadow-sm">
      <Card.Body className="d-flex flex-wrap justify-content-between gap-3">
        <div>
          <h3 className="h6 mb-1">
            {a.patient?.name || "Unknown patient"} <StatusBadge status={a.status} />
          </h3>
          <div>{formatClinicDateTime(a.startTime)} (clinic time)</div>
          <div className="small">Reason: {a.reason}</div>
          {a.status === "cancelled" && a.cancelledBy && (
            <div className="small text-muted">Cancelled by {a.cancelledBy}</div>
          )}
        </div>
        <div className="d-flex gap-2 align-items-start">
          {a.status === "pending" && (
            <>
              <Button size="sm" variant="success" disabled={busy} onClick={() => onAction(a, "confirmed")}>
                Confirm
              </Button>
              <Button size="sm" variant="outline-danger" disabled={busy} onClick={() => onAction(a, "cancelled")}>
                Decline
              </Button>
            </>
          )}
          {a.status === "confirmed" && (
            <>
              <Button
                size="sm"
                variant="primary"
                disabled={busy || !started}
                title={started ? undefined : "Available after the start time"}
                onClick={() => onAction(a, "completed")}
              >
                Mark completed
              </Button>
              <Button size="sm" variant="outline-danger" disabled={busy} onClick={() => onAction(a, "cancelled")}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}