/**
 * MASTER DESIGN SYSTEM TOKENS
 * Single source of truth for all styling in the application
 * Follow this file for all color, typography, spacing, and component styling
 */

// ============================================================================
// COLOR PALETTE - Luxury Wedding Theme
// ============================================================================
export const colors = {
  // Primary Brand Colors - Exact specification #7A51E1
  primary: {
    50: '#f8f5ff',   // Very light purple tint
    100: '#f0ebff',  // Light purple tint  
    200: '#e1d7ff',  // Soft purple
    300: '#c9b8ff',  // Medium light purple
    400: '#a78bff',  // Medium purple
    500: '#7A51E1',  // Main brand purple (exact hex)
    600: '#6941c7',  // Darker purple
    700: '#5832a3',  // Deep purple
    800: '#472680',  // Very deep purple
    900: '#3b1f67',  // Darkest purple
  },
  
  // Secondary Brand Colors - Exact specification #E3C76F  
  secondary: {
    50: '#fefdf8',   // Very light gold tint
    100: '#fdf9ed',  // Light gold tint
    200: '#fbf2d5',  // Soft gold
    300: '#f7e8b5',  // Medium light gold
    400: '#f0d988',  // Medium gold
    500: '#E3C76F',  // Main brand gold (exact hex)
    600: '#d4b054',  // Darker gold
    700: '#b0923e',  // Deep gold
    800: '#8f7533',  // Very deep gold
    900: '#765f2d',  // Darkest gold
  },
  
  // Exact background colors from specification
  background: {
    light: '#FFFFFF',  // Pure white
    dark: '#121212',   // Deep charcoal (exact hex)
  },
  
  // Neutral Colors - iOS-inspired clean grays
  neutral: {
    // Light Mode
    light: {
      background: '#FFFFFF',     // Pure white background
      foreground: '#1F1F1F',     // Near black text
      card: '#FFFFFF',           // Card backgrounds
      border: '#E5E7EB',         // Light gray borders
      muted: '#F9FAFB',          // Very light gray for muted areas
      'muted-foreground': '#6B7280', // Medium gray for secondary text
    },
    
    // Dark Mode  
    dark: {
      background: '#121212',     // Deep charcoal (exact specification)
      foreground: '#FAFAFA',     // Clean white text
      card: '#1E1E1E',           // Dark card backgrounds
      border: '#2A2A2A',         // Dark gray borders
      muted: '#262626',          // Muted dark areas
      'muted-foreground': '#A3A3A3', // Light gray for secondary text
    }
  },
  
  // Status & accent colors
  accent: {
    success: '#22c55e', // Green for success states
    warning: '#f59e0b', // Amber for warning states
    error: '#ef4444',   // Red for error states
    info: '#3b82f6',    // Blue for info states
  },
  
  // Hover overlay colors
  overlay: {
    light: 'rgba(122, 81, 225, 0.06)',  // Purple tint for light mode
    dark: 'rgba(255, 255, 255, 0.04)',  // White tint for dark mode
  },
} as const;

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================
export const typography = {
  // Font Families
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],      // Clean, modern UI font
    serif: ['Cormorant Garamond', 'serif'],          // Elegant decorative font
  },
  
  // Font Sizes (rem units for scalability)
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  
  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Line Heights
  lineHeight: {
    tight: '1.1',
    normal: '1.5',
    relaxed: '1.75',
  }
} as const;

// ============================================================================
// SPACING SYSTEM (8px grid)
// ============================================================================
export const spacing = {
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
} as const;

// ============================================================================
// SHADOW SYSTEM
// ============================================================================
export const shadows = {
  // Light Mode Shadows
  light: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.07)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  },
  
  // Dark Mode Shadows
  dark: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
  }
} as const;

// ============================================================================
// BORDER RADIUS SYSTEM
// ============================================================================
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px - Standard for cards/buttons
  lg: '0.75rem',   // 12px - Large cards
  xl: '1rem',      // 16px - Hero sections
  full: '9999px',  // Pills and circular elements
} as const;

// ============================================================================
// COMPONENT-SPECIFIC TOKENS
// ============================================================================
export const components = {
  // Button Styles
  button: {
    height: {
      sm: '2rem',      // 32px
      md: '2.5rem',    // 40px
      lg: '3rem',      // 48px
    },
    padding: {
      sm: '0.5rem 0.75rem',
      md: '0.75rem 1rem',
      lg: '1rem 1.5rem',
    },
    borderRadius: borderRadius.md,
    fontWeight: typography.fontWeight.medium,
  },
  
  // Card Styles
  card: {
    padding: spacing[6],           // 24px
    borderRadius: borderRadius.lg, // 12px
    borderWidth: '1px',
    shadow: shadows.light.md,
  },
  
  // Input Styles
  input: {
    height: '2.5rem',              // 40px
    padding: '0.5rem 0.75rem',     // 8px 12px
    borderRadius: borderRadius.md,  // 8px
    borderWidth: '1px',
  }
} as const;

