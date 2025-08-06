import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ROOM_TYPES, BED_TYPES } from "@/lib/constants";
import { Plus, Trash2, Check, Hotel, Edit, MapPin, Phone, Globe, Mail, Bed, Users } from "lucide-react";
import { WeddingEvent } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Define accommodation provision modes
const PROVISION_MODES = {
  NONE: "none",
  BLOCK: "block_booking",
  BOOK: "direct_booking"
};

// Define attachment schema
const attachmentSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  type: z.enum(["file", "link"]),
  description: z.string().optional(),
});

// Define schema for a hotel
const hotelSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, {
    message: "Hotel name must be at least 2 characters.",
  }),
  location: z.string().min(5, {
    message: "Location must be at least 5 characters.",
  }),
  description: z.string().optional(),
  website: z.string().url({
    message: "Please enter a valid URL.",
  }).optional().or(z.literal("")),
  contactEmail: z.string().email({
    message: "Please enter a valid email address.",
  }).optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  amenities: z.string().optional(),
  bookingInstructions: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
});

// Define schema for a room type
const roomTypeSchema = z.object({
  id: z.string().optional(),
  hotelId: z.string(),
  name: z.string().min(2, {
    message: "Room type name must be at least 2 characters.",
  }),
  bedType: z.enum(["single", "double", "queen", "king", "twin", "sofa_bed"]),
  maxOccupancy: z.number().min(1, {
    message: "Maximum occupancy must be at least 1.",
  }),
  totalRooms: z.number().min(1, {
    message: "Total number of rooms must be at least 1.",
  }),
  negotiatedRate: z.string().optional(),
  currency: z.string().optional(),
  specialFeatures: z.string().optional(),
  description: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
  brochureUrl: z.string().optional(),
  photosUrl: z.string().optional(),
});

// TypeScript types
type Hotel = z.infer<typeof hotelSchema>;
type RoomType = z.infer<typeof roomTypeSchema>;

// Define schema for accommodation settings
const accommodationSettingsSchema = z.object({
  accommodationMode: z.enum([
    PROVISION_MODES.NONE,
    PROVISION_MODES.BLOCK,
    PROVISION_MODES.BOOK
  ]),
  enableAutoAllocation: z.boolean().optional(),
  enableGuestRoomPreferences: z.boolean().optional(),
  allocationStrategy: z.enum(["family", "individual", "hybrid"]).optional(),
  hotels: z.array(hotelSchema).optional(),
  roomTypes: z.array(roomTypeSchema).optional(),
  currency: z.string().optional(),
  showPricing: z.boolean().optional(),
  accommodationAttachmentUrl: z.string().optional(),
  accommodationSpecialDeals: z.string().optional(),
  accommodationInstructions: z.string().optional(),
});

// TypeScript type for the form data
type AccommodationSettingsData = z.infer<typeof accommodationSettingsSchema>;

interface HotelsStepProps {
  eventId: string;
  currentEvent: WeddingEvent | undefined;
  onComplete: (data: AccommodationSettingsData) => void;
  isCompleted: boolean;
}

