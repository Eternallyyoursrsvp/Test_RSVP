import { useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';

export function useQueryParams() {
  const [location] = useLocation();
  
  // Parse the current URL's query parameters
  const params = useMemo(() => {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;
    
    // Convert searchParams to a regular object
    const params: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    
    return params;
  }, [location]);
  
  // Helper function to update a single query parameter
  const setParam = useCallback((key: string, value: string | null) => {
    const url = new URL(window.location.href);
    
    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
    
    window.history.replaceState({}, '', url.toString());
  }, []);
  
  return {
    ...params,
    setParam
  };
}