/**
 * EXAMPLE IMPLEMENTATION: Consolidated Events Hook using standardized API utilities
 * This shows how to refactor existing hooks using the consolidated API utilities
 */
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useApiQuery, useApiMutation, post, put, patch, del } from "@/lib/api-utils";

export function useEvents() {
  const [currentEventId, setCurrentEventId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch all events using standardized API query
  const { 
    data: events = [], 
    isLoading: isLoadingEvents 
  } = useApiQuery<any[]>(['/api/events']);
  
  // Get current event details
  const {
    data: currentEvent,
    isLoading: isLoadingCurrentEvent
  } = useApiQuery<any>(
    [`/api/events/${currentEventId}`],
    {
      enabled: !!currentEventId,
      on401: "returnNull" // Handle unauthorized case by returning null
    }
  );
  
  // Create event mutation with standardized error handling
  const createEventMutation = useApiMutation({
    mutationFn: async (eventData: any) => {
      const response = await post("/api/events", eventData);
      return response;
    },
    successMessage: "Event created successfully",
    errorMessage: "Failed to create event",
    invalidateQueries: ['/api/events'], // Auto-invalidate queries after success
    onSuccess: (data) => {
      // Additional success handling if needed
      setCurrentEventId(data.id);
    }
  });
  
  // Update event mutation
  const updateEventMutation = useApiMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await patch(`/api/events/${id}`, data);
      return response;
    },
    successMessage: "Event updated successfully",
    invalidateQueries: ['/api/events', `/api/events/${currentEventId}`],
  });
  
  // Delete event mutation
  const deleteEventMutation = useApiMutation({
    mutationFn: async (id: number) => {
      const response = await del(`/api/events/${id}`);
      return response;
    },
    successMessage: "Event deleted successfully",
    invalidateQueries: ['/api/events'],
    onSuccess: () => {
      // Reset current event when deleted
      if (events.length > 0 && events[0].id !== currentEventId) {
        setCurrentEventId(events[0].id);
      } else {
        setCurrentEventId(null);
      }
    }
  });
  
  // Get ceremonies for an event
  const getCeremonies = (eventId: number) => {
    return useApiQuery<any[]>([`/api/events/${eventId}/ceremonies`], {
      enabled: !!eventId,
    });
  };

  return {
    events,
    isLoadingEvents,
    currentEvent,
    isLoadingCurrentEvent,
    currentEventId,
    setCurrentEventId,
    createEvent: createEventMutation.mutate,
    isCreatingEvent: createEventMutation.isPending,
    updateEvent: updateEventMutation.mutate,
    isUpdatingEvent: updateEventMutation.isPending,
    deleteEvent: deleteEventMutation.mutate,
    isDeletingEvent: deleteEventMutation.isPending,
    getCeremonies,
  };
}