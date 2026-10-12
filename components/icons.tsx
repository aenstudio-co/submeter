const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export const ChevronLeft = () => (
  <svg {...base}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const ChevronRight = () => (
  <svg {...base}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const CheckIcon = () => (
  <svg {...base} strokeWidth={2.6}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const LogoutIcon = () => (
  <svg {...base} strokeWidth={1.8}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);
