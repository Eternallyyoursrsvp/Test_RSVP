/**
 * Accessibility Utilities for WCAG 2.1 AA Compliance
 * 
 * Provides utilities and functions to ensure the application meets
 * Web Content Accessibility Guidelines (WCAG) 2.1 AA standards.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

// Color contrast utilities
export const colorContrast = {
  /**
   * Calculate relative luminance of a color
   */
  relativeLuminance(rgb: [number, number, number]): number {
    const [r, g, b] = rgb.map(color => {
      const sRGB = color / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },

  /**
   * Calculate contrast ratio between two colors
   */
  contrastRatio(color1: [number, number, number], color2: [number, number, number]): number {
    const l1 = this.relativeLuminance(color1);
    const l2 = this.relativeLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  },

  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  },

  /**
   * Check if color combination meets WCAG AA standards
   */
  meetsWCAGAA(foreground: string, background: string, isLargeText = false): boolean {
    const fg = this.hexToRgb(foreground);
    const bg = this.hexToRgb(background);
    
    if (!fg || !bg) return false;
    
    const ratio = this.contrastRatio(fg, bg);
    return isLargeText ? ratio >= 3 : ratio >= 4.5;
  },

  /**
   * Check if color combination meets WCAG AAA standards
   */
  meetsWCAGAAA(foreground: string, background: string, isLargeText = false): boolean {
    const fg = this.hexToRgb(foreground);
    const bg = this.hexToRgb(background);
    
    if (!fg || !bg) return false;
    
    const ratio = this.contrastRatio(fg, bg);
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
};

// Focus management utilities
export const focusManagement = {
  /**
   * Trap focus within a container element
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  },

  /**
   * Get all focusable elements within a container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(selectors));
  },

  /**
   * Move focus to the next/previous focusable element
   */
  moveFocus(direction: 'next' | 'previous', container?: HTMLElement): void {
    const root = container || document.body;
    const focusableElements = this.getFocusableElements(root);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    let nextIndex: number;
    if (direction === 'next') {
      nextIndex = currentIndex === focusableElements.length - 1 ? 0 : currentIndex + 1;
    } else {
      nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    }
    
    focusableElements[nextIndex]?.focus();
  }
};

// Screen reader utilities
export const screenReader = {
  /**
   * Announce a message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.setAttribute('class', 'sr-only');
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  },

  /**
   * Create a visually hidden element for screen readers only
   */
  createScreenReaderOnly(text: string): HTMLElement {
    const element = document.createElement('span');
    element.className = 'sr-only';
    element.textContent = text;
    return element;
  }
};

// Keyboard navigation utilities
export const keyboardNavigation = {
  /**
   * Handle arrow key navigation for lists/grids
   */
  handleArrowNavigation(
    event: KeyboardEvent,
    elements: HTMLElement[],
    currentIndex: number,
    orientation: 'horizontal' | 'vertical' | 'grid' = 'vertical',
    gridColumns?: number
  ): number {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'grid') {
          newIndex = orientation === 'grid' && gridColumns 
            ? Math.max(0, currentIndex - gridColumns)
            : Math.max(0, currentIndex - 1);
          event.preventDefault();
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'grid') {
          newIndex = orientation === 'grid' && gridColumns
            ? Math.min(elements.length - 1, currentIndex + gridColumns)
            : Math.min(elements.length - 1, currentIndex + 1);
          event.preventDefault();
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'grid') {
          newIndex = Math.max(0, currentIndex - 1);
          event.preventDefault();
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'grid') {
          newIndex = Math.min(elements.length - 1, currentIndex + 1);
          event.preventDefault();
        }
        break;
      case 'Home':
        newIndex = 0;
        event.preventDefault();
        break;
      case 'End':
        newIndex = elements.length - 1;
        event.preventDefault();
        break;
    }

    if (newIndex !== currentIndex) {
      elements[newIndex]?.focus();
    }

    return newIndex;
  }
};