// ============================================================================
// ANIMATION & TRANSITIONS - COMPREHENSIVE TOKEN SYSTEM
// ============================================================================
export const animations = {
  // Transition Durations
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    hover: '200ms',
    modal: '300ms',
    focus: '150ms',
    tooltip: '100ms',
    dropdown: '250ms',
    slide: '350ms',
    fade: '200ms',
  },
  
  // Easing Functions
  easing: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    easeOut: 'ease-out',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1.0)',
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
  },
  
  // Transform Effects
  transforms: {
    hoverScale: 'scale(1.02)',
    hoverScaleLarge: 'scale(1.05)',
    activeScale: 'scale(0.98)',
    hoverTranslate: 'translateY(-1px)',
    hoverTranslateLarge: 'translateY(-2px)',
    rotate90: 'rotate(90deg)',
    rotate180: 'rotate(180deg)',
    rotateNeg90: 'rotate(-90deg)',
  },
  
  // Common Hover Effects
  hover: {
    scale: 'scale(1.02)',
    scaleLarge: 'scale(1.05)',
    shadow: shadows.light.lg,
    translate: 'translateY(-1px)',
    translateLarge: 'translateY(-2px)',
  },
  
  // Keyframe Definitions
  keyframes: {
    fadeIn: 'fadeIn',
    fadeOut: 'fadeOut',
    slideUp: 'slideUp',
    slideDown: 'slideDown',
    slideLeft: 'slideLeft',
    slideRight: 'slideRight',
    bounce: 'bounce',
    spin: 'spin',
    pulse: 'pulse',
    ping: 'ping',
  }
} as const;

// ============================================================================
// Z-INDEX MANAGEMENT SYSTEM
// ============================================================================
export const zIndex = {
  // Base layers
  base: 1,
  content: 10,
  sticky: 100,
  fixed: 200,
  
  // Interactive elements
  dropdown: 1000,
  tooltip: 1100,
  modal: 1200,
  popover: 1300,
  notification: 1400,
  
  // Top-level overlays
  loader: 9000,
  debug: 9900,
  max: 9999,
} as const;

// ============================================================================
// BREAKPOINT SYSTEM - MOBILE FIRST
// ============================================================================
export const breakpoints = {
  // Pixel values for reference
  values: {
    xs: 0,     // Mobile devices
    sm: 640,   // Small tablets
    md: 768,   // Tablets
    lg: 1024,  // Small laptops
    xl: 1280,  // Desktops
    xxl: 1536, // Large desktops
  },
  
  // CSS media queries
  up: {
    xs: '@media (min-width: 0px)',
    sm: '@media (min-width: 640px)',
    md: '@media (min-width: 768px)',
    lg: '@media (min-width: 1024px)',
    xl: '@media (min-width: 1280px)',
    xxl: '@media (min-width: 1536px)',
  },
  
  // Container max widths
  containers: {
    xs: '100%',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    xxl: '1536px',
  }
} as const;

// ============================================================================
// GRID & LAYOUT SYSTEM
// ============================================================================
export const grid = {
  // Grid columns
  columns: {
    default: 12,
    mobile: 4,
    tablet: 8,
    desktop: 12,
  },
  
  // Grid gaps
  gap: {
    xs: '0.5rem',   // 8px
    sm: '1rem',     // 16px
    md: '1.5rem',   // 24px
    lg: '2rem',     // 32px
    xl: '3rem',     // 48px
  },
  
  // Container widths
  container: {
    xs: '100%',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    xxl: '1536px',
  },
  
  // Layout utilities
  layout: {
    sidebarWidth: '280px',
    sidebarWidthCollapsed: '64px',
    headerHeight: '64px',
    footerHeight: '80px',
  }
} as const;

