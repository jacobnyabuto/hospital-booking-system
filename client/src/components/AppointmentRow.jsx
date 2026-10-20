import { Button, Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge.jsx";
import { specialtyLabel } from "../constants/specialties.js";
import { formatClinicDateTime } from "../utils/dates.js";

export default function AppointmentRow({ appointment, onCancel, onReschedule }) {
  const a = appointment;
  const changeable = a.status === "pending" || a.status === "confirmed";
  return (
    <Card className="mb-3 shadow-sm">
      <Card.Body className="d-flex flex-wrap justify-content-between gap-3">
        <div>
          <h3 className="h6 mb-1">
            <Link to={`/doctors/${a.doctor}`}>{a.doctorName}</Link> <StatusBadge status={a.status} />
          </h3>
          <div className="text-muted small">{specialtyLabel(a.specialty)} | Fee ${a.consultationFee}</div>
          <div>{formatClinicDateTime(a.startTime)} (clinic time)</div>
          <div className="small">Reason: {a.reason}</div>
          {a.status === "cancelled" && a.cancelledBy && (
            <div className="small text-muted">Cancelled by {a.cancelledBy}</div>
          )}
        </div>
        {changeable && (
          <div className="d-flex gap-2 align-items-start">
            <Button size="sm" variant="outline-primary" onClick={() => onReschedule(a)}>
              Reschedule
            </Button>
            <Button size="sm" variant="outline-danger" onClick={() => onCancel(a)}>
              Cancel
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}