/**
 * Example hook showcasing the standardized API utilities
 * This demonstrates patterns for API interaction using the consolidated utilities
 */
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  get, 
  post, 
  patch, 
  put,
  del
} from "@/lib/api-utils";
import { queryKeys } from "@/lib/query-keys";
import { useNotification } from "@/lib/notification-utils";

// Example type for event data
interface Event {
  id: number;
  title: string;
  coupleNames: string;
  startDate: string;
  endDate: string;
  location: string;
  description?: string;
}

// Example type for creating a new event
interface CreateEventData {
  title: string;
  coupleNames: string;
  startDate: string;
  endDate: string;
  location: string;
  description?: string;
}

/**
 * Example hook for event management using standardized API utilities
 */
export function useEventManagement(eventId?: number) {
  const notification = useNotification();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Fetch all events (using raw API request function)
  const { 
    data: events,
    isLoading: isLoadingEvents,
    error: eventsError
  } = useQuery({
    queryKey: [ApiEndpoints.EVENTS.BASE],
    queryFn: async () => {
      const response = await get<Event[]>(ApiEndpoints.EVENTS.BASE);
      return response.data;
    }
  });
  
  // Fetch a single event (using shorthand get function)
  const {
    data: event,
    isLoading: isLoadingEvent,
    error: eventError
  } = useQuery({
    queryKey: [ApiEndpoints.EVENTS.DETAILS(eventId || 0)],
    queryFn: async () => {
      if (!eventId) return null;
      const response = await get<Event>(ApiEndpoints.EVENTS.DETAILS(eventId));
      return response.data;
    },
    enabled: !!eventId
  });
  
  // Create a new event (using apiOperations.create)
  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEventData) => {
      return apiOperations.create<CreateEventData, Event>(ApiEndpoints.EVENTS.BASE, data);
    },
    onSuccess: (data) => {
      notification.createOperation(true, `Event "${data.title}" created successfully.`);
      invalidateRelatedQueries(ApiEndpoints.EVENTS.BASE);
    },
    onError: (error: any) => {
      notification.createOperation(false, error.message || "Failed to create event.");
    }
  });
  
  // Update an event (using shorthand patch function)
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Event> }) => {
      const response = await patch<Event>(ApiEndpoints.EVENTS.DETAILS(id), data);
      return response.data;
    },
    onSuccess: (data) => {
      notification.updateOperation(true, `Event "${data.title}" updated successfully.`);
      invalidateRelatedQueries(ApiEndpoints.EVENTS.BASE, data.id);
    },
    onError: (error: any) => {
      notification.updateOperation(false, error.message || "Failed to update event.");
    }
  });
  
  // Delete an event (using apiOperations.delete)
  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => {
      return apiOperations.delete(ApiEndpoints.EVENTS.BASE, id);
    },
    onSuccess: () => {
      notification.deleteOperation(true, "Event deleted successfully.");
      invalidateRelatedQueries(ApiEndpoints.EVENTS.BASE);
    },
    onError: (error: any) => {
      notification.deleteOperation(false, error.message || "Failed to delete event.");
    }
  });
  
  // Example of a custom API request with pagination
  const loadMoreEvents = async (page: number, limit: number = 10) => {
    try {
      setIsLoadingMore(true);
      
      const response = await get<Event[]>(ApiEndpoints.EVENTS.BASE, {
        page,
        limit
      });
      
      setIsLoadingMore(false);
      return response.data;
    } catch (error: any) {
      setIsLoadingMore(false);
      notification.error({
        title: "Failed to load more events",
        description: error.message || "An error occurred while loading more events."
      });
      throw error;
    }
  };
  
  // Example of sending a test email
  const sendTestEmailMutation = useMutation({
    mutationFn: async ({ eventId, email }: { eventId: number, email: string }) => {
      const response = await post(ApiEndpoints.COMMUNICATIONS.TEST_EMAIL, {
        eventId,
        email
      });
      return response.data;
    },
    onSuccess: () => {
      notification.success({
        title: "Test Email Sent",
        description: "The test email was sent successfully."
      });
    },
    onError: (error: any) => {
      notification.error({
        title: "Email Sending Failed",
        description: error.message || "Failed to send test email."
      });
    }
  });
  
  return {
    // Queries
    events,
    isLoadingEvents,
    eventsError,
    event,
    isLoadingEvent,
    eventError,
    
    // Mutations
    createEvent: createEventMutation.mutate,
    isCreatingEvent: createEventMutation.isPending,
    updateEvent: updateEventMutation.mutate,
    isUpdatingEvent: updateEventMutation.isPending,
    deleteEvent: deleteEventMutation.mutate,
    isDeletingEvent: deleteEventMutation.isPending,
    sendTestEmail: sendTestEmailMutation.mutate,
    isSendingTestEmail: sendTestEmailMutation.isPending,
    
    // Custom functions
    loadMoreEvents,
    isLoadingMore
  };
}