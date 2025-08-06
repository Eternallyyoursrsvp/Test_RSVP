/**
 * EXAMPLE IMPLEMENTATION: Consolidated Events Hook using standardized API utilities
 * This shows how to refactor existing hooks using the consolidated API utilities
 */
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { post, put, patch, del, get } from "@/lib/api-utils";
import { queryClient } from "@/lib/queryClient";

export function useEvents() {
  const [currentEventId, setCurrentEventId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch all events using standardized API query
  const { 
    data: eventsResponse,
    isLoading: isLoadingEvents 
  } = useQuery({
    queryKey: ['/api/events'],
    queryFn: async () => get<any[]>('/api/events')
  });
  const events = eventsResponse?.data || [];
  
  // Get current event details
  const {
    data: currentEventResponse,
    isLoading: isLoadingCurrentEvent
  } = useQuery({
    queryKey: [`/api/events/${currentEventId}`],
    queryFn: async () => {
      if (!currentEventId) return null;
      return get<any>(`/api/events/${currentEventId}`);
    },
    enabled: !!currentEventId
  });
  const currentEvent = currentEventResponse?.data;
  
  // Create event mutation with standardized error handling
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await post("/api/events", eventData);
      return response;
    },
    onSuccess: (response) => {
      toast({
        title: "Event created successfully",
        description: "The event has been created."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      if (response.data?.id) {
        setCurrentEventId(response.data.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create event", 
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });
  
  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await patch(`/api/events/${id}`, data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Event updated successfully",
        description: "The event has been updated."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      if (currentEventId) {
        queryClient.invalidateQueries({ queryKey: [`/api/events/${currentEventId}`] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update event",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });
  
  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await del(`/api/events/${id}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Event deleted successfully",
        description: "The event has been deleted."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      // Reset current event when deleted
      if (events.length > 0 && events[0].id !== currentEventId) {
        setCurrentEventId(events[0].id);
      } else {
        setCurrentEventId(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete event",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });
  
  // Get ceremonies for current event
  const {
    data: ceremoniesResponse,
    isLoading: isLoadingCeremonies
  } = useQuery({
    queryKey: [`/api/events/${currentEventId}/ceremonies`],
    queryFn: async () => {
      if (!currentEventId) return null;
      return get<any[]>(`/api/events/${currentEventId}/ceremonies`);
    },
    enabled: !!currentEventId
  });
  const ceremonies = ceremoniesResponse?.data || [];

  return {
    events,
    isLoadingEvents,
    currentEvent,
    isLoadingCurrentEvent,
    currentEventId,
    setCurrentEventId,
    ceremonies,
    isLoadingCeremonies,
    createEvent: createEventMutation.mutate,
    isCreatingEvent: createEventMutation.isPending,
    updateEvent: updateEventMutation.mutate,
    isUpdatingEvent: updateEventMutation.isPending,
    deleteEvent: deleteEventMutation.mutate,
    isDeletingEvent: deleteEventMutation.isPending
  };
}