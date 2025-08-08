/**
 * DESIGN SYSTEM EXPORTS
 * Single entry point for all design system components and utilities
 * Import everything from here to maintain consistency
 */

import * as React from 'react';

// Export design tokens
export { 
  designSystem, 
  colors, 
  typography, 
  spacing, 
  shadows, 
  borderRadius, 
  components, 
  animations,
  getColor,
  generateCSSCustomProperties 
} from './tokens';

// Export component utilities
export { 
  componentStyles, 
  buttonStyles, 
  cardStyles, 
  inputStyles, 
  navigationStyles, 
  tableStyles,
  getButtonClasses,
  getCardClasses,
  getNavItemClasses 
} from './components';

// ============================================================================
// DESIGN TOKEN UTILITIES
// Enhanced utilities that bridge existing CSS custom properties with design tokens
// ============================================================================

/**
 * Get status color classes for consistent status styling
 * Replaces hardcoded values in lib/utils.ts with semantic utilities
 */
export function getStatusColorClasses(
  status: 'success' | 'warning' | 'error' | 'info'
): string {
  const statusStyles = {
    success: "text-green-700 bg-green-100 border-green-400",
    warning: "text-yellow-700 bg-yellow-100 border-yellow-400", 
    error: "text-red-700 bg-red-100 border-red-400",
    info: "text-blue-700 bg-blue-100 border-blue-400"
  };
  
  return statusStyles[status] || statusStyles.info;
}

/**
 * Get token value with CSS custom property fallback
 * Provides access to design tokens with graceful degradation
 */
export function getTokenValue(tokenName: string, fallback?: string): string {
  return `hsl(var(--token-${tokenName}, ${fallback || 'inherit'}))`;
}

/**
 * Get brand color with CSS custom property
 * Provides consistent access to brand colors
 */
export function getBrandColor(variant: 'primary' | 'secondary'): string {
  return variant === 'primary' 
    ? 'hsl(var(--primary))' 
    : 'hsl(var(--secondary))';
}

/**
 * Get status color with token CSS custom property
 * Uses new design token properties for semantic colors
 */
export function getStatusColor(status: 'success' | 'warning' | 'error' | 'info'): string {
  return `hsl(var(--token-${status}))`;
}

/**
 * Enhanced CSS custom properties generator
 * Extends existing properties with design token coverage
 */
export function getEnhancedTokenProperties(theme: 'light' | 'dark') {
  // Import the function from tokens to avoid circular dependency
  const { generateCSSCustomProperties } = require('./tokens');
  const baseProperties = generateCSSCustomProperties(theme);
  
  // Additional token properties are now in index.css
  // This function maintains compatibility with existing generateCSSCustomProperties
  return baseProperties;
}

/**
 * Create CSS-in-JS styles from design tokens
 * For components that need programmatic styling
 */
export function generateTokenStyles(tokenMap: Record<string, string>): React.CSSProperties {
  const styles: React.CSSProperties = {};
  
  Object.entries(tokenMap).forEach(([property, tokenName]) => {
    if (tokenName.startsWith('--token-')) {
      styles[property as any] = `hsl(var(${tokenName}))`;
    } else {
      styles[property as any] = getTokenValue(tokenName);
    }
  });
  
  return styles;
}

// Re-export commonly used utilities for convenience (already exported above)

/**
 * Design system usage examples:
 * 
 * // Import tokens
 * import { colors, typography } from '@/design-system';
 * 
 * // Import component utilities
 * import { getButtonClasses, getCardClasses } from '@/design-system';
 * 
 * // Use in components
 * <button className={getButtonClasses('primary', 'md')}>
 *   Click me
 * </button>
 * 
 * <div className={getCardClasses('elevated')}>
 *   Card content
 * </div>
 */

// Default export
import { designSystem } from './tokens';
export default designSystem;