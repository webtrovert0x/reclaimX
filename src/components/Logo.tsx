import React from 'react';

export function Logo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      width="32"
      height="32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Shield Shell */}
      <path
        d="M64 8L16 28V62C16 92 36.5 119.5 64 128C91.5 119.5 112 92 112 62V28L64 8Z"
        fill="#1e40af"
      />
      {/* Main Shield Body */}
      <path
        d="M64 16L24 33.5V62C24 87.5 41 111 64 118C87 111 104 87.5 104 62V33.5L64 16Z"
        fill="#2563eb"
      />
      {/* Dynamic Facet Shade */}
      <path
        d="M64 16L24 33.5V62C24 87.5 41 111 64 118V16Z"
        fill="#1d4ed8"
        opacity="0.5"
      />
      {/* Reclaim 'X' Cross Symbol */}
      <path
        d="M46 44L59.2 64L46 84H55.2L64 70.8L72.8 84H82L68.8 64L82 44H72.8L64 57.2L55.2 44H46Z"
        fill="#ffffff"
      />
      {/* Recovery Energy Center */}
      <circle cx="64" cy="64" r="4.5" fill="#bfdbfe" />
    </svg>
  );
}
