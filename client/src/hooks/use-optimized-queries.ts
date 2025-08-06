// Optimized query hooks for better performance across the app
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-utils";

// Optimized dashboard data hook with batch endpoint
export function useOptimizedDashboard(eventId?: number) {
  return useQuery({
    queryKey: ['dashboard-batch', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      
      // Use new batch endpoint for maximum performance - single API call
      const response = await get(`/api/events/${eventId}/dashboard-batch`);
      return response.data;
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Use cached data for faster navigation
  });
}

// Optimized guest list with pagination and filtering
export function useOptimizedGuests(eventId?: number, page = 1, filters = {}) {
  return useQuery({
    queryKey: ['guests', eventId, page, filters],
    queryFn: async () => {
      if (!eventId) return { guests: [], total: 0, stats: null };
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50', // Pagination for performance
        ...filters
      });
      
      // Get guests and stats in parallel
      const [guestsResponse, statsResponse] = await Promise.all([
        get(`/api/events/${eventId}/guests?${params}`),
        get(`/api/events/${eventId}/guest-stats`)
      ]);
      
      return {
        guests: guestsResponse.data || [],
        total: guestsResponse.total || 0,
        stats: statsResponse.data
      };
    },
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes for guest data
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true, // Smooth pagination
  });
}

// Optimized current event hook with aggressive caching
export function useOptimizedCurrentEvent() {
  return useQuery({
    queryKey: ['current-event'],
    queryFn: () => get('/api/events/current'),
    staleTime: 10 * 60 * 1000, // 10 minutes - events don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Lightweight stats hook for sidebar and quick views
export function useOptimizedStats(eventId?: number) {
  return useQuery({
    queryKey: ['stats', eventId],
    queryFn: () => eventId ? get(`/api/events/${eventId}/stats`) : null,
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}