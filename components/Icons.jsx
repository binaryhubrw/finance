/**
 * A hand-drawn set rather than an icon package — nine glyphs is not worth a
 * dependency. All stroke-based, sized in em so they follow the text they sit
 * beside, and coloured with currentColor.
 */

function Glyph({ children, size = 16, className = '', strokeWidth = 1.6 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export const OverviewIcon = (props) => (
  <Glyph {...props}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="4.5" rx="1.5" />
    <rect x="13.5" y="10.5" width="7.5" height="10.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </Glyph>
);

export const LedgerIcon = (props) => (
  <Glyph {...props}>
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v18H5.5A1.5 1.5 0 0 1 4 19.5z" />
    <path d="M8 7.5h7M8 12h7M8 16.5h4" />
    <path d="M16 3v18" />
  </Glyph>
);

export const ApprovalsIcon = (props) => (
  <Glyph {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.2 2.4 2.4 4.6-5" />
  </Glyph>
);

export const AuditIcon = (props) => (
  <Glyph {...props}>
    <path d="M12 3l7 3v5.5c0 4.4-2.9 8.2-7 9.5-4.1-1.3-7-5.1-7-9.5V6z" />
    <path d="M12 8.5v4l2.5 1.5" />
  </Glyph>
);

export const ExceptionsIcon = (props) => (
  <Glyph {...props}>
    <path d="M12 4.2 21 19.5H3z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </Glyph>
);

export const ReportsIcon = (props) => (
  <Glyph {...props}>
    <path d="M4 20h16" />
    <rect x="5.5" y="11" width="3.5" height="6" rx="1" />
    <rect x="11" y="7" width="3.5" height="10" rx="1" />
    <rect x="16.5" y="13.5" width="3.5" height="3.5" rx="1" />
  </Glyph>
);

export const SettingsIcon = (props) => (
  <Glyph {...props}>
    <path d="M5 7h14M5 12h14M5 17h14" />
    <circle cx="9" cy="7" r="2" />
    <circle cx="15" cy="12" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Glyph>
);

export const UploadIcon = (props) => (
  <Glyph {...props}>
    <path d="M12 15.5V4.5" />
    <path d="m8 8.2 4-3.7 4 3.7" />
    <path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
  </Glyph>
);

export const PlusIcon = (props) => (
  <Glyph {...props}>
    <path d="M12 5v14M5 12h14" />
  </Glyph>
);

export const DownloadIcon = (props) => (
  <Glyph {...props}>
    <path d="M12 4.5v11" />
    <path d="m8 11.8 4 3.7 4-3.7" />
    <path d="M4.5 16v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2" />
  </Glyph>
);

export const SignOutIcon = (props) => (
  <Glyph {...props}>
    <path d="M15 4.5h2.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H15" />
    <path d="M10.5 8 6.5 12l4 4" />
    <path d="M6.5 12H15" />
  </Glyph>
);

/** The wordmark's square — a stylised binary/circuit node. */
export const BrandMark = ({ size = 32, className = '' }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className={className}>
    <rect width="32" height="32" rx="9" fill="url(#brand-mark)" />
    <g stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" fill="none">
      <path d="M10 9.5v13" />
      <path d="M10 9.5h6.2a3.2 3.2 0 0 1 0 6.4H10" />
      <path d="M10 15.9h7a3.3 3.3 0 0 1 0 6.6h-7" />
    </g>
    <circle cx="23.6" cy="9.4" r="2" fill="#37d0c4" />
    <defs>
      <linearGradient id="brand-mark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1a4b93" />
        <stop offset="1" stopColor="#0a2547" />
      </linearGradient>
    </defs>
  </svg>
);

export const NAV_ICONS = {
  '/': OverviewIcon,
  '/ledger': LedgerIcon,
  '/approvals': ApprovalsIcon,
  '/audit': AuditIcon,
  '/exceptions': ExceptionsIcon,
  '/reports': ReportsIcon,
  '/settings': SettingsIcon,
};
