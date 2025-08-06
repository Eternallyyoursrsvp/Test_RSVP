/**
 * DESIGN SYSTEM EXPORTS
 * Single entry point for all design system components and utilities
 * Import everything from here to maintain consistency
 */

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