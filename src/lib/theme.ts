'use client';

import { createTheme, alpha, ThemeOptions } from '@mui/material/styles';
import { tokens } from './design-tokens';

/**
 * Create Moltboard theme
 * 
 * A warm, low-contrast design system for a calm, modern SaaS dashboard.
 */

// Extend MUI theme to include custom tokens
declare module '@mui/material/styles' {
  interface Palette {
    accent: {
      primary: string;
      primaryHover: string;
      secondary: string;
      secondarySoft: string;
      warning: string;
    };
    surface: {
      primary: string;
      secondary: string;
      elevated: string;
    };
    border: {
      subtle: string;
      default: string;
      strong: string;
    };
  }
  interface PaletteOptions {
    accent?: {
      primary?: string;
      primaryHover?: string;
      secondary?: string;
      secondarySoft?: string;
      warning?: string;
    };
    surface?: {
      primary?: string;
      secondary?: string;
      elevated?: string;
    };
    border?: {
      subtle?: string;
      default?: string;
      strong?: string;
    };
  }
}

const createMoltboardTheme = (mode: 'dark' | 'light') => {
  const t = mode === 'dark' ? tokens.dark : tokens.light;
  const shadows = mode === 'dark' ? tokens.shadow : tokens.shadow.light;

  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      
      // Primary = brick red accent
      primary: {
        main: t.accent.primary,
        light: t.accent.primaryHover,
        dark: t.accent.primaryActive,
        contrastText: mode === 'dark' ? '#ffffff' : '#ffffff',
      },
      
      // Secondary = tan/beige
      secondary: {
        main: t.accent.secondary,
        light: t.accent.secondarySoft,
        dark: t.accent.secondaryMuted,
        contrastText: mode === 'dark' ? '#0f1115' : '#1a1d23',
      },
      
      // Background
      background: {
        default: t.bg.primary,
        paper: t.bg.surface,
      },
      
      // Text
      text: {
        primary: t.text.primary,
        secondary: t.text.secondary,
        disabled: t.text.muted,
      },
      
      // Divider
      divider: t.border.subtle,
      
      // Status colors
      error: {
        main: t.status.error,
        light: alpha(t.status.error, 0.8),
        dark: t.status.error,
      },
      warning: {
        main: t.status.warning,
        light: alpha(t.status.warning, 0.8),
        dark: t.status.warning,
      },
      info: {
        main: t.status.info,
        light: alpha(t.status.info, 0.8),
        dark: t.status.info,
      },
      success: {
        main: t.status.success,
        light: alpha(t.status.success, 0.8),
        dark: t.status.success,
      },
      
      // Custom palette extensions
      accent: {
        primary: t.accent.primary,
        primaryHover: t.accent.primaryHover,
        secondary: t.accent.secondary,
        secondarySoft: t.accent.secondarySoft,
        warning: t.accent.warning,
      },
      surface: {
        primary: t.bg.primary,
        secondary: t.bg.secondary,
        elevated: t.bg.elevated,
      },
      border: {
        subtle: t.border.subtle,
        default: t.border.default,
        strong: t.border.strong,
      },
      
      // Action states
      action: {
        hover: t.interactive.hover,
        selected: t.interactive.selected,
        focus: t.interactive.focus,
        active: t.interactive.active,
        disabled: t.text.muted,
        disabledBackground: alpha(t.text.muted, 0.12),
      },
    },
    
    typography: {
      fontFamily: tokens.typography.fontFamily.sans,
      
      h1: {
        fontWeight: tokens.typography.fontWeight.bold,
        fontSize: tokens.typography.fontSize['3xl'],
        lineHeight: tokens.typography.lineHeight.tight,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontWeight: tokens.typography.fontWeight.bold,
        fontSize: tokens.typography.fontSize['2xl'],
        lineHeight: tokens.typography.lineHeight.tight,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontWeight: tokens.typography.fontWeight.semibold,
        fontSize: tokens.typography.fontSize.xl,
        lineHeight: tokens.typography.lineHeight.tight,
      },
      h4: {
        fontWeight: tokens.typography.fontWeight.semibold,
        fontSize: tokens.typography.fontSize.lg,
        lineHeight: tokens.typography.lineHeight.normal,
      },
      h5: {
        fontWeight: tokens.typography.fontWeight.semibold,
        fontSize: tokens.typography.fontSize.md,
        lineHeight: tokens.typography.lineHeight.normal,
      },
      h6: {
        fontWeight: tokens.typography.fontWeight.semibold,
        fontSize: tokens.typography.fontSize.base,
        lineHeight: tokens.typography.lineHeight.normal,
      },
      subtitle1: {
        fontWeight: tokens.typography.fontWeight.medium,
        fontSize: tokens.typography.fontSize.base,
        lineHeight: tokens.typography.lineHeight.normal,
      },
      subtitle2: {
        fontWeight: tokens.typography.fontWeight.medium,
        fontSize: tokens.typography.fontSize.sm,
        lineHeight: tokens.typography.lineHeight.normal,
      },
      body1: {
        fontSize: tokens.typography.fontSize.base,
        lineHeight: tokens.typography.lineHeight.relaxed,
      },
      body2: {
        fontSize: tokens.typography.fontSize.sm,
        lineHeight: tokens.typography.lineHeight.relaxed,
      },
      caption: {
        fontSize: tokens.typography.fontSize.xs,
        lineHeight: tokens.typography.lineHeight.normal,
        color: t.text.secondary,
      },
      overline: {
        fontSize: tokens.typography.fontSize.xs,
        fontWeight: tokens.typography.fontWeight.semibold,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      },
      button: {
        fontWeight: tokens.typography.fontWeight.semibold,
        fontSize: tokens.typography.fontSize.sm,
        textTransform: 'none',
        letterSpacing: '0.01em',
      },
    },
    
    shape: {
      borderRadius: tokens.radius.md,
    },
    
    shadows: [
      'none',
      shadows.level1,
      shadows.level1,
      shadows.level1,
      shadows.level1,
      shadows.level2,
      shadows.level2,
      shadows.level2,
      shadows.level2,
      shadows.level2,
      shadows.level2,
      shadows.level2,
      shadows.level2,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
      shadows.level3,
    ] as any,
    
    components: {
      // ═══════════════════════════════════════════════════════════════════════
      // GLOBAL OVERRIDES
      // ═══════════════════════════════════════════════════════════════════════
      
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: t.bg.primary,
            scrollbarColor: `${t.border.default} ${t.bg.secondary}`,
            '&::-webkit-scrollbar': {
              width: 8,
              height: 8,
            },
            '&::-webkit-scrollbar-track': {
              background: t.bg.secondary,
            },
            '&::-webkit-scrollbar-thumb': {
              background: t.border.default,
              borderRadius: 4,
              '&:hover': {
                background: t.border.strong,
              },
            },
          },
          '::selection': {
            backgroundColor: alpha(t.accent.secondary, 0.3),
          },
        },
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // SURFACES
      // ═══════════════════════════════════════════════════════════════════════
      
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: t.bg.surface,
            borderColor: t.border.subtle,
          },
          outlined: {
            borderColor: t.border.subtle,
          },
        },
        defaultProps: {
          elevation: 0,
        },
      },
      
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: t.bg.surface,
            border: `1px solid ${t.border.subtle}`,
            boxShadow: shadows.level1,
            transition: `box-shadow ${tokens.transition.normal}, border-color ${tokens.transition.normal}`,
            '&:hover': {
              borderColor: t.border.default,
            },
          },
        },
        defaultProps: {
          elevation: 0,
        },
      },
      
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: tokens.spacing.lg,
            '&:last-child': {
              paddingBottom: tokens.spacing.lg,
            },
          },
        },
      },
      
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: t.bg.surface,
            border: `1px solid ${t.border.subtle}`,
            boxShadow: shadows.level2,
          },
        },
      },
      
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: t.bg.secondary,
            borderColor: t.border.subtle,
          },
        },
      },
      
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: t.bg.elevated,
            border: `1px solid ${t.border.subtle}`,
            boxShadow: shadows.level1,
          },
        },
      },
      
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: t.bg.elevated,
            border: `1px solid ${t.border.subtle}`,
            boxShadow: shadows.level1,
          },
        },
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // BUTTONS
      // ═══════════════════════════════════════════════════════════════════════
      
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: tokens.typography.fontWeight.semibold,
            borderRadius: tokens.radius.md,
            padding: '8px 16px',
            transition: `all ${tokens.transition.fast}`,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
          containedPrimary: {
            backgroundColor: t.accent.primary,
            color: '#ffffff',
            '&:hover': {
              backgroundColor: t.accent.primaryHover,
            },
            '&:active': {
              backgroundColor: t.accent.primaryActive,
            },
          },
          containedSecondary: {
            backgroundColor: t.accent.secondary,
            color: mode === 'dark' ? '#0f1115' : '#1a1d23',
            '&:hover': {
              backgroundColor: t.accent.secondaryMuted,
            },
          },
          outlined: {
            borderColor: t.border.default,
            '&:hover': {
              borderColor: t.border.strong,
              backgroundColor: t.interactive.hover,
            },
          },
          outlinedPrimary: {
            borderColor: alpha(t.accent.primary, 0.5),
            color: t.accent.primary,
            '&:hover': {
              borderColor: t.accent.primary,
              backgroundColor: alpha(t.accent.primary, 0.08),
            },
          },
          text: {
            '&:hover': {
              backgroundColor: t.interactive.hover,
            },
          },
          textPrimary: {
            color: t.accent.primary,
            '&:hover': {
              backgroundColor: alpha(t.accent.primary, 0.08),
            },
          },
          sizeSmall: {
            padding: '6px 12px',
            fontSize: tokens.typography.fontSize.xs,
          },
          sizeLarge: {
            padding: '12px 24px',
            fontSize: tokens.typography.fontSize.md,
          },
        },
        defaultProps: {
          disableElevation: true,
        },
      },
      
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.md,
            transition: `all ${tokens.transition.fast}`,
            '&:hover': {
              backgroundColor: t.interactive.hover,
            },
          },
          colorPrimary: {
            '&:hover': {
              backgroundColor: alpha(t.accent.primary, 0.08),
            },
          },
        },
      },
      
      MuiFab: {
        styleOverrides: {
          root: {
            boxShadow: shadows.level1,
            '&:hover': {
              boxShadow: shadows.level2,
            },
          },
          primary: {
            backgroundColor: t.accent.primary,
            '&:hover': {
              backgroundColor: t.accent.primaryHover,
            },
          },
        },
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // INPUTS
      // ═══════════════════════════════════════════════════════════════════════
      
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: t.border.default,
                transition: `border-color ${tokens.transition.fast}`,
              },
              '&:hover fieldset': {
                borderColor: t.border.strong,
              },
              '&.Mui-focused fieldset': {
                borderColor: t.accent.primary,
                borderWidth: 1,
              },
            },
          },
        },
        defaultProps: {
          variant: 'outlined',
          size: 'small',
        },
      },
      
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.md,
            backgroundColor: mode === 'dark' ? alpha(t.bg.primary, 0.5) : t.bg.surface,
            '& fieldset': {
              borderColor: t.border.default,
            },
            '&:hover fieldset': {
              borderColor: t.border.strong,
            },
            '&.Mui-focused fieldset': {
              borderColor: t.accent.primary,
              borderWidth: 1,
            },
          },
          input: {
            padding: '10px 14px',
          },
        },
      },
      
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: t.text.secondary,
            '&.Mui-focused': {
              color: t.accent.primary,
            },
          },
        },
      },
      
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.md,
          },
        },
      },
      
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            backgroundColor: t.bg.elevated,
            border: `1px solid ${t.border.subtle}`,
          },
          option: {
            '&[aria-selected="true"]': {
              backgroundColor: t.interactive.selected,
            },
            '&:hover': {
              backgroundColor: t.interactive.hover,
            },
          },
        },
      },
      
      MuiSwitch: {
        styleOverrides: {
          root: {
            padding: 8,
          },
          switchBase: {
            '&.Mui-checked': {
              color: '#ffffff',
              '& + .MuiSwitch-track': {
                backgroundColor: t.accent.primary,
                opacity: 1,
              },
            },
          },
          track: {
            backgroundColor: t.border.strong,
            opacity: 1,
          },
          thumb: {
            boxShadow: shadows.level1,
          },
        },
      },
      
      MuiCheckbox: {
        styleOverrides: {
          root: {
            color: t.border.strong,
            '&.Mui-checked': {
              color: t.accent.primary,
            },
          },
        },
      },
      
      MuiRadio: {
        styleOverrides: {
          root: {
            color: t.border.strong,
            '&.Mui-checked': {
              color: t.accent.primary,
            },
          },
        },
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // DATA DISPLAY
      // ═══════════════════════════════════════════════════════════════════════
      
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.sm,
            fontWeight: tokens.typography.fontWeight.medium,
            fontSize: tokens.typography.fontSize.xs,
          },
          filled: {
            backgroundColor: t.interactive.selected,
          },
          outlined: {
            borderColor: t.border.default,
          },
          colorPrimary: {
            backgroundColor: alpha(t.accent.primary, 0.12),
            color: t.accent.primary,
            '&.MuiChip-outlined': {
              borderColor: alpha(t.accent.primary, 0.5),
            },
          },
          colorSecondary: {
            backgroundColor: alpha(t.accent.secondary, 0.15),
            color: mode === 'dark' ? t.accent.secondarySoft : t.accent.secondaryMuted,
          },
          colorSuccess: {
            backgroundColor: t.status.successBg,
            color: t.status.success,
          },
          colorError: {
            backgroundColor: t.status.errorBg,
            color: t.status.error,
          },
          colorWarning: {
            backgroundColor: t.status.warningBg,
            color: t.status.warning,
          },
          colorInfo: {
            backgroundColor: t.status.infoBg,
            color: t.status.info,
          },
        },
      },
      
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: t.bg.secondary,
            color: t.text.secondary,
          },
          colorDefault: {
            backgroundColor: alpha(t.accent.secondary, 0.2),
            color: t.accent.secondary,
          },
        },
      },
      
      MuiBadge: {
        styleOverrides: {
          colorPrimary: {
            backgroundColor: t.accent.primary,
          },
          colorSecondary: {
            backgroundColor: t.accent.secondary,
            color: mode === 'dark' ? '#0f1115' : '#1a1d23',
          },
        },
      },
      
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: t.bg.elevated,
            color: t.text.primary,
            border: `1px solid ${t.border.subtle}`,
            boxShadow: shadows.level1,
            fontSize: tokens.typography.fontSize.xs,
            padding: '6px 10px',
          },
          arrow: {
            color: t.bg.elevated,
            '&::before': {
              border: `1px solid ${t.border.subtle}`,
            },
          },
        },
      },
      
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.md,
            border: '1px solid',
          },
          standardSuccess: {
            backgroundColor: t.status.successBg,
            borderColor: alpha(t.status.success, 0.3),
            color: t.text.primary,
            '& .MuiAlert-icon': {
              color: t.status.success,
            },
          },
          standardError: {
            backgroundColor: t.status.errorBg,
            borderColor: alpha(t.status.error, 0.3),
            color: t.text.primary,
            '& .MuiAlert-icon': {
              color: t.status.error,
            },
          },
          standardWarning: {
            backgroundColor: t.status.warningBg,
            borderColor: alpha(t.status.warning, 0.3),
            color: t.text.primary,
            '& .MuiAlert-icon': {
              color: t.status.warning,
            },
          },
          standardInfo: {
            backgroundColor: t.status.infoBg,
            borderColor: alpha(t.status.info, 0.3),
            color: t.text.primary,
            '& .MuiAlert-icon': {
              color: t.status.info,
            },
          },
        },
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // NAVIGATION
      // ═══════════════════════════════════════════════════════════════════════
      
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: t.bg.secondary,
            borderBottom: `1px solid ${t.border.subtle}`,
            boxShadow: 'none',
          },
        },
        defaultProps: {
          elevation: 0,
        },
      },
      
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 56,
          },
        },
      },
      
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 40,
          },
          indicator: {
            backgroundColor: t.accent.primary,
            height: 2,
          },
        },
      },
      
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: tokens.typography.fontWeight.medium,
            fontSize: tokens.typography.fontSize.sm,
            minHeight: 40,
            padding: '8px 16px',
            color: t.text.secondary,
            '&.Mui-selected': {
              color: t.accent.primary,
            },
            '&:hover': {
              color: t.text.primary,
              backgroundColor: t.interactive.hover,
            },
          },
        },
      },
      
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            backgroundColor: t.bg.secondary,
            borderTop: `1px solid ${t.border.subtle}`,
          },
        },
      },
      
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            color: t.text.secondary,
            '&.Mui-selected': {
              color: t.accent.primary,
            },
          },
        },
      },
      
      MuiBreadcrumbs: {
        styleOverrides: {
          root: {
            color: t.text.secondary,
          },
          separator: {
            color: t.text.muted,
          },
        },
      },
      
      MuiLink: {
        styleOverrides: {
          root: {
            color: t.accent.primary,
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
          },
        },
      },
      
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: tokens.typography.fontSize.sm,
            padding: '8px 16px',
            '&:hover': {
              backgroundColor: t.interactive.hover,
            },
            '&.Mui-selected': {
              backgroundColor: t.interactive.selected,
              '&:hover': {
                backgroundColor: t.interactive.selected,
              },
            },
          },
        },
      },
      
      MuiListItem: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: t.interactive.hover,
            },
          },
        },
      },
      
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.md,
            '&:hover': {
              backgroundColor: t.interactive.hover,
            },
            '&.Mui-selected': {
              backgroundColor: t.interactive.selected,
              '&:hover': {
                backgroundColor: t.interactive.selected,
              },
            },
          },
        },
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // TABLES
      // ═══════════════════════════════════════════════════════════════════════
      
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.md,
            border: `1px solid ${t.border.subtle}`,
          },
        },
      },
      
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: t.bg.secondary,
          },
        },
      },
      
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: t.border.subtle,
            padding: '12px 16px',
          },
          head: {
            fontWeight: tokens.typography.fontWeight.semibold,
            color: t.text.secondary,
            fontSize: tokens.typography.fontSize.xs,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
      },
      
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: t.interactive.hover,
            },
            '&.Mui-selected': {
              backgroundColor: t.interactive.selected,
              '&:hover': {
                backgroundColor: t.interactive.selected,
              },
            },
          },
        },
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // FEEDBACK
      // ═══════════════════════════════════════════════════════════════════════
      
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius.full,
            backgroundColor: t.border.subtle,
          },
          bar: {
            borderRadius: tokens.radius.full,
          },
          colorPrimary: {
            '& .MuiLinearProgress-bar': {
              backgroundColor: t.accent.primary,
            },
          },
        },
      },
      
      MuiCircularProgress: {
        styleOverrides: {
          colorPrimary: {
            color: t.accent.primary,
          },
        },
      },
      
      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: t.border.subtle,
          },
        },
      },
      
      MuiSnackbar: {
        styleOverrides: {
          root: {
            '& .MuiPaper-root': {
              backgroundColor: t.bg.elevated,
              color: t.text.primary,
            },
          },
        },
      },
      
      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            backgroundColor: t.bg.elevated,
            color: t.text.primary,
            boxShadow: shadows.level2,
          },
        },
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // LAYOUT
      // ═══════════════════════════════════════════════════════════════════════
      
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: t.border.subtle,
          },
        },
      },
      
      MuiAccordion: {
        styleOverrides: {
          root: {
            backgroundColor: t.bg.surface,
            border: `1px solid ${t.border.subtle}`,
            '&:before': {
              display: 'none',
            },
            '&.Mui-expanded': {
              margin: 0,
            },
          },
        },
        defaultProps: {
          elevation: 0,
        },
      },
      
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: t.interactive.hover,
            },
          },
        },
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // STEPPER
      // ═══════════════════════════════════════════════════════════════════════
      
      MuiStepIcon: {
        styleOverrides: {
          root: {
            color: t.border.strong,
            '&.Mui-active': {
              color: t.accent.primary,
            },
            '&.Mui-completed': {
              color: t.status.success,
            },
          },
        },
      },
      
      MuiStepConnector: {
        styleOverrides: {
          line: {
            borderColor: t.border.default,
          },
        },
      },
      
    },
  };

  return createTheme(themeOptions);
};

// Export themed instances
export const darkTheme = createMoltboardTheme('dark');
export const lightTheme = createMoltboardTheme('light');

// Default export (dark theme for backwards compatibility)
export const theme = darkTheme;

// Export the creator function for dynamic theme switching
export { createMoltboardTheme };

// Export tokens for direct access
export { tokens } from './design-tokens';
