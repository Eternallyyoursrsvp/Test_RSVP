/**
 * Example component showcasing the standardized API utilities
 * This demonstrates the preferred patterns for API interaction
 */
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiEndpoints, invalidateRelatedQueries, apiOperations } from "@/lib/api-utils";
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
import { useToast } from "@/hooks/use-toast";

// Import the consolidated API utilities
import { 
  post, 
  get, 
  put,
  del
} from "@/lib/api-utils";
import { queryKeys } from "@/lib/query-keys";

// Example schema for an event
const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  coupleNames: z.string().min(3, "Couple names must be at least 3 characters"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  location: z.string().min(3, "Location must be at least 3 characters"),
  description: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

// Mock event data type
interface Event {
  id: number;
  title: string;
  coupleNames: string;
  startDate: string;
  endDate: string;
  location: string;
  description?: string;
}

export function ApiUtilsExample() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("get");
  
  // EXAMPLE 1: Basic GET request using useQuery
  const {
    data: events,
    isLoading: isLoadingEvents,
    error: eventsError
  } = useQuery({
    queryKey: [ApiEndpoints.EVENTS.BASE],
  });
  
  // EXAMPLE 2: GET request with parameters
  const {
    data: filteredEvents,
    isLoading: isLoadingFiltered
  } = useQuery({
    queryKey: [ApiEndpoints.EVENTS.BASE, { status: "active", limit: 5 }],
    enabled: activeTab === "get-params"
  });
  
  // EXAMPLE 3: Create mutation using post
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const response = await post<Event>(ApiEndpoints.EVENTS.BASE, data);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Event Created",
        description: `Event "${data.title}" was created successfully.`,
      });
      invalidateRelatedQueries(ApiEndpoints.EVENTS.BASE);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    }
  });
  
  // EXAMPLE 4: Using apiOperations for higher-level resource operations
  const updateEventMutation = useMutation({
    mutationFn: async (data: { id: number, event: Partial<EventFormValues> }) => {
      return apiOperations.update<Partial<EventFormValues>, Event>(
        ApiEndpoints.EVENTS.BASE, 
        data.id, 
        data.event
      );
    },
    onSuccess: (data) => {
      toast({
        title: "Event Updated",
        description: `Event "${data.title}" was updated successfully.`,
      });
    }
  });
  
  // Initialize form with default values
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      coupleNames: "",
      startDate: "",
      endDate: "",
      location: "",
      description: ""
    }
  });
  
  // Handle form submission
  function onSubmit(values: EventFormValues) {
    if (activeTab === "create") {
      createEventMutation.mutate(values);
    } else {
      updateEventMutation.mutate({ id: 1, event: values });
    }
  }
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>API Utilities Examples</CardTitle>
        <CardDescription>
          Examples showcasing the standardized API utilities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="get" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="get">GET Request</TabsTrigger>
            <TabsTrigger value="get-params">GET with Params</TabsTrigger>
            <TabsTrigger value="create">Create (POST)</TabsTrigger>
            <TabsTrigger value="update">Update (PATCH)</TabsTrigger>
          </TabsList>
          
          {/* GET Example */}
          <TabsContent value="get">
            <Card>
              <CardHeader>
                <CardTitle>Fetch Events</CardTitle>
                <CardDescription>
                  Using useQuery with the basic queryKey pattern
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingEvents ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : eventsError ? (
                  <div className="p-4 text-destructive">
                    Error: {(eventsError as Error).message}
                  </div>
                ) : (
                  <pre className="p-4 bg-muted rounded-md overflow-auto">
                    {JSON.stringify(events, null, 2)}
                  </pre>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-start">
                <p className="text-sm text-muted-foreground mb-2">Code example:</p>
                <pre className="p-2 bg-muted rounded-md text-xs w-full overflow-auto">
{`// Basic GET request using useQuery
const { data: events } = useQuery({
  queryKey: [ApiEndpoints.EVENTS.BASE],
});`}
                </pre>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* GET with Params Example */}
          <TabsContent value="get-params">
            <Card>
              <CardHeader>
                <CardTitle>Fetch with Parameters</CardTitle>
                <CardDescription>
                  Using useQuery with parameters in the queryKey
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingFiltered ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <pre className="p-4 bg-muted rounded-md overflow-auto">
                    {JSON.stringify(filteredEvents, null, 2)}
                  </pre>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-start">
                <p className="text-sm text-muted-foreground mb-2">Code example:</p>
                <pre className="p-2 bg-muted rounded-md text-xs w-full overflow-auto">
{`// GET request with parameters
const { data: filteredEvents } = useQuery({
  queryKey: [ApiEndpoints.EVENTS.BASE, { status: "active", limit: 5 }],
});`}
                </pre>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Create (POST) Example */}
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Create Event</CardTitle>
                <CardDescription>
                  Using useMutation with post utility
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
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
                        control={form.control}
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
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
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
                        control={form.control}
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
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter event description" 
                              className="min-h-[100px]" 
                              {...field} 
                            />
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
                      {createEventMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Event
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex flex-col items-start">
                <p className="text-sm text-muted-foreground mb-2">Code example:</p>
                <pre className="p-2 bg-muted rounded-md text-xs w-full overflow-auto">
{`// Create mutation using post
const createEventMutation = useMutation({
  mutationFn: async (data: EventFormValues) => {
    const response = await post<Event>(ApiEndpoints.EVENTS.BASE, data);
    return response.data;
  },
  onSuccess: (data) => {
    toast({
      title: "Event Created",
      description: \`Event "\${data.title}" was created successfully.\`,
    });
    invalidateRelatedQueries(ApiEndpoints.EVENTS.BASE);
  }
});`}
                </pre>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Update (PATCH) Example */}
          <TabsContent value="update">
            <Card>
              <CardHeader>
                <CardTitle>Update Event</CardTitle>
                <CardDescription>
                  Using apiOperations.update utility
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Form fields are the same as create, so we'll reuse them */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
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
                        control={form.control}
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
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
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
                        control={form.control}
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
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter event description" 
                              className="min-h-[100px]" 
                              {...field} 
                            />
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
                      {updateEventMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Update Event
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex flex-col items-start">
                <p className="text-sm text-muted-foreground mb-2">Code example:</p>
                <pre className="p-2 bg-muted rounded-md text-xs w-full overflow-auto">
{`// Using apiOperations for higher-level resource operations
const updateEventMutation = useMutation({
  mutationFn: async (data: { id: number, event: Partial<EventFormValues> }) => {
    return apiOperations.update<Partial<EventFormValues>, Event>(
      ApiEndpoints.EVENTS.BASE, 
      data.id, 
      data.event
    );
  },
  onSuccess: (data) => {
    toast({
      title: "Event Updated",
      description: \`Event "\${data.title}" was updated successfully.\`,
    });
  }
});`}
                </pre>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}