export default function HotelsStep({
  eventId,
  currentEvent,
  onComplete,
  isCompleted
}: HotelsStepProps) {
  const [isEditing, setIsEditing] = useState(!isCompleted);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [isHotelDialogOpen, setIsHotelDialogOpen] = useState(false);
  const [isRoomTypeDialogOpen, setIsRoomTypeDialogOpen] = useState(false);
  const { toast } = useToast();

  // Set up form with default values - MUST be declared before useEffect
  const form = useForm<AccommodationSettingsData>({
    resolver: zodResolver(accommodationSettingsSchema),
    defaultValues: {
      accommodationMode: PROVISION_MODES.BLOCK,
      enableAutoAllocation: true,
      enableGuestRoomPreferences: true,
      allocationStrategy: "family",
      hotels: [],
      roomTypes: [],
    },
  });

  // Fetch existing hotels from database
  const { data: existingHotels, isLoading: hotelsLoading } = useQuery({
    queryKey: ['hotels', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/hotels/by-event/${eventId}`);
      if (!response.ok) throw new Error('Failed to fetch hotels');
      return response.json();
    },
    enabled: !!eventId
  });

  // Fetch existing accommodations from database
  const { data: existingAccommodations, isLoading: accommodationsLoading } = useQuery({
    queryKey: ['accommodations', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/accommodations`);
      if (!response.ok) throw new Error('Failed to fetch accommodations');
      return response.json();
    },
    enabled: !!eventId
  });

  // Initialize hotels and room types from database when data loads - consistent with other wizard steps
  useEffect(() => {
    if (existingHotels && existingHotels.length > 0) {
      const mappedHotels = existingHotels.map((hotel: any) => ({
        id: hotel.id.toString(),
        name: hotel.name,
        location: hotel.address || '',
        description: hotel.description || '',
        website: hotel.website || '',
        contactEmail: '',
        contactPhone: hotel.phone || '',
        amenities: hotel.amenities || '',
        bookingInstructions: hotel.bookingInstructions || '',
        attachments: []
      }));
      setHotels(mappedHotels);
    }
  }, [existingHotels]);

  useEffect(() => {
    if (existingAccommodations && existingAccommodations.length > 0) {
      const mappedRoomTypes = existingAccommodations.map((acc: any) => ({
        id: acc.id.toString(),
        hotelId: acc.hotelId?.toString() || '',
        name: acc.name,
        bedType: acc.bedType || 'double',
        maxOccupancy: acc.maxOccupancy || acc.capacity || 2,
        totalRooms: acc.totalRooms,
        negotiatedRate: acc.pricePerNight || '',
        currency: 'INR',
        specialFeatures: acc.specialFeatures || '',
        description: '',
        attachments: []
      }));
      setRoomTypes(mappedRoomTypes);
    }
  }, [existingAccommodations]);

  // Populate form with current event data when available - consistent useEffect + form.reset() pattern
  useEffect(() => {
    if (currentEvent && !hotelsLoading && !accommodationsLoading) {
      form.reset({
        accommodationMode: currentEvent.accommodationMode || PROVISION_MODES.BLOCK,
        enableAutoAllocation: currentEvent.enableAutoAllocation ?? true,
        enableGuestRoomPreferences: currentEvent.enableGuestRoomPreferences ?? true,
        allocationStrategy: currentEvent.allocationStrategy || "family",
        hotels: hotels,
        roomTypes: roomTypes,
        currency: currentEvent.currency || 'INR',
        showPricing: currentEvent.showPricing ?? false,
        accommodationAttachmentUrl: currentEvent.accommodationAttachmentUrl || '',
        accommodationSpecialDeals: currentEvent.accommodationSpecialDeals || '',
        accommodationInstructions: currentEvent.accommodationInstructions || '',
      });
    }
  }, [currentEvent, hotelsLoading, accommodationsLoading, hotels, roomTypes, form]);

  // Hotel form
  const hotelForm = useForm<Hotel>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      name: "",
      location: "",
      description: "",
      website: "",
      contactEmail: "",
      contactPhone: "",
      amenities: "",
      bookingInstructions: "",
      attachments: [],
    },
  });

  // Room type form
  const roomTypeForm = useForm<RoomType>({
    resolver: zodResolver(roomTypeSchema),
    defaultValues: {
      hotelId: "",
      name: "",
      bedType: "double",
      maxOccupancy: 2,
      totalRooms: 1,
      negotiatedRate: "",
      currency: "USD",
      specialFeatures: "",
      description: "",
      attachments: [],
      brochureUrl: "",
      photosUrl: "",
    },
  });

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Add or update hotel
  const handleHotelSubmit = (data: Hotel) => {
    if (editingHotel) {
      // Update existing hotel
      setHotels(prev => prev.map(h => h.id === editingHotel.id ? { ...data, id: editingHotel.id } : h));
      toast({
        title: "Hotel Updated",
        description: `${data.name} has been updated successfully.`,
      });
    } else {
      // Add new hotel
      const newHotel = { ...data, id: generateId() };
      setHotels(prev => [...prev, newHotel]);
      toast({
        title: "Hotel Added",
        description: `${data.name} has been added successfully.`,
      });
    }
    
    setIsHotelDialogOpen(false);
    setEditingHotel(null);
    hotelForm.reset();
  };

  // Add or update room type
  const handleRoomTypeSubmit = (data: RoomType) => {
    if (editingRoomType) {
      // Update existing room type
      setRoomTypes(prev => prev.map(rt => rt.id === editingRoomType.id ? { ...data, id: editingRoomType.id } : rt));
      toast({
        title: "Room Type Updated",
        description: `${data.name} has been updated successfully.`,
      });
    } else {
      // Add new room type
      const newRoomType = { ...data, id: generateId() };
      setRoomTypes(prev => [...prev, newRoomType]);
      toast({
        title: "Room Type Added",
        description: `${data.name} has been added successfully.`,
      });
    }
    
    setIsRoomTypeDialogOpen(false);
    setEditingRoomType(null);
    roomTypeForm.reset();
  };

  // Edit hotel
  const handleEditHotel = (hotel: Hotel) => {
    setEditingHotel(hotel);
    hotelForm.reset(hotel);
    setIsHotelDialogOpen(true);
  };

  // Edit room type
  const handleEditRoomType = (roomType: RoomType) => {
    setEditingRoomType(roomType);
    roomTypeForm.reset(roomType);
    setIsRoomTypeDialogOpen(true);
  };

  // Delete hotel
  const handleDeleteHotel = (hotelId: string) => {
    setHotels(prev => prev.filter(h => h.id !== hotelId));
    // Also remove room types for this hotel
    setRoomTypes(prev => prev.filter(rt => rt.hotelId !== hotelId));
    toast({
      title: "Hotel Deleted",
      description: "The hotel and its room types have been removed.",
    });
  };

  // Delete room type
  const handleDeleteRoomType = (roomTypeId: string) => {
    setRoomTypes(prev => prev.filter(rt => rt.id !== roomTypeId));
    toast({
      title: "Room Type Deleted",
      description: "The room type has been removed.",
    });
  };

  // Get hotel name by ID
  const getHotelName = (hotelId: string) => {
    const hotel = hotels.find(h => h.id === hotelId);
    return hotel?.name || "Unknown Hotel";
  };

  function onSubmit(data: AccommodationSettingsData) {
    // Include the hotels, room types, and current form values in the data
    const finalData = {
      ...data,
      hotels,
      roomTypes,
      currency: data.currency, // Ensure currency is included
      enableAutoAllocation: data.enableAutoAllocation,
      showPricing: data.showPricing,
      accommodationMode: data.accommodationMode,
      accommodationAttachmentUrl: data.accommodationAttachmentUrl,
      accommodationSpecialDeals: data.accommodationSpecialDeals,
      accommodationInstructions: data.accommodationInstructions,
    };
    
    // Submit hotel and room type data
    
    // Complete the step (which will trigger the save)
    onComplete(finalData);
    
    // Exit editing mode after successful completion
    setIsEditing(false);
  }

  // If step is completed and not editing, show summary view
  if (isCompleted && !isEditing) {
    const data = form.getValues();
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Accommodation Settings Summary</CardTitle>
            <CardDescription>Current configuration for guest accommodation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-medium">Accommodation Mode:</span>
                <span className="col-span-2 capitalize">{data.accommodationMode.replace('_', ' ')}</span>
              </div>
              
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-medium">Auto Allocation:</span>
                <span className="col-span-2">{data.enableAutoAllocation ? "Enabled" : "Disabled"}</span>
              </div>
              
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-medium">Guest Preferences:</span>
                <span className="col-span-2">{data.enableGuestRoomPreferences ? "Enabled" : "Disabled"}</span>
              </div>
              
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-medium">Allocation Strategy:</span>
                <span className="col-span-2 capitalize">{data.allocationStrategy}</span>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-medium">Hotels Configured:</span>
                <span className="col-span-2">{hotels.length}</span>
              </div>
              
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="font-medium">Room Types:</span>
                <span className="col-span-2">{roomTypes.length}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="button" onClick={() => setIsEditing(true)}>
              Edit Accommodation Settings
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Main editing interface
  return (
    <div className="space-y-6">
      {/* Accommodation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Accommodation Configuration</CardTitle>
          <CardDescription>
            Configure how accommodation will be handled for your wedding guests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="accommodationMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accommodation Mode</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select accommodation mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={PROVISION_MODES.NONE}>No Accommodation</SelectItem>
                        <SelectItem value={PROVISION_MODES.BLOCK}>Block Booking</SelectItem>
                        <SelectItem value={PROVISION_MODES.BOOK}>Direct Booking</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose how accommodation will be managed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("accommodationMode") !== PROVISION_MODES.NONE && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="enableAutoAllocation"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Auto Allocation</FormLabel>
                            <FormDescription>
                              Automatically allocate rooms to guests
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="enableGuestRoomPreferences"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Guest Preferences</FormLabel>
                            <FormDescription>
                              Allow guests to specify room preferences
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.watch("enableAutoAllocation") && (
                    <FormField
                      control={form.control}
                      name="allocationStrategy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Allocation Strategy</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select allocation strategy" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="family">Family Groups</SelectItem>
                              <SelectItem value="individual">Individual Guests</SelectItem>
                              <SelectItem value="hybrid">Hybrid Approach</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How rooms should be allocated to guests
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* Hotels Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5" />
            Hotels ({hotels.length})
          </CardTitle>
          <CardDescription>
            Add and manage hotels for your wedding guests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {hotels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Hotel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hotels added yet</p>
                <p className="text-sm">Add hotels where your guests can stay</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {hotels.map((hotel) => (
                  <Card key={hotel.id} className="relative">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg">{hotel.name}</h3>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm">{hotel.location}</span>
                          </div>
                          {hotel.description && (
                            <p className="text-sm text-muted-foreground">{hotel.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {hotel.contactPhone && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {hotel.contactPhone}
                              </Badge>
                            )}
                            {hotel.contactEmail && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {hotel.contactEmail}
                              </Badge>
                            )}
                            {hotel.website && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Website
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditHotel(hotel)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Hotel</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {hotel.name}? This will also remove all room types for this hotel.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteHotel(hotel.id!)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Dialog open={isHotelDialogOpen} onOpenChange={setIsHotelDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Hotel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingHotel ? "Edit Hotel" : "Add New Hotel"}</DialogTitle>
                <DialogDescription>
                  {editingHotel ? "Update hotel information" : "Add a new hotel for guest accommodation"}
                </DialogDescription>
              </DialogHeader>
              <Form {...hotelForm}>
                <form onSubmit={hotelForm.handleSubmit(handleHotelSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={hotelForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hotel Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Grand Hyatt" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={hotelForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Address or location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={hotelForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Brief description of the hotel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={hotelForm.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 234 567 8900" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={hotelForm.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input placeholder="reservations@hotel.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={hotelForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://hotel-website.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={hotelForm.control}
                    name="amenities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amenities</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Pool, spa, fitness center, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />



                  <FormField
                    control={hotelForm.control}
                    name="bookingInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Booking Instructions</FormLabel>
                        <FormControl>
                          <Textarea placeholder="How guests should book rooms" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium text-lg">Hotel Attachments & Links</h4>
                    <p className="text-sm text-muted-foreground">
                      Add brochures, location maps, or other hotel information for guest communications
                    </p>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Hotel Brochure URL</label>
                        <Input placeholder="https://hotel.com/brochure.pdf" />
                        <p className="text-xs text-muted-foreground">Link to hotel brochure or information packet</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Virtual Tour / Photos URL</label>
                        <Input placeholder="https://hotel.com/virtual-tour" />
                        <p className="text-xs text-muted-foreground">Link to hotel photos or virtual tour</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Location Map URL</label>
                        <Input placeholder="https://maps.google.com/..." />
                        <p className="text-xs text-muted-foreground">Link to hotel location on maps</p>
                      </div>
                    </div>
                  </div>



                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsHotelDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingHotel ? "Update Hotel" : "Add Hotel"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>

      {/* Room Types Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bed className="h-5 w-5" />
            Room Types ({roomTypes.length})
          </CardTitle>
          <CardDescription>
            Configure different room types for your hotels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roomTypes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No room types configured yet</p>
                <p className="text-sm">Add room types to define accommodation options</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {roomTypes.map((roomType) => (
                  <Card key={roomType.id} className="relative">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{roomType.name}</h3>
                            <Badge variant="secondary">{getHotelName(roomType.hotelId)}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Bed className="h-4 w-4" />
                              {roomType.bedType.replace('_', ' ')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              Max {roomType.maxOccupancy} guests
                            </span>
                            <span>
                              {roomType.totalRooms} rooms
                            </span>
                            {roomType.negotiatedRate && (
                              <span>
                                {roomType.currency === 'USD' ? '$' : 
                                 roomType.currency === 'EUR' ? '€' : 
                                 roomType.currency === 'GBP' ? '£' : 
                                 roomType.currency === 'INR' ? '₹' : 
                                 roomType.currency === 'AUD' ? 'A$' : 
                                 roomType.currency === 'CAD' ? 'C$' : 
                                 roomType.currency === 'SGD' ? 'S$' : 
                                 roomType.currency === 'AED' ? 'د.إ' : 
                                 roomType.currency || '$'}{roomType.negotiatedRate}/night
                              </span>
                            )}
                          </div>
                          {roomType.description && (
                            <p className="text-sm text-muted-foreground">{roomType.description}</p>
                          )}
                          {roomType.specialFeatures && (
                            <p className="text-sm text-blue-600">{roomType.specialFeatures}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRoomType(roomType)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Room Type</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {roomType.name}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteRoomType(roomType.id!)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Dialog open={isRoomTypeDialogOpen} onOpenChange={setIsRoomTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="flex items-center gap-2"
                disabled={hotels.length === 0}
              >
                <Plus className="h-4 w-4" />
                Add Room Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRoomType ? "Edit Room Type" : "Add New Room Type"}</DialogTitle>
                <DialogDescription>
                  {editingRoomType ? "Update room type information" : "Configure a new room type for your hotels"}
                </DialogDescription>
              </DialogHeader>
              <Form {...roomTypeForm}>
                <form onSubmit={roomTypeForm.handleSubmit(handleRoomTypeSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={roomTypeForm.control}
                      name="hotelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hotel</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select hotel" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {hotels.map((hotel) => (
                                <SelectItem key={hotel.id} value={hotel.id!}>
                                  {hotel.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={roomTypeForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room Type Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Deluxe Suite" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={roomTypeForm.control}
                      name="bedType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bed Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select bed type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="double">Double</SelectItem>
                              <SelectItem value="queen">Queen</SelectItem>
                              <SelectItem value="king">King</SelectItem>
                              <SelectItem value="twin">Twin</SelectItem>
                              <SelectItem value="sofa_bed">Sofa Bed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={roomTypeForm.control}
                      name="maxOccupancy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Occupancy</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              {...field} 
                              onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={roomTypeForm.control}
                      name="totalRooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Rooms</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              {...field} 
                              onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={roomTypeForm.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                              <SelectItem value="INR">INR (₹)</SelectItem>
                              <SelectItem value="AUD">AUD (A$)</SelectItem>
                              <SelectItem value="CAD">CAD (C$)</SelectItem>
                              <SelectItem value="SGD">SGD (S$)</SelectItem>
                              <SelectItem value="AED">AED (د.إ)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={roomTypeForm.control}
                      name="negotiatedRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Negotiated Rate (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="150" {...field} />
                          </FormControl>
                          <FormDescription>Special rate per night</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={roomTypeForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Room description and features" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={roomTypeForm.control}
                    name="specialFeatures"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Features</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Balcony, sea view, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Room Attachments & Links (Optional)</h4>
                    <p className="text-sm text-muted-foreground">
                      Add room photos, floor plans, or amenity details for guest communications
                    </p>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={roomTypeForm.control}
                        name="photosUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Room Photos URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://hotel.com/deluxe-suite-photos.jpg" {...field} />
                            </FormControl>
                            <FormDescription>Link to room photos or virtual tour</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={roomTypeForm.control}
                        name="brochureUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Room Brochure / Floor Plan URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://hotel.com/room-amenities.pdf" {...field} />
                            </FormControl>
                            <FormDescription>Link to detailed room information or floor plans</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsRoomTypeDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingRoomType ? "Update Room Type" : "Add Room Type"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          {hotels.length === 0 && (
            <p className="text-sm text-muted-foreground ml-4">
              Add hotels first to create room types
            </p>
          )}
        </CardFooter>
      </Card>

      <div className="flex justify-end mt-8">
        <Button onClick={() => onSubmit(form.getValues())} className="flex items-center gap-2">
          <Check className="h-4 w-4" />
          Save Accommodation Settings
        </Button>
      </div>
    </div>
  );
}