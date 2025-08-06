import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { WeddingEvent } from "@shared/schema";
import { Plus, Trash2, MapPin, Check, Calendar } from "lucide-react";
import { ATTIRE_CODES, CEREMONY_TYPES } from "@/lib/constants";

// Define schema for a venue
const venueSchema = z.object({
  name: z.string().min(2, {
    message: "Venue name must be at least 2 characters.",
  }),
  location: z.string().min(5, {
    message: "Location must be at least 5 characters.",
  }),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  description: z.string().optional(),
  attireCode: z.string().optional(),
  ceremonyType: z.string().min(1, {
    message: "Please select a ceremony type.",
  }),
});

// Define schema for venues collection
const venuesSettingsSchema = z.object({
  venues: z.array(venueSchema).min(1, {
    message: "You must add at least one venue.",
  }),
});

// TypeScript type for the form data
type VenuesSettingsData = z.infer<typeof venuesSettingsSchema>;
type VenueData = z.infer<typeof venueSchema>;

interface VenuesStepProps {
  eventId: string;
  currentEvent: WeddingEvent | undefined;
  onComplete: (data: any) => void;
  isCompleted: boolean;
}

export default function VenuesStep({
  eventId,
  currentEvent,
  onComplete,
  isCompleted
}: VenuesStepProps) {
  const [isEditing, setIsEditing] = useState(!isCompleted);
  const [venues, setVenues] = useState<VenueData[]>([]);
  const [isAddingVenue, setIsAddingVenue] = useState(false);
  const [editingVenueIndex, setEditingVenueIndex] = useState<number | null>(null);

  // Load existing ceremonies from database
  const { data: ceremonies = [] } = useQuery<any[]>({
    queryKey: [`/api/events/${eventId}/ceremonies`],
    enabled: !!eventId,
  });

  // Convert ceremonies to venue format and populate venues state
  useEffect(() => {
    if (ceremonies.length > 0) {
      const ceremoniesAsVenues = ceremonies.map(ceremony => ({
        name: ceremony.name,
        location: ceremony.location,
        date: ceremony.date,
        startTime: ceremony.startTime,
        endTime: ceremony.endTime,
        description: ceremony.description || "",
        attireCode: ceremony.attireCode || "",
        ceremonyType: ceremony.ceremonyType || ceremony.type || "Wedding"
      }));
      setVenues(ceremoniesAsVenues);
      console.log('Loaded ceremonies as venues:', ceremoniesAsVenues);
    }
  }, [ceremonies]);
  
  // Setup form for managing venues
  const venueForm = useForm<VenueData>({
    resolver: zodResolver(venueSchema),
    defaultValues: {
      name: "",
      location: "",
      date: "",
      startTime: "",
      endTime: "",
      description: "",
      attireCode: "",
      ceremonyType: "",
    },
  });

  // Add a new venue
  const addVenue = (data: VenueData) => {
    if (editingVenueIndex !== null) {
      // Update existing venue
      const updatedVenues = [...venues];
      updatedVenues[editingVenueIndex] = data;
      setVenues(updatedVenues);
      setEditingVenueIndex(null);
    } else {
      // Add new venue
      setVenues([...venues, data]);
    }
    
    setIsAddingVenue(false);
    venueForm.reset();
  };

  // Edit an existing venue
  const editVenue = (index: number) => {
    setEditingVenueIndex(index);
    setIsAddingVenue(true);
    venueForm.reset(venues[index]);
  };

  // Remove a venue
  const removeVenue = (index: number) => {
    const updatedVenues = venues.filter((_, i) => i !== index);
    setVenues(updatedVenues);
  };

  // Save all venue settings
  const saveVenues = () => {
    if (venues.length === 0) {
      // Show error if no venues are added
      return;
    }
    
    onComplete({ venues });
    setIsEditing(false);
  };

  // If step is completed and not editing, show summary view
  if (isCompleted && !isEditing) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Event Venues</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venues.map((venue, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle>{venue.name}</CardTitle>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {venue.location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{venue.date}, {venue.startTime} - {venue.endTime}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs bg-primary/10 text-primary py-1 px-2 rounded-full">
                        {venue.ceremonyType}
                      </span>
                      {venue.attireCode && (
                        <span className="text-xs glass py-1 px-2 rounded-full border-l-purple-600 border-l-[2px]">{venue.attireCode}</span>
                      )}
                    </div>
                    {venue.description && (
                      <p className="text-muted-foreground mt-2">{venue.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <Button type="button" onClick={() => setIsEditing(true)}>
          Edit Venues
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isAddingVenue ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingVenueIndex !== null ? "Edit Venue" : "Add Venue"}</CardTitle>
            <CardDescription>
              Enter the details for this venue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...venueForm}>
              <form onSubmit={venueForm.handleSubmit(addVenue)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={venueForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Main Wedding Venue" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={venueForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Hotel Grand, Mumbai" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={venueForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={venueForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={venueForm.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={venueForm.control}
                  name="ceremonyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ceremony Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ceremony type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CEREMONY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type of ceremony that will take place at this venue
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={venueForm.control}
                  name="attireCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attire Code</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select attire code" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ATTIRE_CODES.map((code) => (
                            <SelectItem key={code} value={code}>
                              {code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The dress code for this venue/ceremony
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={venueForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add details about the venue or specific instructions..." 
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Any additional information for guests about this venue
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2 justify-end">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setIsAddingVenue(false);
                      setEditingVenueIndex(null);
                      venueForm.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingVenueIndex !== null ? "Update Venue" : "Add Venue"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Event Venues</h3>
            <Button 
              onClick={() => setIsAddingVenue(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Venue
            </Button>
          </div>
          
          {venues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venues.map((venue, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <CardTitle>{venue.name}</CardTitle>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => editVenue(index)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeVenue(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {venue.location}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{venue.date}, {venue.startTime} - {venue.endTime}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs bg-primary/10 text-primary py-1 px-2 rounded-full">
                          {venue.ceremonyType}
                        </span>
                        {venue.attireCode && (
                          <span className="text-xs glass py-1 px-2 rounded-full border-l-purple-600 border-l-[2px]">{venue.attireCode}</span>
                        )}
                      </div>
                      {venue.description && (
                        <p className="text-muted-foreground mt-2">{venue.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="glass rounded-md p-6 text-center">
              <h3 className="text-lg font-medium mb-2">No Venues Added Yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add venues for your wedding ceremonies and events.
                You can add multiple venues for different functions.
              </p>
              <Button 
                onClick={() => setIsAddingVenue(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add First Venue
              </Button>
            </div>
          )}
        </>
      )}
      
      {!isAddingVenue && venues.length > 0 && (
        <div className="flex justify-end mt-8">
          <Button onClick={saveVenues} className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Save Venues
          </Button>
        </div>
      )}
    </div>
  );
}