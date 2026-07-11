export default function VerifiedBadge({ size = 14, className = '' }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
      aria-label="Verified"
      role="img"
    >
      {/* Scalloped rosette seal, orange to match the app's ember accent */}
      <path
        d="M20 1.5l3.6 3 4.6-1.1 1.9 4.4 4.6 1.6-.6 4.7 3.4 3.4-3.4 3.4.6 4.7-4.6 1.6-1.9 4.4-4.6-1.1-3.6 3-3.6-3-4.6 1.1-1.9-4.4-4.6-1.6.6-4.7L1.5 20l3.4-3.4-.6-4.7 4.6-1.6 1.9-4.4 4.6 1.1z"
        fill="#f97316"
      />
      {/* Checkmark */}
      <path
        d="M14.5 20.5l3.6 3.6 7.4-8.2"
        fill="none"
        stroke="#0a0a0f"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
