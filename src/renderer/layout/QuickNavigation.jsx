import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { quickLinks } from "../app/menu";

export function QuickNavigation({ page, open, onToggle, onClose }) {
  return (
    <div className="quick-nav" data-open={open}>
      <div
        className="quick-actions"
        id="quick-actions"
        role="group"
        aria-label="Quick navigation"
        aria-hidden={!open}
        inert={!open}
      >
        {quickLinks.map(([id, name, Icon]) => (
          <Link
            key={id}
            className="quick-action"
            to={`/${id}`}
            aria-label={`Go to ${name}`}
            aria-current={page === id ? "page" : undefined}
            title={name}
            onClick={onClose}
          >
            <Icon size={19} aria-hidden="true" />
          </Link>
        ))}
      </div>
      <button
        className="quick-trigger"
        type="button"
        aria-label={open ? "Close quick navigation" : "Open quick navigation"}
        aria-expanded={open}
        aria-controls="quick-actions"
        onClick={onToggle}
      >
        <Plus size={23} aria-hidden="true" />
      </button>
    </div>
  );
}
