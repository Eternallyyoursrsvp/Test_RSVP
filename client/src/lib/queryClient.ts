import { QueryClient } from "@tanstack/react-query";
import { getQueryFn } from "./api-utils";

// Export the query client with deployment-optimized configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Use the getQueryFn from api-utils to ensure consistency
      queryFn: getQueryFn({ on401: "throw" }),
      
      // Production-optimized configuration for deployment stability
      gcTime: 10 * 60 * 1000, // 10 minutes for better caching
      staleTime: 2 * 60 * 1000, // 2 minutes fresh data window for faster navigation
      refetchOnWindowFocus: false, // Prevent unnecessary refetches for speed
      refetchOnReconnect: true, // Refetch on reconnect for consistency
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.status === 401 || error?.status === 403) return false;
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: attemptIndex => Math.min(500 * 2 ** attemptIndex, 10000),
      refetchOnMount: false, // Use cached data for faster navigation
      refetchInterval: false, // No automatic refetching
      networkMode: 'online', // Only attempt requests when online
    },
    mutations: {
      retry: 2, // Retry mutations in deployment environment
      retryDelay: attemptIndex => Math.min(500 * 2 ** attemptIndex, 5000),
      networkMode: 'online',
    },
  },
});
