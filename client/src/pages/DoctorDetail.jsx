import { useParams } from "react-router-dom";

export default function DoctorDetail() {
  const { id } = useParams();
  return <h1>Doctor {id}</h1>;
}