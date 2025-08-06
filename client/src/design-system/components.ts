/**
 * COMPONENT STYLE DEFINITIONS
 * Production-quality component styling based on design tokens
 * All components must reference these styles for consistency
 */

import { designSystem } from './tokens';

const { colors, typography, spacing, shadows, borderRadius, components, animations } = designSystem;

// ============================================================================
// BUTTON COMPONENT STYLES
// ============================================================================
export const buttonStyles = {
  base: {
    fontFamily: typography.fontFamily.sans.join(', '),
    fontWeight: typography.fontWeight.medium,
    borderRadius: borderRadius.md,
    transition: `all ${animations.duration.hover} ${animations.easing.easeOut}`,
    cursor: 'pointer',
    border: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    '&:focus': {
      outline: '2px solid #7A51E1',  // Exact brand purple
      outlineOffset: '2px',
      boxShadow: '0 0 0 3px rgba(122, 81, 225, 0.1)',
    },
    '&:active': {
      transform: 'scale(0.98)',
      transition: 'all 150ms cubic-bezier(0.4, 0, 1, 1)',
    },
  },
  
  variants: {
    primary: {
      light: {
        backgroundColor: colors.primary[500],
        color: colors.neutral.light.background,
        boxShadow: shadows.light.sm,
        '&:hover': {
          backgroundColor: colors.primary[600],
          boxShadow: shadows.light.md,
          transform: 'translateY(-1px)',
        }
      },
      dark: {
        backgroundColor: colors.primary[500],
        color: colors.neutral.dark.background,
        boxShadow: shadows.dark.sm,
        '&:hover': {
          backgroundColor: colors.primary[600],
          boxShadow: shadows.dark.md,
          transform: 'translateY(-1px)',
        }
      }
    },
    
    outline: {
      light: {
        backgroundColor: 'transparent',
        color: colors.primary[500],
        border: `1px solid ${colors.primary[500]}`,
        '&:hover': {
          backgroundColor: colors.primary[50],
          transform: 'translateY(-1px)',
        }
      },
      dark: {
        backgroundColor: 'transparent',
        color: colors.primary[500],
        border: `1px solid ${colors.primary[500]}`,
        '&:hover': {
          backgroundColor: colors.primary[900],
          transform: 'translateY(-1px)',
        }
      }
    },
    
    ghost: {
      light: {
        backgroundColor: 'transparent',
        color: colors.neutral.light.foreground,
        '&:hover': {
          backgroundColor: colors.neutral.light.muted,
        }
      },
      dark: {
        backgroundColor: 'transparent',
        color: colors.neutral.dark.foreground,
        '&:hover': {
          backgroundColor: colors.neutral.dark.muted,
        }
      }
    }
  },
  
  sizes: {
    sm: {
      height: components.button.height.sm,
      padding: components.button.padding.sm,
      fontSize: typography.fontSize.sm,
    },
    md: {
      height: components.button.height.md,
      padding: components.button.padding.md,
      fontSize: typography.fontSize.base,
    },
    lg: {
      height: components.button.height.lg,
      padding: components.button.padding.lg,
      fontSize: typography.fontSize.lg,
    }
  }
} as const;

// ============================================================================
// CARD COMPONENT STYLES
// ============================================================================
export const cardStyles = {
  base: {
    borderRadius: borderRadius.lg,
    border: '1px solid',
    padding: spacing[6],
    transition: 'all 150ms ease',
  },
  
  variants: {
    default: {
      light: {
        backgroundColor: colors.neutral.light.card,
        borderColor: colors.neutral.light.border,
        color: colors.neutral.light.foreground,
        boxShadow: shadows.light.sm,
        '&:hover': {
          boxShadow: shadows.light.md,
          transform: 'translateY(-2px)',
        }
      },
      dark: {
        backgroundColor: colors.neutral.dark.card,
        borderColor: colors.neutral.dark.border,
        color: colors.neutral.dark.foreground,
        boxShadow: shadows.dark.sm,
        '&:hover': {
          boxShadow: shadows.dark.md,
          transform: 'translateY(-2px)',
        }
      }
    },
    
    elevated: {
      light: {
        backgroundColor: colors.neutral.light.card,
        borderColor: colors.neutral.light.border,
        color: colors.neutral.light.foreground,
        boxShadow: shadows.light.lg,
      },
      dark: {
        backgroundColor: colors.neutral.dark.card,
        borderColor: colors.neutral.dark.border,
        color: colors.neutral.dark.foreground,
        boxShadow: shadows.dark.lg,
      }
    }
  }
} as const;

