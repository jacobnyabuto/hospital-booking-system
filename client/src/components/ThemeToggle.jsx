import { Button } from "react-bootstrap";
import useTheme from "../hooks/useTheme.js";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Button variant="outline-light" size="sm" onClick={toggle} aria-label={label} title={label}>
      <i className={`bi bi-${dark ? "sun" : "moon-stars"}`} aria-hidden="true"></i>
    </Button>
  );
}
