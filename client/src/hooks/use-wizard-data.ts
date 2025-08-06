import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-utils';
import { useCurrentEvent } from './use-current-event';

interface WizardData {
  basicInfo: any;
  ceremonies: any[];
  accommodationConfig: any;
  transportConfig: any;
  communicationConfig: any;
  progress: any;
  completionStatus: any;
}

export function useWizardData(eventId?: string | number) {
  // Use passed eventId or fall back to current event
  const { currentEvent } = useCurrentEvent();
  const resolvedEventId = eventId || currentEvent?.id;

  return useQuery({
    queryKey: ['/api/wizard-data', resolvedEventId],
    queryFn: async (): Promise<WizardData> => {
      if (!resolvedEventId) {
        return {
          basicInfo: null,
          ceremonies: [],
          accommodationConfig: null,
          transportConfig: null,
          communicationConfig: null,
          progress: null,
          completionStatus: null
        };
      }

      try {
        // Try to get event data first
        const eventResponse = await get(`/api/events/${resolvedEventId}`);
        const eventData = eventResponse.data;

        if (!eventData) {
          throw new Error('Event not found');
        }

        // Get ceremonies data using existing endpoint
        const ceremoniesResponse = await get(`/api/events/${resolvedEventId}/ceremonies`);
        const ceremonies = ceremoniesResponse.data || [];

        // Get accommodations data using existing endpoint  
        const accommodationsResponse = await get(`/api/events/${resolvedEventId}/accommodations`);
        const accommodations = accommodationsResponse.data || [];

        // Calculate progress based on actual data
        const progress = {
          basicInfoComplete: !!(eventData.title && eventData.coupleNames && eventData.brideName && eventData.groomName),
          venuesComplete: ceremonies.length > 0,
          rsvpComplete: !!eventData.rsvpDeadline,
          accommodationComplete: eventData.accommodationMode && eventData.accommodationMode !== 'none',
          transportComplete: eventData.transportMode && eventData.transportMode !== 'none',
          communicationComplete: !!(eventData.brevoApiKey || eventData.emailConfigured),
        };

        return {
          basicInfo: eventData,
          ceremonies,
          accommodationConfig: {
            accommodationMode: eventData.accommodationMode,
            accommodationInstructions: eventData.accommodationInstructions,
          },
          transportConfig: {
            transportMode: eventData.transportMode,
            transportInstructions: eventData.transportInstructions,
            transportProviderName: eventData.transportProviderName,
            transportProviderContact: eventData.transportProviderContact,
            transportProviderEmail: eventData.transportProviderEmail,
          },
          communicationConfig: {
            emailFrom: eventData.emailFrom,
            useGmail: eventData.useGmail,
            useOutlook: eventData.useOutlook,
          },
          progress,
          completionStatus: progress,
        };
      } catch (error) {
        // Silent error handling - the data is still accessible through individual API calls
        return {
          basicInfo: null,
          ceremonies: [],
          accommodationConfig: null,
          transportConfig: null,
          communicationConfig: null,
          progress: null,
          completionStatus: null
        };
      }
    },
    staleTime: 30 * 1000, // 30 seconds cache
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!resolvedEventId,
  });
}