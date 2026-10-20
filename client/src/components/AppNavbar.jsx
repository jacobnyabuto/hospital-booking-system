import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { NavLink, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import { homeForRole } from "../utils/roles.js";

export default function AppNavbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <Navbar bg="primary" data-bs-theme="dark" expand="md">
      <Container>
        <Navbar.Brand as={NavLink} to="/">
          Hospital Booking
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/" end>
              Home
            </Nav.Link>
            <Nav.Link as={NavLink} to="/doctors">
              Doctors
            </Nav.Link>
            {user && (
              <Nav.Link as={NavLink} to={homeForRole(user.role)}>
                {user.role === "doctor" ? "My schedule" : "My appointments"}
              </Nav.Link>
            )}
          </Nav>
          {!loading && (
            <Nav className="align-items-md-center">
              {user ? (
                <>
                  <Navbar.Text className="me-md-3">Hi, {user.name}</Navbar.Text>
                  <Button variant="outline-light" size="sm" onClick={handleLogout}>
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Nav.Link as={NavLink} to="/login">
                    Log in
                  </Nav.Link>
                  <Nav.Link as={NavLink} to="/register">
                    Register
                  </Nav.Link>
                </>
              )}
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}