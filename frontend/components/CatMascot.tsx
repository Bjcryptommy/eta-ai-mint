export function CatMascot() {
  return (
    <svg viewBox="0 0 520 520" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="fur" x1="0" x2="1">
          <stop offset="0%" stopColor="#ffd66e" />
          <stop offset="100%" stopColor="#ff8b5e" />
        </linearGradient>
        <linearGradient id="glow" x1="0" x2="1">
          <stop offset="0%" stopColor="#96ffe0" />
          <stop offset="100%" stopColor="#8cb8ff" />
        </linearGradient>
      </defs>
      <circle cx="260" cy="260" r="220" fill="rgba(255,255,255,0.04)" />
      <ellipse cx="260" cy="430" rx="126" ry="36" fill="rgba(0,0,0,0.22)" />
      <path d="M102 222c0-94 72-158 158-158s158 64 158 158v80c0 88-64 142-158 142s-158-54-158-142z" fill="url(#fur)" stroke="#0d0d12" strokeWidth="16" strokeLinejoin="round"/>
      <path d="M150 118 112 50l82 38" fill="#ffb04f" stroke="#0d0d12" strokeWidth="16" strokeLinejoin="round"/>
      <path d="M370 118 408 50l-82 38" fill="#ffb04f" stroke="#0d0d12" strokeWidth="16" strokeLinejoin="round"/>
      <path d="M179 218c18-26 49-42 81-42 32 0 63 16 81 42" fill="#fff4dd" stroke="#0d0d12" strokeWidth="14" strokeLinecap="round"/>
      <ellipse cx="212" cy="235" rx="34" ry="42" fill="#0d0d12"/>
      <ellipse cx="308" cy="235" rx="34" ry="42" fill="#0d0d12"/>
      <ellipse cx="224" cy="225" rx="9" ry="12" fill="#fff"/>
      <ellipse cx="320" cy="225" rx="9" ry="12" fill="#fff"/>
      <path d="M236 298q24 20 48 0" fill="none" stroke="#0d0d12" strokeWidth="12" strokeLinecap="round"/>
      <path d="M212 330c28 22 68 22 96 0" fill="none" stroke="#0d0d12" strokeWidth="14" strokeLinecap="round"/>
      <path d="M172 286 88 270" stroke="#0d0d12" strokeWidth="10" strokeLinecap="round"/>
      <path d="M172 314 86 320" stroke="#0d0d12" strokeWidth="10" strokeLinecap="round"/>
      <path d="M348 286 432 270" stroke="#0d0d12" strokeWidth="10" strokeLinecap="round"/>
      <path d="M348 314 434 320" stroke="#0d0d12" strokeWidth="10" strokeLinecap="round"/>
      <path d="M386 352c40 8 62 38 54 74-6 24-28 44-72 44" fill="none" stroke="#0d0d12" strokeWidth="16" strokeLinecap="round"/>
      <circle cx="111" cy="128" r="18" fill="url(#glow)" />
      <circle cx="396" cy="106" r="14" fill="url(#glow)" />
      <circle cx="422" cy="188" r="10" fill="#ffd66e" />
      <path d="M98 126h26M111 113v26" stroke="#0d0d12" strokeWidth="6" strokeLinecap="round"/>
    </svg>
  );
}
