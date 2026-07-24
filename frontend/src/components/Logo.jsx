// The neon-orange "SC" glyph mark used on Login and now reused for the
// chat loading screen. Pulled out into its own component so both places
// stay visually identical instead of drifting apart over time.
export default function Logo({ size = 80, className = '', animated = false }) {
  return (
    <div
      className={`relative ${animated ? 'animate-pulseGlow' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="3" y="3" width="94" height="94" rx="22" fill="#050403" stroke="#ff9500" strokeWidth="3" filter="url(#glow)" />
        <path
          d="M50 20a30 30 0 0 1 0 60 30 30 0 0 1-9-1.4L23 84l4.3-16A30 30 0 0 1 50 20Z"
          fill="none"
          stroke="#ff9500"
          strokeWidth="4.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#glow)"
        />
        <circle cx="38" cy="50" r="5" fill="#ff9500" filter="url(#glow)" />
        <circle cx="50" cy="50" r="5" fill="#ff9500" filter="url(#glow)" />
        <circle cx="62" cy="50" r="5" fill="#ff9500" filter="url(#glow)" />
      </svg>
    </div>
  );
}
