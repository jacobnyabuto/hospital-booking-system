import { useEffect, useState } from "react";
import { Row, Col, Form, Button, Alert, Spinner } from "react-bootstrap";
import DoctorCard from "../components/DoctorCard.jsx";
import { SPECIALTIES } from "../constants/specialties.js";
import useDebounce from "../hooks/useDebounce.js";
import { listDoctors } from "../services/doctorService.js";
import AiAssistant from "../components/AiAssistant.jsx";

export default function Doctors() {
  const [specialty, setSpecialty] = useState("");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const debouncedSearch = useDebounce(search);
  const debouncedLocation = useDebounce(location);

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    listDoctors(
      { specialty, search: debouncedSearch, location: debouncedLocation },
      { signal: controller.signal }
    )
      .then((data) => {
        setDoctors(data);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return; // a newer request replaced this one
        setError(e.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [specialty, debouncedSearch, debouncedLocation, attempt]);

  const hasFilters = specialty || search || location;
  function clearFilters() {
    setSpecialty("");
    setSearch("");
    setLocation("");
  }

  return (
    <>
      <h1 className="mb-3">Find a doctor</h1>
      <div className="mb-4">
        <AiAssistant />
      </div>

      <Form className="mb-4" onSubmit={(e) => e.preventDefault()}>
        <Row className="g-3">
          <Col md={4}>
            <Form.Group controlId="filter-specialty">
              <Form.Label>Specialty</Form.Label>
              <Form.Select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                <option value="">All specialties</option>
                {SPECIALTIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="filter-search">
              <Form.Label>Doctor name</Form.Label>
              <Form.Control
                type="search"
                value={search}
                maxLength={80}
                placeholder="e.g. Priya"
                onChange={(e) => setSearch(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="filter-location">
              <Form.Label>Location</Form.Label>
              <Form.Control
                type="search"
                value={location}
                maxLength={100}
                placeholder="e.g. Dallas"
                onChange={(e) => setLocation(e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>
        {hasFilters && (
          <Button variant="link" className="px-0 mt-2" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </Form>

      <div aria-live="polite">
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading doctors...</span>
            </Spinner>
          </div>
        )}

        {!loading && error && (
          <Alert variant="danger">
            <p className="mb-2">{error}</p>
            <Button variant="outline-danger" size="sm" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          </Alert>
        )}

        {!loading && !error && doctors.length === 0 && (
          <Alert variant="secondary">
            No doctors found. Try a different specialty, name or location.
          </Alert>
        )}

        {!loading && !error && doctors.length > 0 && (
          <>
            <p className="text-muted">
              {doctors.length} doctor{doctors.length === 1 ? "" : "s"} found
            </p>
            <Row xs={1} md={2} lg={3} className="g-4">
              {doctors.map((doctor) => (
                <Col key={doctor._id}>
                  <DoctorCard doctor={doctor} />
                </Col>
              ))}
            </Row>
          </>
        )}
      </div>
    </>
  );
}