import { Container } from "react-bootstrap";
import { Outlet } from "react-router-dom";
import AppNavbar from "./AppNavbar.jsx";

export default function Layout() {
  return (
    <>
      <AppNavbar />
      <Container as="main" className="py-4">
        <Outlet />
      </Container>
      <footer className="text-center text-muted small py-4">
        Demo project with fictional data. Not medical advice.
      </footer>
    </>
  );
}