// ARIA utilities
export const aria = {
  /**
   * Generate a unique ID for ARIA relationships
   */
  generateId(prefix = 'a11y'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Set up ARIA relationships between elements
   */
  setRelationship(
    element: HTMLElement,
    relationshipType: 'describedby' | 'labelledby' | 'controls' | 'owns',
    targetIds: string | string[]
  ): void {
    const ids = Array.isArray(targetIds) ? targetIds.join(' ') : targetIds;
    element.setAttribute(`aria-${relationshipType}`, ids);
  },

  /**
   * Update live region content
   */
  updateLiveRegion(regionId: string, content: string, priority: 'polite' | 'assertive' = 'polite'): void {
    let region = document.getElementById(regionId);
    
    if (!region) {
      region = document.createElement('div');
      region.id = regionId;
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      document.body.appendChild(region);
    }
    
    region.textContent = content;
  }
};

// Touch and mobile accessibility utilities
export const touchAccessibility = {
  /**
   * Check if touch target meets minimum size requirements (44px x 44px)
   */
  isValidTouchTarget(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width >= 44 && rect.height >= 44;
  },

  /**
   * Add touch-friendly padding to small interactive elements
   */
  ensureTouchTarget(element: HTMLElement): void {
    if (!this.isValidTouchTarget(element)) {
      const rect = element.getBoundingClientRect();
      const paddingX = Math.max(0, (44 - rect.width) / 2);
      const paddingY = Math.max(0, (44 - rect.height) / 2);
      
      element.style.padding = `${paddingY}px ${paddingX}px`;
    }
  }
};

// React hooks for accessibility
export function useAnnouncer() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    screenReader.announce(message, priority);
  }, []);

  return announce;
}

export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const cleanup = focusManagement.trapFocus(containerRef.current);
    return cleanup;
  }, [active]);

  return containerRef;
}

export function useAriaLive(regionId: string) {
  const announce = useCallback((content: string, priority: 'polite' | 'assertive' = 'polite') => {
    aria.updateLiveRegion(regionId, content, priority);
  }, [regionId]);

  return announce;
}

export function useKeyboardNavigation<T extends HTMLElement>(
  elements: T[],
  orientation: 'horizontal' | 'vertical' | 'grid' = 'vertical',
  gridColumns?: number
) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleKeydown = useCallback((event: KeyboardEvent) => {
    const newIndex = keyboardNavigation.handleArrowNavigation(
      event,
      elements,
      currentIndex,
      orientation,
      gridColumns
    );
    setCurrentIndex(newIndex);
  }, [elements, currentIndex, orientation, gridColumns]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [handleKeydown]);

  return { currentIndex, setCurrentIndex };
}

export function useAccessibilityValidation() {
  const [violations, setViolations] = useState<string[]>([]);

  const validateColorContrast = useCallback((foreground: string, background: string, isLargeText = false) => {
    const meetsAA = colorContrast.meetsWCAGAA(foreground, background, isLargeText);
    
    if (!meetsAA) {
      const violation = `Color contrast ratio insufficient for ${isLargeText ? 'large' : 'normal'} text: ${foreground} on ${background}`;
      setViolations(prev => [...prev, violation]);
      return false;
    }
    
    return true;
  }, []);

  const validateTouchTargets = useCallback(() => {
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const violations: string[] = [];

    interactiveElements.forEach((element) => {
      if (!touchAccessibility.isValidTouchTarget(element as HTMLElement)) {
        violations.push(`Touch target too small: ${element.tagName.toLowerCase()}`);
      }
    });

    setViolations(prev => [...prev, ...violations]);
    return violations.length === 0;
  }, []);

  const clearViolations = useCallback(() => {
    setViolations([]);
  }, []);

  return {
    violations,
    validateColorContrast,
    validateTouchTargets,
    clearViolations
  };
}

// Motion and animation preferences
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// High contrast mode detection
export function useHighContrast() {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setHighContrast(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return highContrast;
}

// Error handling for accessibility
export function useAccessibilityErrorHandler() {
  const handleAccessibilityError = useCallback((error: string, element?: HTMLElement) => {
    console.error('Accessibility Error:', error);
    
    if (element) {
      element.setAttribute('aria-invalid', 'true');
      element.setAttribute('aria-describedby', 'accessibility-error');
    }

    toast({
      variant: 'destructive',
      title: 'Accessibility Issue',
      description: error,
    });
  }, []);

  return handleAccessibilityError;
}

// Export all utilities
export default {
  colorContrast,
  focusManagement,
  screenReader,
  keyboardNavigation,
  aria,
  touchAccessibility,
  useAnnouncer,
  useFocusTrap,
  useAriaLive,
  useKeyboardNavigation,
  useAccessibilityValidation,
  useReducedMotion,
  useHighContrast,
  useAccessibilityErrorHandler
};