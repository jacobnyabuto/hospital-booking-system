import useAuth from "../hooks/useAuth.js";

export default function DoctorDashboard() {
  const { user } = useAuth();
  return (
    <>
      <h1>My schedule</h1>
      <p>Welcome, {user.name}. (Doctor dashboard placeholder, built in Step 25.)</p>
    </>
  );
}