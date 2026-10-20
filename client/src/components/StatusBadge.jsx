import { Badge } from "react-bootstrap";

const COLORS = { pending: "warning", confirmed: "success", completed: "secondary", cancelled: "danger" };

export default function StatusBadge({ status }) {
  return (
    <Badge bg={COLORS[status] || "secondary"} text={status === "pending" ? "dark" : undefined}>
      {status}
    </Badge>
  );
}