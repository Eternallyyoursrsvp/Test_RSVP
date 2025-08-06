// Performance utilities for optimizing app speed
import React, { useCallback, useMemo } from 'react';

// Debounce function for reducing API calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Memoized debounce hook
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  return useCallback(debounce(callback, delay), [callback, delay]);
}

// Optimized query key factory
export const queryKeys = {
  events: {
    all: ['events'] as const,
    current: ['events', 'current'] as const,
    byId: (id: string) => ['events', id] as const,
    dashboard: (id: string) => ['events', id, 'dashboard'] as const,
  },
  guests: {
    all: ['guests'] as const,
    byEvent: (eventId: string) => ['guests', 'event', eventId] as const,
    byId: (id: string) => ['guests', id] as const,
  },
  auth: {
    user: ['auth', 'user'] as const,
    status: ['auth', 'status'] as const,
  }
} as const;

// Performance monitoring
export function measurePerformance<T>(name: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  if (end - start > 100) { // Log slow operations
    console.log(`PERF: ${name} took ${(end - start).toFixed(2)}ms`);
  }
  
  return result;
}

// Lazy component loader with better error handling  
export function createLazyComponent(importFn: () => Promise<{ default: React.ComponentType<any> }>) {
  return React.lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.error('Failed to load component:', error);
      // Return a fallback component
      return {
        default: () => React.createElement('div', { 
          className: 'p-4 text-center text-muted-foreground' 
        }, 'Failed to load component. Please refresh.')
      };
    }
  });
}

// Memory management for large data sets
export function createVirtualizedQuery<T>(data: T[], pageSize = 50) {
  return useMemo(() => {
    if (!data) return { items: [], hasMore: false };
    
    const items = data.slice(0, pageSize);
    const hasMore = data.length > pageSize;
    
    return { items, hasMore };
  }, [data, pageSize]);
}