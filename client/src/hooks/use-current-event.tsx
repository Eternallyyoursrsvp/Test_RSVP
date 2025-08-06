import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { post } from "@/lib/api-utils"; // Using the consolidated API utilities

export interface CurrentEvent {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  coupleNames: string;
  brideName: string;
  groomName: string;
  location: string;
  description?: string;
  // Email Communication Settings
  emailFrom?: string;
  emailReplyTo?: string;
  useGmail?: boolean;
  useOutlook?: boolean;
  useSendGrid?: boolean;
  // Gmail settings
  gmailClientId?: string;
  gmailClientSecret?: string;
  gmailRedirectUri?: string;
  gmailAccount?: string;
  gmailAccessToken?: string;
  gmailRefreshToken?: string;
  gmailTokenExpiry?: Date;
  // Outlook settings
  outlookClientId?: string;
  outlookClientSecret?: string;
  outlookRedirectUri?: string;
  outlookAccount?: string;
  outlookAccessToken?: string;
  outlookRefreshToken?: string;
  outlookTokenExpiry?: Date;
  // SendGrid settings
  sendGridApiKey?: string;
  // WhatsApp settings
  whatsappBusinessNumber?: string;
}

export function useCurrentEvent() {
  // Query to get the current event from server session
  const { 
    data: currentEvent, 
    isLoading,
    refetch: refetchCurrentEvent 
  } = useQuery<CurrentEvent>({
    queryKey: ['/api/current-event'],
    staleTime: 30 * 1000, // 30 seconds - reduced from 1 hour to catch changes more quickly
    retry: 1, // Retry once in case of initial session setup
  });
  
  // Get the currently selected event ID
  const currentEventId = currentEvent?.id;
  
  // Mutation to set the current event on the server using consolidated API utilities
  const setCurrentEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      try {
        const response = await post("/api/current-event", { eventId });
        return response.data;
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to set current event');
      }
    }
  });
  
  // Helper function to set the current event both locally and on server
  const setCurrentEvent = async (event: CurrentEvent) => {
    try {
      // First, update the server-side session
      const updatedEvent = await setCurrentEventMutation.mutateAsync(event.id);
      
      // After successful server update, clear the client cache
      // Clear all query cache to ensure no stale data remains
      queryClient.clear();
      
      // Set the updated event from server in the cache
      queryClient.setQueryData(['/api/current-event'], updatedEvent);
      
      // Invalidate and prefetch key queries for the new event context
      // Make sure these query keys match exactly what's used in components
      await Promise.all([
        // Invalidate general event queries
        queryClient.invalidateQueries({ queryKey: ['/api/events'] }),
        
        // Invalidate the current event query
        queryClient.invalidateQueries({ queryKey: ['/api/current-event'] }),
        
        // Invalidate all event-specific queries with proper format
        queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/guests`] }),
        queryClient.invalidateQueries({ queryKey: ['guests', event.id] }), // Match the key format in use-guests-by-event.tsx
        queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/ceremonies`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/accommodations`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/statistics`] })
      ]);
      
      // Force a refetch of the current event to ensure it's up to date
      await refetchCurrentEvent();
      
      // Force refetch of all active queries
      await queryClient.refetchQueries({ type: 'active' });
      
      return updatedEvent;
    } catch (error) {
      console.error('Error during event switch:', error);
      throw error;
    }
  };
  
  return {
    currentEvent,
    currentEventId,
    isLoading,
    setCurrentEvent,
    refetchCurrentEvent
  };
}