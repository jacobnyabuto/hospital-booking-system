import { useState } from "react";
import { SERVICES } from "../constants/services.js";

// Shows /images/specialties/<specialty>.jpg, or a colored banner with an icon if it is missing
export default function SpecialtyImage({ specialty, height = 150, rounded = false }) {
  const [failed, setFailed] = useState(false);
  const service = SERVICES.find((s) => s.value === specialty);
  const style = { height, width: "100%", borderRadius: rounded ? "0.75rem" : 0 };

  if (failed || !service) {
    return (
      <div
        className="d-flex align-items-center justify-content-center text-white"
        style={{ ...style, background: `linear-gradient(135deg, ${service?.color || "#0f766e"}, #134e4a)` }}
        aria-hidden="true"
      >
        <i className={`bi bi-${service?.icon || "hospital"}`} style={{ fontSize: "2.5rem" }}></i>
      </div>
    );
  }

  return (
    <img
      src={`/images/specialties/${specialty}.jpg`}
      alt=""
      loading="lazy"
      width="800"
      height="450"
      style={{ ...style, objectFit: "cover", display: "block" }}
      onError={() => setFailed(true)}
    />
  );
}