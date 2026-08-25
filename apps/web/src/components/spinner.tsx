export function Spinner({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 50 50"
      width={size}
      height={size}
      className={`animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        strokeWidth="4"
        className="stroke-primary-light"
      />
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="90 125"
        className="stroke-primary"
      />
    </svg>
  );
}
