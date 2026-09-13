/**
 * Mirrors tokens.css for contexts that need real color strings (canvas
 * fillStyle/gradients can't consume `var(--x)`). Keep these in sync by hand —
 * it's a handful of values, not worth a build step to share one source.
 */
export const tokens = {
  bg: "#0a0a0a",
  accent: "#ff3b30",
  accentActive: "#b0202b",
  textSecondary: "#8e8e93",
} as const;
