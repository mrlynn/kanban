/**
 * Moltboard Design Tokens
 * 
 * A warm, low-contrast design system for a calm, modern SaaS dashboard.
 * No neon colors. No pure black or white. Visual weight should feel balanced and quiet.
 */

export const tokens = {
  // ═══════════════════════════════════════════════════════════════════════════
  // DARK THEME TOKENS
  // ═══════════════════════════════════════════════════════════════════════════
  dark: {
    // Background colors
    bg: {
      primary: '#0f1115',      // App root background, full page canvas
      secondary: '#1a1d23',    // Sidebars, secondary panels, nav backgrounds
      surface: '#1f232b',      // Cards, chat bubbles, modals, popovers
      elevated: '#252a33',     // Elevated surfaces, dropdowns
    },
    
    // Border colors
    border: {
      subtle: '#262b33',       // Dividers, panel borders, table outlines
      default: '#2f353f',      // More prominent borders
      strong: '#3a424d',       // Focused/active borders
    },
    
    // Text colors
    text: {
      primary: '#e6e8eb',      // Headings, primary body text
      secondary: '#9aa0aa',    // Labels, helper text, timestamps
      muted: '#6b707a',        // Disabled states, placeholders, metadata
      inverse: '#0f1115',      // Text on light/accent backgrounds
    },
    
    // Accent colors - restrained warm palette
    accent: {
      primary: '#c5534f',           // Primary buttons, active nav, focus ring
      primaryHover: '#b94a48',      // Hover state for primary actions
      primaryActive: '#a84240',     // Active/pressed state
      secondary: '#d8c6a3',         // Subtle highlights, selected row background
      secondarySoft: '#e6d8b8',     // Low emphasis fills, badges, hints
      secondaryMuted: '#bfb08a',    // Muted secondary accent
      warning: '#d07a3f',           // Warning states, non-destructive emphasis
      warningHover: '#c06d35',      // Warning hover
    },
    
    // Status colors
    status: {
      success: '#5f8f6b',           // Success badges, confirmations
      successBg: 'rgba(95, 143, 107, 0.12)',
      error: '#c5534f',             // Error text, destructive actions
      errorBg: 'rgba(197, 83, 79, 0.12)',
      warning: '#d07a3f',           // Warning states
      warningBg: 'rgba(208, 122, 63, 0.12)',
      info: '#5c7fa3',              // Informational messages
      infoBg: 'rgba(92, 127, 163, 0.12)',
    },
    
    // Interactive states
    interactive: {
      hover: 'rgba(255, 255, 255, 0.04)',
      active: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(216, 198, 163, 0.08)',
      focus: 'rgba(197, 83, 79, 0.24)',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LIGHT THEME TOKENS
  // ═══════════════════════════════════════════════════════════════════════════
  light: {
    // Background colors
    bg: {
      primary: '#f6f4ef',      // App root background
      secondary: '#ece6da',    // Panels, sidebars
      surface: '#ffffff',      // Cards, modals
      elevated: '#ffffff',     // Elevated surfaces
    },
    
    // Border colors
    border: {
      subtle: '#d9d4c8',       // Dividers, outlines
      default: '#ccc5b8',      // More prominent borders
      strong: '#b8b0a3',       // Focused/active borders
    },
    
    // Text colors
    text: {
      primary: '#1a1d23',      // Headings, body text
      secondary: '#4f5560',    // Labels, helper text
      muted: '#7a7f87',        // Disabled text
      inverse: '#f6f4ef',      // Text on dark/accent backgrounds
    },
    
    // Accent colors - same hues, adjusted for light mode
    accent: {
      primary: '#b94a48',           // Slightly darker for contrast
      primaryHover: '#a84240',
      primaryActive: '#973b39',
      secondary: '#c9b88f',         // Darker for visibility
      secondarySoft: '#e6d8b8',
      secondaryMuted: '#d4c49a',
      warning: '#c06d35',
      warningHover: '#ad622f',
    },
    
    // Status colors
    status: {
      success: '#4a7a56',
      successBg: 'rgba(74, 122, 86, 0.1)',
      error: '#b94a48',
      errorBg: 'rgba(185, 74, 72, 0.1)',
      warning: '#c06d35',
      warningBg: 'rgba(192, 109, 53, 0.1)',
      info: '#4a6d8f',
      infoBg: 'rgba(74, 109, 143, 0.1)',
    },
    
    // Interactive states
    interactive: {
      hover: 'rgba(0, 0, 0, 0.04)',
      active: 'rgba(0, 0, 0, 0.08)',
      selected: 'rgba(201, 184, 143, 0.15)',
      focus: 'rgba(185, 74, 72, 0.2)',
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED TOKENS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Shadows
  shadow: {
    level1: '0 4px 12px rgba(0, 0, 0, 0.35)',    // Cards, dropdowns
    level2: '0 8px 24px rgba(0, 0, 0, 0.45)',    // Modals, overlays
    level3: '0 16px 48px rgba(0, 0, 0, 0.55)',   // Large overlays
    // Light mode shadows (less intense)
    light: {
      level1: '0 4px 12px rgba(0, 0, 0, 0.08)',
      level2: '0 8px 24px rgba(0, 0, 0, 0.12)',
      level3: '0 16px 48px rgba(0, 0, 0, 0.16)',
    },
  },
  
  // Border radius
  radius: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  // Spacing scale
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.8125rem',   // 13px
      base: '0.875rem',  // 14px
      md: '1rem',        // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  // Transitions
  transition: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },
  
  // Z-index scale
  zIndex: {
    dropdown: 100,
    sticky: 200,
    modal: 300,
    popover: 400,
    tooltip: 500,
  },
} as const;

// Type exports
export type ThemeMode = 'dark' | 'light';
export type DesignTokens = typeof tokens;
export type DarkTokens = typeof tokens.dark;
export type LightTokens = typeof tokens.light;
