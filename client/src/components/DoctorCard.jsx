import { Card, Badge, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import { specialtyLabel } from "../constants/specialties.js";
import SpecialtyImage from "./SpecialtyImage.jsx";

export default function DoctorCard({ doctor }) {
  return (
       <Card className="h-100 shadow-sm overflow-hidden">
      <SpecialtyImage specialty={doctor.specialty} height={150} />
      <Card.Body className="d-flex flex-column">
        <Card.Title as="h2" className="h5">
          {doctor.fullName}
        </Card.Title>
        <div className="mb-2">
          <Badge bg="info" text="dark">
            {specialtyLabel(doctor.specialty)}
          </Badge>
        </div>
        <Card.Text className="text-muted mb-1">{doctor.location}</Card.Text>
        <Card.Text className="mb-1">
          Rating {doctor.rating.toFixed(1)} / 5 ({doctor.ratingCount} reviews, demo data)
        </Card.Text>
        <Card.Text>Consultation fee: ${doctor.consultationFee}</Card.Text>
        <Button as={Link} to={`/doctors/${doctor._id}`} variant="primary" className="mt-auto">
          View profile and book
        </Button>
      </Card.Body>
    </Card>
  );
}