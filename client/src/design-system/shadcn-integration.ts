/**
 * SHADCN/UI + TAILWIND V4 + DESIGN SYSTEM INTEGRATION
 * Maps Tailwind v4 custom CSS variables to our comprehensive design token system
 */

import { designSystem } from './tokens';

// ============================================================================
// TAILWIND V4 CSS VARIABLE MAPPING
// ============================================================================

/**
 * Maps Tailwind v4 CSS variables to our design system tokens
 * Ensures consistency between shadcn/ui, Tailwind v4, and extended design tokens
 */
export const tailwindV4Mapping = {
  // Colors from Tailwind v4 Custom CSS
  brand: {
    primary: '#6b33b3',      // --primary (Eternally Yours purple)
    primaryForeground: '#ffffff', // --primary-foreground
    secondary: '#d1b981',     // --secondary (Gold accent)
    secondaryForeground: '#ffffff', // --secondary-foreground
    accent: '#9a73f9',        // --accent (Light purple)
    accentForeground: '#ffffff', // --accent-foreground
    ring: '#5e239d',          // --ring (Focus ring color)
  },
  
  // Chart colors from Tailwind v4
  charts: {
    chart1: '#5e239d',        // Primary purple
    chart2: '#8b5cf6',        // Light purple
    chart3: '#bfa76f',        // Gold
    chart4: '#713f12',        // Brown
    chart5: '#1e3a8a',        // Blue
  },
  
  // Shadows from Tailwind v4 (custom HSL-based)
  shadows: {
    // Light mode: hsl(266.2500 55.6522% 45.0980% / opacity)
    light: {
      xs: '5px 1px 16px -2px hsl(266.2500 55.6522% 45.0980% / 0.17)',
      sm: '5px 1px 16px -2px hsl(266.2500 55.6522% 45.0980% / 0.35), 5px 1px 2px -3px hsl(266.2500 55.6522% 45.0980% / 0.35)',
      md: '5px 1px 16px -2px hsl(266.2500 55.6522% 45.0980% / 0.35), 5px 2px 4px -3px hsl(266.2500 55.6522% 45.0980% / 0.35)',
      lg: '5px 1px 16px -2px hsl(266.2500 55.6522% 45.0980% / 0.35), 5px 4px 6px -3px hsl(266.2500 55.6522% 45.0980% / 0.35)',
      xl: '5px 1px 16px -2px hsl(266.2500 55.6522% 45.0980% / 0.35), 5px 8px 10px -3px hsl(266.2500 55.6522% 45.0980% / 0.35)',
      '2xl': '5px 1px 16px -2px hsl(266.2500 55.6522% 45.0980% / 0.88)',
    },
    // Dark mode: hsl(269.0164 63.5417% 37.6471% / opacity)  
    dark: {
      xs: '5px 1px 16px -2px hsl(269.0164 63.5417% 37.6471% / 0.17)',
      sm: '5px 1px 16px -2px hsl(269.0164 63.5417% 37.6471% / 0.35), 5px 1px 2px -3px hsl(269.0164 63.5417% 37.6471% / 0.35)',
      md: '5px 1px 16px -2px hsl(269.0164 63.5417% 37.6471% / 0.35), 5px 2px 4px -3px hsl(269.0164 63.5417% 37.6471% / 0.35)',
      lg: '5px 1px 16px -2px hsl(269.0164 63.5417% 37.6471% / 0.35), 5px 4px 6px -3px hsl(269.0164 63.5417% 37.6471% / 0.35)',
      xl: '5px 1px 16px -2px hsl(269.0164 63.5417% 37.6471% / 0.35), 5px 8px 10px -3px hsl(269.0164 63.5417% 37.6471% / 0.35)',
      '2xl': '5px 1px 16px -2px hsl(269.0164 63.5417% 37.6471% / 0.88)',
    }
  },
  
  // Typography from Tailwind v4
  typography: {
    fontSans: 'sans-serif',
    fontSerif: 'serif',
    fontMono: 'Inter UI, monospace',
    trackingNormal: '0.025em', // Base letter spacing
  },
  
  // Radius (0px - square design)
  radius: {
    base: '0px',             // --radius (square design choice)
    sm: 'calc(0px - 4px)',   // Calculated values maintain squareness
    md: 'calc(0px - 2px)', 
    lg: '0px',
    xl: 'calc(0px + 4px)',
  },
  
  // Spacing
  spacing: {
    base: '0.25rem',         // --spacing (4px base unit)
  }
} as const;

