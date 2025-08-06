import { useLocation } from 'wouter';
import { useCallback, useMemo } from 'react';

export function useQueryParams(): Record<string, string> {
  const [location] = useLocation();
  
  return useMemo(() => {
    const searchParams = new URLSearchParams(
      location.includes('?') ? location.split('?')[1] : ''
    );
    
    const params: Record<string, string> = {};
    // Convert iterator to array first to avoid downlevelIteration issues
    Array.from(searchParams.entries()).forEach(([key, value]) => {
      params[key] = value;
    });
    
    return params;
  }, [location]);
}

export function useUpdateQueryParams() {
  const [, setLocation] = useLocation();
  const params = useQueryParams();
  
  return useCallback(
    (updates: Record<string, string | null>) => {
      const searchParams = new URLSearchParams();
      
      // Copy existing params
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, value);
      });
      
      // Update with new values
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          searchParams.delete(key);
        } else {
          searchParams.set(key, value);
        }
      });
      
      const search = searchParams.toString();
      const [pathname] = window.location.pathname.split('?');
      setLocation(`${pathname}${search ? `?${search}` : ''}`);
    },
    [params, setLocation]
  );
}