// ============================================================================
// EXTENDED SPACING SYSTEM - MICRO TO MACRO
// ============================================================================
export const extendedSpacing = {
  // Micro spacing (sub-pixel and small adjustments)
  micro: {
    0.5: '0.125rem',  // 2px - Fine adjustments
    1.5: '0.375rem',  // 6px - Between standard units
    2.5: '0.625rem',  // 10px
    3.5: '0.875rem',  // 14px
    4.5: '1.125rem',  // 18px
    5.5: '1.375rem',  // 22px
    6.5: '1.625rem',  // 26px
    7: '1.75rem',     // 28px
    7.5: '1.875rem',  // 30px
  },
  
  // Macro spacing (large layouts)
  macro: {
    28: '7rem',    // 112px
    32: '8rem',    // 128px
    36: '9rem',    // 144px
    40: '10rem',   // 160px
    44: '11rem',   // 176px
    48: '12rem',   // 192px
    52: '13rem',   // 208px
    56: '14rem',   // 224px
    60: '15rem',   // 240px
    64: '16rem',   // 256px
    72: '18rem',   // 288px
    80: '20rem',   // 320px
    96: '24rem',   // 384px
  }
} as const;

// ============================================================================
// TYPOGRAPHY - EXTENDED SCALE & PROPERTIES
// ============================================================================
export const extendedTypography = {
  // Extended font sizes
  fontSize: {
    '2xs': '0.625rem',  // 10px
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
    '7xl': '4.5rem',    // 72px
    '8xl': '6rem',      // 96px
    '9xl': '8rem',      // 128px
  },
  
  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
  
  // Text decoration
  textDecoration: {
    none: 'none',
    underline: 'underline',
    overline: 'overline',
    lineThrough: 'line-through',
  }
} as const;

// ============================================================================
// BORDER SYSTEM - COMPREHENSIVE
// ============================================================================
export const borders = {
  // Border widths
  width: {
    0: '0',
    1: '1px',
    2: '2px',
    3: '3px',
    4: '4px',
    8: '8px',
  },
  
  // Border styles
  style: {
    none: 'none',
    solid: 'solid',
    dashed: 'dashed',
    dotted: 'dotted',
    double: 'double',
    groove: 'groove',
    ridge: 'ridge',
  },
  
  // Border radius (extended from existing)
  radius: {
    none: '0',
    xs: '0.125rem',   // 2px
    sm: '0.25rem',    // 4px
    md: '0.5rem',     // 8px - Standard for cards/buttons
    lg: '0.75rem',    // 12px - Large cards
    xl: '1rem',       // 16px - Hero sections
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
    full: '9999px',   // Pills and circular elements
  }
} as const;

// ============================================================================
// OPACITY & ALPHA SYSTEM
// ============================================================================
export const opacity = {
  0: '0',
  5: '0.05',
  10: '0.1',
  15: '0.15',
  20: '0.2',
  25: '0.25',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  75: '0.75',
  80: '0.8',
  90: '0.9',
  95: '0.95',
  100: '1',
} as const;

// ============================================================================
// COMPONENT STATE TOKENS
// ============================================================================
export const componentStates = {
  // Form states
  form: {
    default: {
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      textColor: '#1F1F1F',
    },
    hover: {
      borderColor: '#D1D5DB',
      backgroundColor: '#F9FAFB',
    },
    focus: {
      borderColor: '#7A51E1',
      backgroundColor: '#FFFFFF',
      ringColor: 'rgba(122, 81, 225, 0.1)',
    },
    error: {
      borderColor: '#EF4444',
      backgroundColor: '#FEF2F2',
      textColor: '#DC2626',
    },
    disabled: {
      borderColor: '#E5E7EB',
      backgroundColor: '#F3F4F6',
      textColor: '#9CA3AF',
      opacity: '0.6',
    },
  },
  
  // Button states
  button: {
    primary: {
      default: { bg: '#7A51E1', text: '#FFFFFF' },
      hover: { bg: '#6941C7', text: '#FFFFFF' },
      active: { bg: '#5832A3', text: '#FFFFFF' },
      disabled: { bg: '#E5E7EB', text: '#9CA3AF' },
    },
    secondary: {
      default: { bg: '#E3C76F', text: '#1F1F1F' },
      hover: { bg: '#D4B054', text: '#1F1F1F' },
      active: { bg: '#B0923E', text: '#1F1F1F' },
      disabled: { bg: '#E5E7EB', text: '#9CA3AF' },
    },
    ghost: {
      default: { bg: 'transparent', text: '#1F1F1F' },
      hover: { bg: '#F9FAFB', text: '#1F1F1F' },
      active: { bg: '#F3F4F6', text: '#1F1F1F' },
      disabled: { bg: 'transparent', text: '#9CA3AF' },
    },
  },
  
  // Card states
  card: {
    default: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E5E7EB',
      shadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },
    hover: {
      backgroundColor: '#FFFFFF',
      borderColor: '#D1D5DB',
      shadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
      transform: 'translateY(-1px)',
    },
    active: {
      backgroundColor: '#F9FAFB',
      borderColor: '#7A51E1',
      shadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },
  },
  
  // Table states
  table: {
    header: {
      backgroundColor: '#F9FAFB',
      textColor: '#1F1F1F',
      borderColor: '#E5E7EB',
    },
    row: {
      default: { backgroundColor: '#FFFFFF', textColor: '#1F1F1F' },
      hover: { backgroundColor: '#F9FAFB', textColor: '#1F1F1F' },
      selected: { backgroundColor: '#F8F5FF', textColor: '#1F1F1F' },
    },
  }
} as const;

