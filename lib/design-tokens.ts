/**
 * Design Tokens
 * =============================================
 * Centralized design tokens for consistent styling
 * These values match the Apple-inspired design system used throughout the app
 */

/**
 * Color Palette
 * Based on iOS/Apple design colors
 */
export const colors = {
  // Brand colors
  brand: {
    primary: "#0071e3", // Apple Blue
    secondary: "#34c759", // Green
  },

  // System colors
  system: {
    blue: "#0071e3",
    green: "#34c759",
    red: "#ff3b30",
    orange: "#ff9500",
    yellow: "#ffcc00",
    purple: "#af52de",
    pink: "#ff2d55",
    teal: "#5ac8fa",
  },

  // Grayscale
  gray: {
    50: "#fbfbfd",
    100: "#f5f5f7",
    200: "#e8e8ed",
    300: "#d2d2d7",
    400: "#86868b",
    500: "#6e6e73",
    600: "#424245",
    700: "#1d1d1f",
  },

  // Text colors
  text: {
    primary: "#1d1d1f",
    secondary: "#86868b",
    tertiary: "#6e6e73",
    inverse: "#ffffff",
  },

  // Background colors
  background: {
    primary: "#fbfbfd",
    secondary: "#f5f5f7",
    card: "#ffffff",
    elevated: "#ffffff",
  },

  // Status colors
  status: {
    success: "#34c759",
    error: "#ff3b30",
    warning: "#ff9500",
    info: "#0071e3",
    pending: "#ff9500",
    approved: "#34c759",
    rejected: "#ff3b30",
    cancelled: "#86868b",
  },
} as const;

/**
 * Typography
 */
export const typography = {
  // Font sizes
  fontSize: {
    xs: "11px",
    sm: "13px",
    base: "15px",
    md: "17px",
    lg: "20px",
    xl: "24px",
    "2xl": "28px",
    "3xl": "34px",
    "4xl": "40px",
    "5xl": "56px",
  },

  // Font weights
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },

  // Line heights
  lineHeight: {
    tight: "1.2",
    normal: "1.4",
    relaxed: "1.6",
  },
} as const;

/**
 * Spacing
 */
export const spacing = {
  0: "0",
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  3.5: "14px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
  9: "36px",
  10: "40px",
  12: "48px",
  14: "56px",
  16: "64px",
} as const;

/**
 * Border Radius
 */
export const borderRadius = {
  none: "0",
  sm: "6px",
  md: "10px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  "3xl": "24px",
  full: "9999px",
} as const;

/**
 * Shadows
 */
export const shadows = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  card: "0 2px 8px rgba(0, 0, 0, 0.08)",
  elevated: "0 4px 12px rgba(0, 0, 0, 0.1)",
} as const;

/**
 * Transitions
 */
export const transitions = {
  fast: "150ms ease",
  normal: "200ms ease",
  slow: "300ms ease",
  // Specific animations
  bounce: "200ms cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  smooth: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

/**
 * Z-Index
 */
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
  tooltip: 80,
} as const;

/**
 * Breakpoints
 */
export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

/**
 * Common button styles
 */
export const buttonVariants = {
  primary: {
    bg: colors.brand.primary,
    text: colors.text.inverse,
    hover: "#005bb5",
    active: "#004a94",
  },
  secondary: {
    bg: colors.gray[100],
    text: colors.text.primary,
    hover: colors.gray[200],
    active: colors.gray[300],
  },
  outline: {
    bg: "transparent",
    text: colors.brand.primary,
    border: colors.brand.primary,
    hover: colors.gray[50],
    active: colors.gray[100],
  },
  danger: {
    bg: colors.system.red,
    text: colors.text.inverse,
    hover: "#e63329",
    active: "#cc2d24",
  },
  success: {
    bg: colors.system.green,
    text: colors.text.inverse,
    hover: "#2eb24f",
    active: "#289945",
  },
} as const;

/**
 * Tailwind class mappings
 * Use these for consistent Tailwind classes
 */
export const tw = {
  // Common card styles
  card: "bg-white rounded-2xl shadow-card",
  cardElevated: "bg-white rounded-2xl shadow-elevated",
  
  // Input styles
  input: "w-full px-4 py-3.5 text-[15px] rounded-xl bg-[#f5f5f7] border border-transparent focus:border-[#0071e3] focus:bg-white focus:outline-none transition-colors",
  
  // Button base
  buttonBase: "flex items-center justify-center gap-2 font-semibold rounded-full transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
  
  // Text styles
  heading1: "text-[28px] font-bold text-[#1d1d1f]",
  heading2: "text-[24px] font-semibold text-[#1d1d1f]",
  heading3: "text-[20px] font-semibold text-[#1d1d1f]",
  body: "text-[15px] text-[#1d1d1f]",
  caption: "text-[13px] text-[#86868b]",
  
  // Icon button
  iconButton: "w-10 h-10 flex items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors active:scale-95",
} as const;

// Export all tokens
export const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  buttonVariants,
  tw,
} as const;

export default designTokens;
