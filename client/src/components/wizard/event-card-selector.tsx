import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronRight, PlusCircle, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { post } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";

interface EventCardSelectorProps {
  onSelectEvent: (eventId: number) => void;
}

export default function EventCardSelector({ onSelectEvent }: EventCardSelectorProps) {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch all events with error handling
  const { data: events, isLoading, isError } = useQuery({
    queryKey: ['/api/events'],
    retry: 1, // Only retry once to avoid excessive retries
    staleTime: 5000, // Cache for 5 seconds to prevent rapid refetches
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    onError: () => {
      toast({
        title: "Couldn't retrieve events",
        description: "There was an issue loading your events. You can create your first event to get started.",
        variant: "destructive",
      });
    }
  });
  
  // Set current event mutation
  const setCurrentEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await post(`/api/current-event`, { eventId });
      return response.data;
    },
    onSuccess: (data, eventId) => {
      // After setting the current event, call the onSelectEvent prop
      onSelectEvent(eventId);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to select event",
        description: "There was an error selecting this event. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handler for when user selects an event
  const handleSelectEvent = (eventId: number) => {
    // First set this as the current event in the session
    setCurrentEventMutation.mutate(eventId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{events && Array.isArray(events) && events.length > 0 ? "Select an Event" : "No Events Found"}</CardTitle>
        <CardDescription>
          {events && Array.isArray(events) && events.length > 0 
            ? "Choose an event to configure with the Event Setup Wizard" 
            : "You haven't created any events yet. Get started by creating your first event."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        ) : isError ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Unable to load events. Create your first event to get started.</p>
            <Button 
              onClick={() => setLocation('/event-setup-wizard/new')}
              variant="default"
              size="lg"
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-5 w-5" />
              Create Your First Event
            </Button>
          </div>
        ) : events && Array.isArray(events) && events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event: any) => (
              <div 
                key={event.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {event.startDate ? format(new Date(event.startDate), 'MMM dd, yyyy') : 'No date set'}
                    </p>
                  </div>
                </div>
                
                <Button 
                  onClick={() => handleSelectEvent(event.id)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Configure
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <div className="flex items-center justify-center pt-4">
              <Button 
                variant="outline" 
                onClick={() => setLocation('/events')}
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Create New Event
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">No events found. Create a new event to get started.</p>
            <Button 
              onClick={() => setLocation('/event-setup-wizard/new')}
              variant="default"
              size="lg"
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-5 w-5" />
              Create Your First Event
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}