// ============================================================================
// FOCUS & INTERACTION STATES
// ============================================================================
export const focusStates = {
  // Focus Ring Configuration - Updated with exact brand colors
  focusRing: {
    width: '2px',
    color: '#7A51E1', // Exact brand purple
    offset: '2px',
    shadow: '0 0 0 3px rgba(122, 81, 225, 0.1)',
    style: 'solid',
  },
  
  // Ring Colors and Thickness
  rings: {
    primary: {
      width: '3px',
      color: '#7A51E1',  // Exact brand purple
      opacity: '0.1',
    },
    secondary: {
      width: '2px', 
      color: '#E3C76F',  // Exact brand gold
      opacity: '0.15',
    },
  },
  
  // Interactive States - iOS 18 inspired
  states: {
    hover: {
      transform: 'scale(1.05)',  // Slightly more pronounced
      transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      shadowStep: 'md-to-lg',
    },
    focus: {
      outline: '2px solid #7A51E1',  // Exact brand purple
      outlineOffset: '2px',
      boxShadow: '0 0 0 3px rgba(122, 81, 225, 0.1)',
      transition: 'all 150ms ease-out',
    },
    active: {
      transform: 'scale(0.98)',
      transition: 'all 150ms cubic-bezier(0.4, 0, 1, 1)',
    },
  }
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get color value by theme and path
 * @param theme - 'light' | 'dark'
 * @param colorPath - Path to color (e.g., 'primary.500', 'neutral.light.background')
 */
export function getColor(theme: 'light' | 'dark', colorPath: string): string {
  const paths = colorPath.split('.');
  let value: any = colors;
  
  for (const path of paths) {
    value = value?.[path];
  }
  
  // Handle neutral colors with theme-specific values
  if (colorPath.startsWith('neutral.') && !colorPath.includes('.light.') && !colorPath.includes('.dark.')) {
    const neutralPath = colorPath.replace('neutral.', '');
    return colors.neutral[theme]?.[neutralPath as keyof typeof colors.neutral.light] || value;
  }
  
  return value || colorPath;
}

/**
 * Generate CSS custom properties for the design system
 */
export function generateCSSCustomProperties(theme: 'light' | 'dark'): Record<string, string> {
  const themeColors = colors.neutral[theme];
  
  return {
    // Color properties
    '--color-background': themeColors.background,
    '--color-foreground': themeColors.foreground,
    '--color-card': themeColors.card,
    '--color-border': themeColors.border,
    '--color-muted': themeColors.muted,
    '--color-muted-foreground': themeColors['muted-foreground'],
    '--color-primary': colors.primary[500],
    '--color-secondary': colors.secondary[500],
    '--color-success': colors.accent.success,
    '--color-warning': colors.accent.warning,
    '--color-error': colors.accent.error,
    '--color-info': colors.accent.info,
    
    // Typography properties
    '--font-family-sans': typography.fontFamily.sans.join(', '),
    '--font-family-serif': typography.fontFamily.serif.join(', '),
    
    // Spacing properties
    '--spacing-unit': '0.25rem', // 4px base unit
    
    // Shadow properties
    '--shadow-sm': shadows[theme].sm,
    '--shadow-md': shadows[theme].md,
    '--shadow-lg': shadows[theme].lg,
    '--shadow-xl': shadows[theme].xl,
    
    // Border radius properties (legacy - maintained for compatibility)
    '--border-radius-sm': borderRadius.sm,
    '--border-radius-md': borderRadius.md,
    '--border-radius-lg': borderRadius.lg,
    '--border-radius-xl': borderRadius.xl,
  };
}

// ============================================================================
// ENHANCED CSS CUSTOM PROPERTIES GENERATOR
// ============================================================================

/**
 * Generate comprehensive CSS custom properties for the design system
 * Now includes all token categories for 100+ token coverage
 */
export function generateComprehensiveCSSCustomProperties(theme: 'light' | 'dark'): Record<string, string> {
  const themeColors = colors.neutral[theme];
  const themeShadows = shadows[theme];
  
  return {
    // Existing color properties
    '--color-background': themeColors.background,
    '--color-foreground': themeColors.foreground,
    '--color-card': themeColors.card,
    '--color-border': themeColors.border,
    '--color-muted': themeColors.muted,
    '--color-muted-foreground': themeColors['muted-foreground'],
    '--color-primary': colors.primary[500],
    '--color-secondary': colors.secondary[500],
    '--color-success': colors.accent.success,
    '--color-warning': colors.accent.warning,
    '--color-error': colors.accent.error,
    '--color-info': colors.accent.info,
    
    // Z-index properties
    '--z-dropdown': String(zIndex.dropdown),
    '--z-tooltip': String(zIndex.tooltip),
    '--z-modal': String(zIndex.modal),
    '--z-popover': String(zIndex.popover),
    '--z-notification': String(zIndex.notification),
    
    // Animation properties
    '--duration-fast': animations.duration.fast,
    '--duration-normal': animations.duration.normal,
    '--duration-slow': animations.duration.slow,
    '--duration-hover': animations.duration.hover,
    '--easing-standard': animations.easing.standard,
    '--easing-bounce': animations.easing.bounce,
    
    // Grid properties
    '--grid-gap-sm': grid.gap.sm,
    '--grid-gap-md': grid.gap.md,
    '--grid-gap-lg': grid.gap.lg,
    '--container-sm': grid.container.sm,
    '--container-md': grid.container.md,
    '--container-lg': grid.container.lg,
    '--container-xl': grid.container.xl,
    
    // Extended spacing
    '--spacing-micro-0-5': extendedSpacing.micro[0.5],
    '--spacing-micro-1-5': extendedSpacing.micro[1.5],
    '--spacing-micro-2-5': extendedSpacing.micro[2.5],
    '--spacing-macro-28': extendedSpacing.macro[28],
    '--spacing-macro-32': extendedSpacing.macro[32],
    '--spacing-macro-40': extendedSpacing.macro[40],
    '--spacing-macro-48': extendedSpacing.macro[48],
    
    // Typography properties
    '--font-family-sans': typography.fontFamily.sans.join(', '),
    '--font-family-serif': typography.fontFamily.serif.join(', '),
    '--font-size-2xs': extendedTypography.fontSize['2xs'],
    '--font-size-5xl': extendedTypography.fontSize['5xl'],
    '--font-size-6xl': extendedTypography.fontSize['6xl'],
    '--letter-spacing-tight': extendedTypography.letterSpacing.tight,
    '--letter-spacing-wide': extendedTypography.letterSpacing.wide,
    
    // Border properties
    '--border-width-1': borders.width[1],
    '--border-width-2': borders.width[2],
    '--border-width-4': borders.width[4],
    '--border-radius-xs': borders.radius.xs,
    '--border-radius-2xl': borders.radius['2xl'],
    '--border-radius-3xl': borders.radius['3xl'],
    
    // Shadow properties
    '--shadow-sm': themeShadows.sm,
    '--shadow-md': themeShadows.md,
    '--shadow-lg': themeShadows.lg,
    '--shadow-xl': themeShadows.xl,
    
    // Opacity properties
    '--opacity-5': opacity[5],
    '--opacity-10': opacity[10],
    '--opacity-25': opacity[25],
    '--opacity-50': opacity[50],
    '--opacity-75': opacity[75],
    '--opacity-90': opacity[90],
    
    // Component state properties
    '--form-border-default': componentStates.form.default.borderColor,
    '--form-border-focus': componentStates.form.focus.borderColor,
    '--form-border-error': componentStates.form.error.borderColor,
    '--button-primary-bg': componentStates.button.primary.default.bg,
    '--button-primary-hover': componentStates.button.primary.hover.bg,
    '--card-shadow-default': componentStates.card.default.shadow,
    '--card-shadow-hover': componentStates.card.hover.shadow,
    
    // Layout properties
    '--sidebar-width': grid.layout.sidebarWidth,
    '--sidebar-width-collapsed': grid.layout.sidebarWidthCollapsed,
    '--header-height': grid.layout.headerHeight,
    '--footer-height': grid.layout.footerHeight,
  };
}

// Export design system as default
export const designSystem = {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
  components,
  animations,
  focusStates,
  // New comprehensive token categories
  zIndex,
  breakpoints,
  grid,
  extendedSpacing,
  extendedTypography,
  borders,
  opacity,
  componentStates,
  // Utility functions
  getColor,
  generateCSSCustomProperties,
  generateComprehensiveCSSCustomProperties,
} as const;

export default designSystem;