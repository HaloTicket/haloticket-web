export function VietnamFlag({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`rounded-full shrink-0 shadow-xs ${className}`}>
      <circle cx="16" cy="16" r="16" fill="#DA251D" />
      <polygon
        points="16,7.5 18.5,13.2 24.5,13.8 20,17.8 21.4,23.7 16,20.5 10.6,23.7 12,17.8 7.5,13.8 13.5,13.2"
        fill="#FFFF00"
      />
    </svg>
  );
}

export function UKFlag({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`rounded-full shrink-0 shadow-xs ${className}`}>
      <circle cx="16" cy="16" r="16" fill="#00247D" />
      <path d="M0,0 L32,32 M32,0 L0,32" stroke="#FFFFFF" strokeWidth="4" />
      <path d="M0,0 L32,32 M32,0 L0,32" stroke="#CF142B" strokeWidth="2" />
      <path d="M16,0 V32 M0,16 H32" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M16,0 V32 M0,16 H32" stroke="#CF142B" strokeWidth="3.5" />
    </svg>
  );
}
