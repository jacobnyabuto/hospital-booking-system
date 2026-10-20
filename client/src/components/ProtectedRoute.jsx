import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import useAuth from "../hooks/useAuth.js";
import { homeForRole } from "../utils/roles.js";

// Usage: <Route element={<ProtectedRoute role="patient" />}> ...child routes... </Route>
export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Checking your session...</span>
        </Spinner>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user.role !== role) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return <Outlet />;
}