// ─── POS Enterprise Theme ────────────────────────────────────────────────────
// Brighter, commercial-grade dark theme with vivid accents

export const theme = {
  // Backgrounds
  bg: "#060d1a",                          // deep navy page bg
  surfaceBase: "#0d1b2e",                 // base card surface
  surfaceRaised: "#112240",               // raised/hover surface
  surfaceHighlight: "#1a3258",            // selected / focused surface

  // Glass card
  cardBg: "rgba(17, 34, 64, 0.75)",
  cardBgSolid: "#112240",
  cardBorder: "rgba(99, 179, 237, 0.14)",
  glassBlur: "blur(14px)",

  // Accent — electric blue
  accent: "#3b82f6",
  accentLight: "#60a5fa",
  accentBright: "#93c5fd",
  accentGradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  accentGlow: "0 4px 20px rgba(59,130,246,0.45)",

  // Cyan secondary accent for badges/highlights
  cyan: "#22d3ee",
  cyanBg: "rgba(34, 211, 238, 0.1)",

  // Semantic
  success: "#4ade80",
  successBg: "rgba(74, 222, 128, 0.12)",
  successBorder: "rgba(74, 222, 128, 0.3)",

  danger: "#f87171",
  dangerBg: "rgba(248, 113, 113, 0.12)",
  dangerBorder: "rgba(248, 113, 113, 0.3)",

  warning: "#fbbf24",
  warningBg: "rgba(251, 191, 36, 0.12)",
  warningBorder: "rgba(251, 191, 36, 0.3)",

  // Typography
  textPrimary: "#f0f6ff",
  textSecondary: "#94a3b8",
  textMuted: "#4e6580",
  textAccent: "#60a5fa",

  // Borders
  border: "rgba(99, 179, 237, 0.12)",
  borderStrong: "rgba(99, 179, 237, 0.25)",
};

// ─── Base card (glassmorphic) ─────────────────────────────────────────────────
export const cardStyle = {
  background: theme.cardBg,
  backdropFilter: theme.glassBlur,
  WebkitBackdropFilter: theme.glassBlur,
  border: `1px solid ${theme.cardBorder}`,
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(99,179,237,0.08)",
};

// ─── Solid surface card (no blur, for nested elements) ────────────────────────
export const surfaceStyle = {
  background: theme.surfaceBase,
  border: `1px solid ${theme.border}`,
  borderRadius: "12px",
  padding: "16px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
};

// ─── Primary action button ────────────────────────────────────────────────────
export const primaryButtonStyle = {
  padding: "11px 24px",
  background: theme.accentGradient,
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "14px",
  letterSpacing: "0.3px",
  boxShadow: theme.accentGlow,
  transition: "all 0.2s ease",
};

// ─── Ghost / secondary button ─────────────────────────────────────────────────
export const ghostButtonStyle = {
  padding: "10px 18px",
  background: "rgba(59,130,246,0.08)",
  color: theme.accentLight,
  border: `1px solid rgba(59,130,246,0.28)`,
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "13px",
  transition: "all 0.2s ease",
};

// ─── Input base style ─────────────────────────────────────────────────────────
export const inputStyle = {
  background: theme.surfaceBase,
  border: `1px solid ${theme.border}`,
  borderRadius: "8px",
  color: theme.textPrimary,
  padding: "9px 12px",
  fontSize: "14px",
  outline: "none",
  transition: "border-color 0.2s",
};

// ─── Select base style ────────────────────────────────────────────────────────
export const selectStyle = {
  ...inputStyle,
  appearance: "none",
  cursor: "pointer",
};