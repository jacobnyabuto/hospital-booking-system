import useAuth from "../hooks/useAuth.js";

export default function PatientDashboard() {
  const { user } = useAuth();
  return (
    <>
      <h1>My appointments</h1>
      <p>Welcome, {user.name}. (Dashboard placeholder, built in Step 25.)</p>
    </>
  );
}