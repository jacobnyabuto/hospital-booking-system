import useAuth from "../hooks/useAuth.js";

export default function Profile() {
  const { user } = useAuth();
  return (
    <>
      <h1>My profile</h1>
      <p>{user.email}. (Profile editing placeholder.)</p>
    </>
  );
}