// ============================================================================
// DESIGN SYSTEM BRIDGE FUNCTIONS
// ============================================================================

/**
 * Gets a color value compatible with both shadcn/ui and our design system
 * Prioritizes shadcn/ui CSS variables, falls back to design tokens
 */
export function getBridgedColor(
  shadcnVar: string,
  designTokenPath?: string,
  theme: 'light' | 'dark' = 'light'
): string {
  // Return shadcn/ui CSS variable format
  if (shadcnVar.startsWith('--')) {
    return `hsl(var(${shadcnVar}))`;
  }
  
  // Fallback to design system token if provided
  if (designTokenPath) {
    return designSystem.getColor(theme, designTokenPath);
  }
  
  return `hsl(var(--${shadcnVar}))`;
}

/**
 * Gets shadow values that combine Tailwind v4 custom shadows with design system
 */
export function getBridgedShadow(
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl',
  theme: 'light' | 'dark' = 'light'
): string {
  // Use Tailwind v4 custom shadows first (they're more specific to the brand)
  const tailwindShadow = tailwindV4Mapping.shadows[theme][size];
  if (tailwindShadow) {
    return tailwindShadow;
  }
  
  // Fallback to design system shadows
  return designSystem.shadows[theme][size] || designSystem.shadows[theme].md;
}

/**
 * Gets spacing that combines Tailwind's base unit with design system scale
 */
export function getBridgedSpacing(scale: keyof typeof designSystem.spacing): string {
  return designSystem.spacing[scale];
}

/**
 * Creates theme-aware CSS custom properties for the integrated system
 */
export function generateIntegratedCSSProperties(theme: 'light' | 'dark' = 'light'): Record<string, string> {
  return {
    // Shadcn/ui + Tailwind v4 colors (these should match the custom CSS)
    '--background': theme === 'light' ? '#ffffff' : '#121212',
    '--foreground': theme === 'light' ? '#333333' : '#eaeaea',
    '--card': theme === 'light' ? '#fafafa' : '#1e1e1e',
    '--card-foreground': theme === 'light' ? '#333333' : '#eaeaea',
    '--popover': theme === 'light' ? '#ffffff' : '#1e1e1e',
    '--popover-foreground': theme === 'light' ? '#111111' : '#eaeaea',
    '--primary': theme === 'light' ? '#6b33b3' : '#5e239d',
    '--primary-foreground': '#ffffff',
    '--secondary': theme === 'light' ? '#d1b981' : '#bfa76f',
    '--secondary-foreground': theme === 'light' ? '#ffffff' : '#121212',
    '--muted': theme === 'light' ? '#d6d6d6' : '#5c5c5c',
    '--muted-foreground': theme === 'light' ? '#666666' : '#aaaaaa',
    '--accent': theme === 'light' ? '#9a73f9' : '#8350fb',
    '--accent-foreground': '#ffffff',
    '--destructive': theme === 'light' ? '#ef4444' : '#dc2626',
    '--destructive-foreground': '#ffffff',
    '--border': theme === 'light' ? '#dddddd' : '#333333',
    '--input': theme === 'light' ? '#ffffff' : '#1e1e1e',
    '--ring': '#5e239d',
    
    // Chart colors (consistent across themes)
    '--chart-1': '#5e239d',
    '--chart-2': '#8b5cf6', 
    '--chart-3': '#bfa76f',
    '--chart-4': '#713f12',
    '--chart-5': '#1e3a8a',
    
    // Sidebar
    '--sidebar': theme === 'light' ? '#f4f4f4' : '#1e1e1e',
    '--sidebar-foreground': theme === 'light' ? '#111111' : '#fdfdfd',
    '--sidebar-primary': '#5e239d',
    '--sidebar-primary-foreground': '#ffffff',
    '--sidebar-accent': '#6b7280',
    '--sidebar-accent-foreground': theme === 'light' ? '#111111' : '#fdfdfd',
    '--sidebar-border': theme === 'light' ? '#000000' : '#ffffff',
    '--sidebar-ring': '#5e239d',
    
    // Typography
    '--font-sans': 'sans-serif',
    '--font-serif': 'serif', 
    '--font-mono': 'Inter UI, monospace',
    
    // Layout
    '--radius': '0px', // Square design
    '--spacing': '0.25rem', // 4px base
    '--tracking-normal': '0.025em',
    
    // Extended design system properties
    '--z-dropdown': String(designSystem.zIndex.dropdown),
    '--z-modal': String(designSystem.zIndex.modal),
    '--z-tooltip': String(designSystem.zIndex.tooltip),
    
    // Animation durations
    '--duration-fast': designSystem.animations.duration.fast,
    '--duration-normal': designSystem.animations.duration.normal,
    '--easing-standard': designSystem.animations.easing.standard,
    
    // Extended spacing for complex layouts
    '--spacing-micro-0-5': designSystem.extendedSpacing.micro[0.5],
    '--spacing-macro-48': designSystem.extendedSpacing.macro[48],
  };
}