// ============================================================================
// INPUT COMPONENT STYLES
// ============================================================================
export const inputStyles = {
  base: {
    fontFamily: typography.fontFamily.sans.join(', '),
    fontSize: typography.fontSize.base,
    height: components.input.height,
    padding: components.input.padding,
    borderRadius: borderRadius.md,
    border: '1px solid',
    transition: 'all 150ms ease',
    outline: 'none',
  },
  
  states: {
    default: {
      light: {
        backgroundColor: colors.neutral.light.background,
        borderColor: colors.neutral.light.border,
        color: colors.neutral.light.foreground,
        '&:focus': {
          borderColor: colors.primary[500],
          boxShadow: `0 0 0 3px ${colors.primary[100]}`,
        }
      },
      dark: {
        backgroundColor: colors.neutral.dark.card,
        borderColor: colors.neutral.dark.border,
        color: colors.neutral.dark.foreground,
        '&:focus': {
          borderColor: colors.primary[500],
          boxShadow: `0 0 0 3px ${colors.primary[900]}`,
        }
      }
    },
    
    error: {
      light: {
        borderColor: colors.accent.error,
        '&:focus': {
          borderColor: colors.accent.error,
          boxShadow: `0 0 0 3px rgba(239, 68, 68, 0.1)`,
        }
      },
      dark: {
        borderColor: colors.accent.error,
        '&:focus': {
          borderColor: colors.accent.error,
          boxShadow: `0 0 0 3px rgba(239, 68, 68, 0.2)`,
        }
      }
    }
  }
} as const;

// ============================================================================
// NAVIGATION COMPONENT STYLES
// ============================================================================
export const navigationStyles = {
  sidebar: {
    base: {
      width: '256px', // 16rem
      height: '100vh',
      borderRight: '1px solid',
      padding: spacing[4],
      fontFamily: typography.fontFamily.sans.join(', '),
    },
    
    theme: {
      light: {
        backgroundColor: colors.neutral.light.background,
        borderColor: colors.neutral.light.border,
        color: colors.neutral.light.foreground,
      },
      dark: {
        backgroundColor: colors.neutral.dark.background,
        borderColor: colors.neutral.dark.border,
        color: colors.neutral.dark.foreground,
      }
    }
  },
  
  navItem: {
    base: {
      display: 'flex',
      alignItems: 'center',
      padding: `${spacing[2]} ${spacing[3]}`,
      borderRadius: borderRadius.md,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      textDecoration: 'none',
      transition: 'all 150ms ease',
      cursor: 'pointer',
    },
    
    states: {
      default: {
        light: {
          color: colors.neutral.light['muted-foreground'],
          '&:hover': {
            backgroundColor: colors.neutral.light.muted,
            color: colors.neutral.light.foreground,
          }
        },
        dark: {
          color: colors.neutral.dark['muted-foreground'],
          '&:hover': {
            backgroundColor: colors.neutral.dark.muted,
            color: colors.neutral.dark.foreground,
          }
        }
      },
      
      active: {
        light: {
          backgroundColor: colors.neutral.light.muted,
          color: colors.primary[500],
          borderLeft: `3px solid ${colors.primary[500]}`,
          fontWeight: typography.fontWeight.semibold,
        },
        dark: {
          backgroundColor: colors.neutral.dark.muted,
          color: colors.primary[500],
          borderLeft: `3px solid ${colors.primary[500]}`,
          fontWeight: typography.fontWeight.semibold,
        }
      }
    }
  }
} as const;

