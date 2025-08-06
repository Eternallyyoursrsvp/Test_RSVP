import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-utils';

export interface FastCurrentEvent {
  id: number;
  title: string;
  coupleNames: string;
  brideName: string;
  groomName: string;
  startDate: string;
  endDate: string;
  location: string;
}

export function useFastCurrentEvent() {
  return useQuery({
    queryKey: ['/api/current-event'],
    queryFn: async (): Promise<FastCurrentEvent | null> => {
      try {
        const response = await get('/api/current-event');
        return response.data;
      } catch (error) {
        
        return null;
      }
    },
    staleTime: 60 * 1000, // 1 minute cache
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}