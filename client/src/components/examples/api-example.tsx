/**
 * Example component showcasing the standardized API utilities
 * This demonstrates patterns for API interaction in a component
 */
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { post } from "@/lib/api-utils";
import { useNotification } from "@/lib/notification-utils";

// Example validation schema for an event form
const eventFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  coupleNames: z.string().min(3, "Couple names must be at least 3 characters"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  location: z.string().min(3, "Location must be at least 3 characters"),
  description: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function ApiExample() {
  const [selectedEvent, setSelectedEvent] = React.useState<number | null>(null);
  const queryClient = useQueryClient();
  const notification = useNotification();
  
  // Example of using standardized query with proper loading states
  const { data: events, isLoading, error } = useQuery({
    queryKey: ["/api/events"],
    queryFn: () => fetch("/api/events").then(res => res.json()),
  });
  
  // Example mutation for creating a new event
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const response = await post("/api/events", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      notification.success({
        title: "Event Created",
        description: "The event was created successfully."
      });
    },
    onError: (error: any) => {
      notification.error({
        title: "Failed to Create Event",
        description: error.message || "An error occurred while creating the event."
      });
    }
  });

  // Example mutation for updating an existing event
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EventFormValues }) => {
      const response = await post("/api/events/manage", {
        url: `/api/events/${id}`,
        method: "PUT",
        data
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      notification.success({
        title: "Event Updated",
        description: "The event was updated successfully."
      });
    },
    onError: (error: any) => {
      notification.error({
        title: "Failed to Update Event",
        description: error.message || "An error occurred while updating the event."
      });
    }
  });
  
  // Create form setup with validation
  const createForm = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      coupleNames: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      location: "",
      description: "",
    },
  });
  
  // Edit form setup with validation
  const editForm = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      coupleNames: "",
      startDate: "",
      endDate: "",
      location: "",
      description: "",
    },
  });
  
  // Set edit form values when an event is selected
  React.useEffect(() => {
    if (selectedEvent && events) {
      const event = events.find((e: any) => e.id === selectedEvent);
      if (event) {
        editForm.reset({
          title: event.title,
          coupleNames: event.coupleNames,
          startDate: event.startDate.split("T")[0],
          endDate: event.endDate.split("T")[0],
          location: event.location,
          description: event.description || "",
        });
      }
    }
  }, [selectedEvent, events, editForm]);
  
  const onCreateSubmit = (data: EventFormValues) => {
    createEventMutation.mutate(data);
    createForm.reset();
  };
  
  const onEditSubmit = (data: EventFormValues) => {
    if (selectedEvent) {
      updateEventMutation.mutate({ id: selectedEvent, data });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md text-red-700">
        Error loading events: {(error as Error).message}
      </div>
    );
  }
  
  return (
    <Tabs defaultValue="create" className="space-y-6">
      <TabsList className="grid grid-cols-2">
        <TabsTrigger value="create">Create Event</TabsTrigger>
        <TabsTrigger value="edit">Edit Event</TabsTrigger>
      </TabsList>
      
      <TabsContent value="create" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Create New Event</CardTitle>
            <CardDescription>
              Example form using standardized API utilities and form validation.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter event title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="coupleNames"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Couple Names</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter couple names" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={createForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter event location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter event description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createEventMutation.isPending}
                >
                  {createEventMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                  ) : (
                    "Create Event"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="bg-muted/50 flex flex-col items-start text-sm text-muted-foreground">
            <p>
              This form uses the standardized API utilities for making requests and handling responses,
              with consistent loading states and error handling.
            </p>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="edit" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Edit Existing Event</CardTitle>
            <CardDescription>
              Select an event to edit using the standardized API utilities.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select Event to Edit</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedEvent || ""}
                  onChange={(e) => setSelectedEvent(Number(e.target.value) || null)}
                >
                  <option value="">-- Select an event --</option>
                  {events && events.map((event: any) => (
                    <option key={event.id} value={event.id}>
                      {event.title} ({event.coupleNames})
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedEvent ? (
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter event title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="coupleNames"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Couple Names</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter couple names" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={editForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter event location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter event description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={updateEventMutation.isPending}
                    >
                      {updateEventMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                      ) : (
                        "Update Event"
                      )}
                    </Button>
                  </form>
                </Form>
              ) : (
                <div className="p-4 border rounded-md bg-muted">
                  <p className="text-center text-muted-foreground">Select an event to edit</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 flex flex-col items-start text-sm text-muted-foreground">
            <p>
              This example demonstrates how to update an existing resource using standardized API utilities,
              with proper loading states, error handling, and cache invalidation.
            </p>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}