// ============================================================================
// TABLE COMPONENT STYLES
// ============================================================================
export const tableStyles = {
  container: {
    borderRadius: borderRadius.lg,
    border: '1px solid',
    overflow: 'hidden',
  },
  
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontFamily: typography.fontFamily.sans.join(', '),
    fontSize: typography.fontSize.sm,
  },
  
  header: {
    base: {
      fontWeight: typography.fontWeight.semibold,
      textAlign: 'left' as const,
      padding: spacing[3],
      borderBottom: '1px solid',
    },
    
    theme: {
      light: {
        backgroundColor: colors.neutral.light.muted,
        color: colors.neutral.light.foreground,
        borderColor: colors.neutral.light.border,
      },
      dark: {
        backgroundColor: colors.neutral.dark.muted,
        color: colors.neutral.dark.foreground,
        borderColor: colors.neutral.dark.border,
      }
    }
  },
  
  cell: {
    base: {
      padding: spacing[3],
      borderBottom: '1px solid',
    },
    
    theme: {
      light: {
        color: colors.neutral.light.foreground,
        borderColor: colors.neutral.light.border,
        '&:hover': {
          backgroundColor: colors.neutral.light.muted,
        }
      },
      dark: {
        color: colors.neutral.dark.foreground,
        borderColor: colors.neutral.dark.border,
        '&:hover': {
          backgroundColor: colors.neutral.dark.muted,
        }
      }
    }
  }
} as const;

// ============================================================================
// UTILITY FUNCTIONS FOR STYLE GENERATION
// ============================================================================

/**
 * Generate Tailwind classes for button variants
 */
export function getButtonClasses(variant: 'primary' | 'outline' | 'ghost', size: 'sm' | 'md' | 'lg' = 'md'): string {
  const baseClasses = [
    'inline-flex', 'items-center', 'justify-center',
    'font-medium', 'transition-all', 'duration-150',
    'cursor-pointer', 'border-0', 'no-underline'
  ];
  
  const sizeClasses = {
    sm: ['h-8', 'px-3', 'text-sm', 'rounded-md'],
    md: ['h-10', 'px-4', 'text-base', 'rounded-md'],
    lg: ['h-12', 'px-6', 'text-lg', 'rounded-md']
  };
  
  const variantClasses = {
    primary: [
      'bg-primary', 'text-primary-foreground',
      'shadow-sm', 'hover:bg-primary/90',
      'hover:shadow-md', 'hover:-translate-y-px'
    ],
    outline: [
      'bg-transparent', 'text-primary',
      'border', 'border-primary',
      'hover:bg-primary/10', 'hover:-translate-y-px'
    ],
    ghost: [
      'bg-transparent', 'text-foreground',
      'hover:bg-muted'
    ]
  };
  
  return [
    ...baseClasses,
    ...sizeClasses[size],
    ...variantClasses[variant]
  ].join(' ');
}

/**
 * Generate Tailwind classes for card variants
 */
export function getCardClasses(variant: 'default' | 'elevated' = 'default'): string {
  const baseClasses = [
    'rounded-lg', 'border', 'p-6',
    'transition-all', 'duration-150'
  ];
  
  const variantClasses = {
    default: [
      'bg-card', 'border-border', 'text-card-foreground',
      'shadow-sm', 'hover:shadow-md', 'hover:-translate-y-0.5'
    ],
    elevated: [
      'bg-card', 'border-border', 'text-card-foreground',
      'shadow-lg'
    ]
  };
  
  return [
    ...baseClasses,
    ...variantClasses[variant]
  ].join(' ');
}

/**
 * Generate Tailwind classes for navigation items
 */
export function getNavItemClasses(isActive: boolean = false): string {
  const baseClasses = [
    'flex', 'items-center', 'px-3', 'py-2',
    'rounded-md', 'text-sm', 'font-medium',
    'no-underline', 'transition-all', 'duration-150',
    'cursor-pointer'
  ];
  
  const stateClasses = isActive ? [
    'bg-muted', 'text-primary', 'border-l-3', 'border-primary',
    'font-semibold'
  ] : [
    'text-muted-foreground', 'hover:bg-muted', 'hover:text-foreground'
  ];
  
  return [
    ...baseClasses,
    ...stateClasses
  ].join(' ');
}

// Export all component styles
export const componentStyles = {
  button: buttonStyles,
  card: cardStyles,
  input: inputStyles,
  navigation: navigationStyles,
  table: tableStyles,
  getButtonClasses,
  getCardClasses,
  getNavItemClasses,
} as const;

export default componentStyles;