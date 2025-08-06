import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put, del } from "@/lib/api-utils"; // Using the consolidated API utilities
import { useToast } from "@/hooks/use-toast";
import { InsertWeddingEvent } from "@shared/schema";

export function useEvents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentEventId, setCurrentEventId] = useState<number | null>(null);

  // Get all events
  const { data: events = [], isLoading: isLoadingEvents, isError: isEventsError } = useQuery({
    queryKey: ['/api/events-direct'],
    retry: 1, // Limit retries to prevent infinite loops
    retryDelay: 1000,
    staleTime: 5000, // Cache for 5 seconds
    refetchOnWindowFocus: false, // Prevent excessive refetches
    onError: (error) => {
      // Silent error handling - no console logging
    }
  });

  // Get current event details
  const { data: currentEvent, isLoading: isLoadingCurrentEvent } = useQuery({
    queryKey: ['/api/events', currentEventId],
    enabled: !!currentEventId,
  });

  // Create event mutation using consolidated API utilities
  const createEventMutation = useMutation({
    mutationFn: async (eventData: InsertWeddingEvent) => {
      const response = await post("/api/events", eventData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      
      toast({
        title: "Event Created",
        description: "The wedding event has been successfully created. Redirecting to setup wizard...",
      });
      
      // Set a small delay before redirecting to ensure the toast is visible
      setTimeout(() => {
        window.location.href = `/event-setup-wizard/${data.id}`;
      }, 1500);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Create Event",
        description: error instanceof Error ? error.message : "An error occurred while creating the event.",
      });
    },
  });

  // Update event mutation using consolidated API utilities
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertWeddingEvent> }) => {
      const response = await put(`/api/events/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', variables.id] });
      
      toast({
        title: "Event Updated",
        description: "The wedding event has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Update Event",
        description: error instanceof Error ? error.message : "An error occurred while updating the event.",
      });
    },
  });

  // Get ceremonies for an event
  const getCeremonies = (eventId: number) => {
    return useQuery({
      queryKey: [`/api/events/${eventId}/ceremonies`],
      enabled: !!eventId,
    });
  };
  
  // Delete event mutation using consolidated API utilities
  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await del(`/api/events/${id}`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      
      toast({
        title: "Event Deleted",
        description: "The wedding event and all its related data have been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Delete Event",
        description: error instanceof Error ? error.message : "An error occurred while deleting the event.",
      });
    },
  });

  return {
    events: Array.isArray(events) ? events : [],
    isLoadingEvents,
    isEventsError,
    currentEvent,
    isLoadingCurrentEvent,
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
