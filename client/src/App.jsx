import { Container, Button, Alert } from "react-bootstrap";

export default function App() {
  return (
    <Container className="py-5">
      <h1>Hospital Booking System</h1>
      <Alert variant="success" className="mt-3">
        React and React-Bootstrap are working.
      </Alert>
      <Button variant="primary">Test button</Button>
    </Container>
  );
}