export const DESIGN_TOKENS = {
  brand: {
    name: "GRANTLY",
    tagline: "Your future deserves funding.",
    edition: "THE OUTPOST",
  },
  colors: {
    canvas: "#F8F9FC",
    surface: "#FFFFFF",
    surfaceSubtle: "#F1F4F9",
    navy: {
      950: "#090D16",
      900: "#0F172A",
      800: "#1E293B",
      700: "#334155",
      600: "#475569",
      500: "#64748B",
      400: "#94A3B8",
    },
    violet: {
      950: "#2E1065",
      900: "#4C1D95",
      800: "#5B21B6",
      700: "#6D28D9",
      600: "#7C3AED",
      500: "#8B5CF6",
      200: "#DDD6FE",
      100: "#EDE9FE",
      50: "#F5F3FF",
    },
    emerald: {
      700: "#047857",
      600: "#059669",
      500: "#10B981",
      200: "#A7F3D0",
      100: "#D1FAE5",
      50: "#ECFDF5",
    },
    border: {
      default: "#E2E8F0",
      subtle: "#EEF2F6",
    },
  },
  typography: {
    fontDisplay: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
    fontSans: '"Inter", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
  },
  radii: {
    card: "16px",
    control: "10px",
    pill: "9999px",
  },
  layout: {
    sidebarWidth: 264,
    headerHeight: 64,
    maxContentWidth: 1360,
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
