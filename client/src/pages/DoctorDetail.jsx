import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Row, Col, Card, Badge, Button, Alert, Spinner, ListGroup } from "react-bootstrap";
import { getDoctor } from "../services/doctorService.js";
import { specialtyLabel } from "../constants/specialties.js";
import { formatWorkingDays, formatClock } from "../utils/format.js";
import SlotPicker from "../components/SlotPicker.jsx";
import { formatClinicDateTime } from "../utils/dates.js";
import BookingForm from "../components/BookingForm.jsx";

export default function DoctorDetail() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setNotFound(false);
    setError("");
    setDoctor(null);

    getDoctor(id, { signal: controller.signal })
      .then((data) => {
        setDoctor(data);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        if (e.status === 404 || e.status === 400) setNotFound(true);
        else setError(e.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [id, attempt]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading doctor...</span>
        </Spinner>
      </div>
    );
  }

  if (notFound) {
    return (
      <>
        <h1>Doctor not found</h1>
        <p>This doctor does not exist or is no longer available.</p>
        <Button as={Link} to="/doctors" variant="primary">
          Back to all doctors
        </Button>
      </>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <p className="mb-2">{error}</p>
        <Button variant="outline-danger" size="sm" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </Button>
      </Alert>
    );
  }

  return (
    <>
      <p>
        <Link to="/doctors">&larr; All doctors</Link>
      </p>
      <Row className="g-4">
        <Col lg={8}>
          <h1 className="mb-2">{doctor.fullName}</h1>
          <div className="mb-3">
            <Badge bg="info" text="dark">
              {specialtyLabel(doctor.specialty)}
            </Badge>
          </div>
          <p className="text-muted">{doctor.location}</p>
          {doctor.bio && <p>{doctor.bio}</p>}
          <p>
            Rating {doctor.rating.toFixed(1)} / 5 ({doctor.ratingCount} reviews, demo data)
          </p>

          <h2 className="h5 mt-4">Accepted insurers</h2>
          {doctor.acceptedInsurers.length === 0 ? (
            <p className="text-muted">No insurers listed.</p>
          ) : (
            <ul>
              {doctor.acceptedInsurers.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
        </Col>

        <Col lg={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title as="h2" className="h5">
                Appointment details
              </Card.Title>
              <ListGroup variant="flush" className="mb-3">
                <ListGroup.Item>Fee: ${doctor.consultationFee}</ListGroup.Item>
                <ListGroup.Item>Days: {formatWorkingDays(doctor.workingDays)}</ListGroup.Item>
                <ListGroup.Item>
                  Hours: {formatClock(doctor.workStart)} to {formatClock(doctor.workEnd)} (clinic time)
                </ListGroup.Item>
                <ListGroup.Item>Appointments are {doctor.slotMinutes} minutes</ListGroup.Item>
              </ListGroup>
                                          <h3 className="h6">Pick a time</h3>
              <SlotPicker
                doctorId={id}
                selected={selectedSlot}
                onSelect={setSelectedSlot}
                refreshKey={refreshKey}
              />
              <hr />
              <BookingForm
                doctor={doctor}
                slot={selectedSlot}
                onBooked={() => setRefreshKey((n) => n + 1)}
                onConflict={() => setRefreshKey((n) => n + 1)}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}