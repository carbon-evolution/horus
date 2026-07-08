// Stylised gold Eye of Horus — crisp at any size for the brand mark.
export function HorusLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 72" fill="none" aria-label="Horus">
      <defs>
        <linearGradient id="horus-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5d97a" />
          <stop offset="0.5" stopColor="#e0b83a" />
          <stop offset="1" stopColor="#a9781a" />
        </linearGradient>
      </defs>
      <g stroke="url(#horus-gold)" strokeWidth="5" strokeLinecap="round" fill="none">
        {/* eyebrow */}
        <path d="M14 20 Q46 4 88 18" />
        {/* upper lid */}
        <path d="M10 36 Q46 12 90 30" />
        {/* lower lid */}
        <path d="M10 36 Q40 50 70 42" />
        {/* descending tail marking */}
        <path d="M70 42 L78 68" strokeWidth="5.5" />
        {/* inner curl / spiral */}
        <path d="M10 36 Q1 56 20 58 Q34 59 30 46" strokeWidth="4.5" />
      </g>
      {/* pupil */}
      <circle cx="46" cy="32" r="7.5" fill="url(#horus-gold)" />
    </svg>
  );
}
