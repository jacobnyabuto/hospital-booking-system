import { Link } from "react-router-dom";
import { Button, Col, Row } from "react-bootstrap";
import AiAssistant from "../components/AiAssistant.jsx";

export default function Home() {
  return (
    <>
      <h1>Hospital Booking System</h1>
      <p className="lead">Find a doctor, pick a time, and book an appointment.</p>
      <Row className="g-4 align-items-start">
        <Col lg={7}>
          <AiAssistant />
        </Col>
        <Col lg={5}>
          <h2 className="h5">Prefer to browse?</h2>
          <p>Filter doctors by specialty, name, or location, and see their open times.</p>
          <Button as={Link} to="/doctors" variant="outline-primary">Browse doctors</Button>
        </Col>
      </Row>
    </>
  );
}