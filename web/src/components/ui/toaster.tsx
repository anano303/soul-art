"use client";

import { useToast } from "@/hooks/use-toast";
import "./toaster.css";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="toast-container">
      {toasts.map(function ({ id, title, description, variant = "default" }) {
        return (
          <div key={id} className={`toast toast-${variant}`}>
            <div className="toast-content">
              {title && <div className="toast-title">{title}</div>}
              {description && (
                <div className="toast-description">{description}</div>
              )}
            </div>
            <button
              className="toast-close"
              onClick={() => dismiss(id)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
