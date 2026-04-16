export const colors = {
  background: "#f5f3ee",
  backgroundMuted: "#edf3ee",
  surface: "#ffffff",
  surfaceTint: "#e8f7f0",
  surfaceAccent: "#e8efff",
  text: "#17332e",
  textMuted: "#567068",
  textSubtle: "#7a918b",
  primary: "#0f766e",
  primaryDark: "#173b35",
  border: "#dce5e1",
  shadow: "rgba(16, 39, 34, 0.12)",
  white: "#ffffff"
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
} as const;

export const radii = {
  sm: 10,
  md: 18,
  lg: 26,
  pill: 999
} as const;

export const typography = {
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700" as const,
    letterSpacing: 1.6
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700" as const
  },
  stat: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const
  },
  heroNumber: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "700" as const
  }
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  typography
} as const;

export type AppTheme = typeof theme;
