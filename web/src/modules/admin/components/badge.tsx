interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className = "" }: BadgeProps) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-semibold text-white shadow-md ${className}`}
      style={{
        background: "linear-gradient(135deg, var(--primary-color, #012645), #093d67)",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
        border: "2px solid #e0d849",
        color: "#e0d849",
        padding: "0.5rem 1rem",
      }}
    >
      {children}
    </span>
  );
}
