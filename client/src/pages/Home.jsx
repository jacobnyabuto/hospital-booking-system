import { Link } from "react-router-dom";
import { Button, Card, Col, Row } from "react-bootstrap";
import AiAssistant from "../components/AiAssistant.jsx";
import { GOALS, SERVICES } from "../constants/services.js";

export default function Home() {
  return (
    <>
      <section className="hero mb-5">
        <span className="hero-tag">
          <i className="bi bi-heart-pulse me-2" aria-hidden="true"></i>
          Care that fits your schedule
        </span>
        <h1 className="display-5">Your health, booked in minutes</h1>
        <p className="lead mb-4">
          Hospital Booking System connects patients with doctors across eight specialties. Browse
          profiles, check real availability and book an appointment online.
        </p>
        <div className="d-flex flex-wrap gap-2">
          <Button as={Link} to="/doctors" size="lg" className="btn-accent">
            Find a doctor
          </Button>
          <Button as={Link} to="/register" size="lg" variant="outline-light">
            Create an account
          </Button>
        </div>
      </section>

      <section className="mb-5" aria-labelledby="assistant-heading">
        <h2 id="assistant-heading" className="visually-hidden">Doctor assistant</h2>
        <AiAssistant />
      </section>

      <section className="mb-5" aria-labelledby="services-heading">
        <h2 id="services-heading" className="section-title mb-1">Our services</h2>
        <p className="text-muted">Choose a specialty to see the doctors who offer it.</p>
        <Row xs={1} sm={2} lg={4} className="g-4">
          {SERVICES.map((s) => (
            <Col key={s.value}>
              <Card className="service-card h-100">
                <Card.Body className="d-flex flex-column">
                  <span className="icon-bubble mb-3" style={{ "--bubble": s.color }}>
                    <i className={`bi bi-${s.icon}`} aria-hidden="true"></i>
                  </span>
                  <Card.Title as="h3" className="h5">{s.title}</Card.Title>
                  <Card.Text className="text-muted flex-grow-1">{s.text}</Card.Text>
                  <Link to={`/doctors?specialty=${s.value}`} className="stretched-link fw-semibold">
                    See {s.title} doctors <span aria-hidden="true">&rarr;</span>
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <section className="goals-band mb-5" aria-labelledby="goals-heading">
        <h2 id="goals-heading" className="section-title text-center mb-1">What we aim for</h2>
        <p className="text-center text-muted mb-4">Our goals for every patient and every visit.</p>
        <Row xs={1} md={2} lg={4} className="g-4 px-lg-3">
          {GOALS.map((g) => (
            <Col key={g.title}>
              <Card className="goal-card h-100">
                <Card.Body className="text-center">
                  <span className="icon-bubble mb-3" style={{ "--bubble": "#0f766e" }}>
                    <i className={`bi bi-${g.icon}`} aria-hidden="true"></i>
                  </span>
                  <Card.Title as="h3" className="h6">{g.title}</Card.Title>
                  <Card.Text className="text-muted small mb-0">{g.text}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <p className="text-center text-muted small">
        This is a demonstration project. All doctors, ratings and patients are fictional, and nothing here is medical advice.
      </p>
    </>
  );
}