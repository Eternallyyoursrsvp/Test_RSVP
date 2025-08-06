import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-utils';
import { useCurrentEvent } from './use-current-event';

interface TravelDataResponse {
  travelGuests: any[];
  airportReps: any[];
  travelSettings: any;
  statistics: {
    totalGuests: number;
    withFlightInfo: number;
    confirmed: number;
    pending: number;
    needsAssistance: number;
    completionRate: number;
  };
}

export function useTravelData() {
  const { currentEvent } = useCurrentEvent();
  const eventId = currentEvent?.id;

  return useQuery({
    queryKey: ['/api/events', eventId, 'travel-batch'],
    queryFn: async (): Promise<TravelDataResponse> => {
      if (!eventId) {
        return {
          travelGuests: [],
          airportReps: [],
          travelSettings: {},
          statistics: {
            totalGuests: 0,
            withFlightInfo: 0,
            confirmed: 0,
            pending: 0,
            needsAssistance: 0,
            completionRate: 0
          }
        };
      }

      try {
        const response = await get(`/api/events/${eventId}/travel-batch`);
        return response.data;
      } catch (error) {
        
        return {
          travelGuests: [],
          airportReps: [],
          travelSettings: {},
          statistics: {
            totalGuests: 0,
            withFlightInfo: 0,
            confirmed: 0,
            pending: 0,
            needsAssistance: 0,
            completionRate: 0
          }
        };
      }
    },
    staleTime: 30 * 1000, // 30 seconds cache
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!eventId,
  });
}