// ============================================================================
// UTILITY FUNCTIONS FOR COMPONENTS
// ============================================================================

/**
 * Helper for creating theme-aware styled components
 */
export function createThemedStyles(theme: 'light' | 'dark' = 'light') {
  return {
    // Primary brand colors
    primary: getBridgedColor('--primary'),
    primaryForeground: getBridgedColor('--primary-foreground'),
    
    // Background and surfaces
    background: getBridgedColor('--background'),
    foreground: getBridgedColor('--foreground'),
    card: getBridgedColor('--card'),
    cardForeground: getBridgedColor('--card-foreground'),
    
    // Interactive elements  
    border: getBridgedColor('--border'),
    input: getBridgedColor('--input'),
    ring: getBridgedColor('--ring'),
    
    // Shadows using Tailwind v4 custom shadows
    shadowSm: getBridgedShadow('sm', theme),
    shadowMd: getBridgedShadow('md', theme),
    shadowLg: getBridgedShadow('lg', theme),
    
    // Extended tokens for complex components
    zModal: designSystem.zIndex.modal,
    zTooltip: designSystem.zIndex.tooltip,
    animationDuration: designSystem.animations.duration.normal,
    
    // Spacing using design system
    spacingXs: designSystem.spacing[1],
    spacingSm: designSystem.spacing[2], 
    spacingMd: designSystem.spacing[4],
    spacingLg: designSystem.spacing[6],
    spacingXl: designSystem.spacing[8],
  };
}

/**
 * Validates that a CSS variable exists in our integrated system
 */
export function validateCSSVariable(variable: string): boolean {
  const validVariables = [
    // Shadcn/ui standard variables
    '--background', '--foreground', '--card', '--card-foreground',
    '--popover', '--popover-foreground', '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
    '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
    '--border', '--input', '--ring', '--radius',
    
    // Chart variables
    '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
    
    // Sidebar variables
    '--sidebar', '--sidebar-foreground', '--sidebar-primary', '--sidebar-primary-foreground',
    '--sidebar-accent', '--sidebar-accent-foreground', '--sidebar-border', '--sidebar-ring',
    
    // Typography
    '--font-sans', '--font-serif', '--font-mono', '--tracking-normal',
    
    // Extended design system variables (prefix check)
    '--shadow-', '--z-', '--duration-', '--spacing-',
  ];
  
  return validVariables.some(valid => 
    variable === valid || 
    (valid.endsWith('-') && variable.startsWith(valid))
  );
}

// Export the integrated design system
export const integratedDesignSystem = {
  ...designSystem,
  tailwindV4: tailwindV4Mapping,
  getBridgedColor,
  getBridgedShadow, 
  getBridgedSpacing,
  generateIntegratedCSSProperties,
  createThemedStyles,
  validateCSSVariable,
} as const;

export default integratedDesignSystem;