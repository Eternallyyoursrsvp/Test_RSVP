import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Building, Hotel, BedDouble, Users, UserPlus, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiEndpoints } from "@/lib/api-utils";
import { useCurrentEvent } from "@/hooks/use-current-event";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { RoomAllocationList } from "@/components/room/room-allocation-list";
import { AutoAssignmentDashboard } from "@/components/room/auto-assignment-dashboard";
import { exportToExcel, formatHotelAssignmentsForExport } from "@/lib/xlsx-utils";

// Define schemas
const hotelSchema = z.object({
  name: z.string().min(1, "Hotel name is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  priceRange: z.string().optional(),
  distanceFromVenue: z.string().optional(),
  amenities: z.string().optional(),
  specialNotes: z.string().optional(),
  bookingInstructions: z.string().optional(),
});

type Hotel = {
  id: number;
  eventId: number;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  description?: string;
  isDefault: boolean;
  priceRange?: string;
  distanceFromVenue?: string;
  amenities?: string;
  specialNotes?: string;
  bookingInstructions?: string;
  createdAt: string;
};

const accommodationSchema = z.object({
  hotelId: z.number(),
  name: z.string().min(1, "Room name is required"),
  roomType: z.string().min(1, "Room type is required (e.g., Single, Double, Suite)"),
  bedType: z.string().optional(),
  maxOccupancy: z.number().min(1, "Maximum occupancy must be at least 1"),
  totalRooms: z.number().min(1, "Total rooms must be at least 1"),
  pricePerNight: z.string().optional(),
  specialFeatures: z.string().optional(),
  globalRoomTypeId: z.number().optional(),
  showPricing: z.boolean().default(false),
  createGlobalType: z.boolean().default(true),
});

type Accommodation = {
  id: number;
  eventId: number;
  hotelId: number;
  globalRoomTypeId?: number;
  name: string;
  roomType: string;
  bedType?: string;
  maxOccupancy: number;
  totalRooms: number;
  allocatedRooms: number;
  pricePerNight?: string;
  specialFeatures?: string;
  showPricing?: boolean;
};

type GlobalRoomType = {
  id: number;
  hotelName: string;
  name: string;
  category: string;
  capacity: number;
  specialFeatures?: string;
  createdAt: string;
};

const HotelsPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentEvent } = useCurrentEvent();
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [isAddingHotel, setIsAddingHotel] = useState(false);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [selectedAccommodation, setSelectedAccommodation] = useState<Accommodation | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  


  // Fetch hotels for current event
  const {
    data: hotels = [],
    isLoading: hotelsLoading,
    error: hotelsError
  } = useQuery({
    queryKey: ['hotels', currentEvent?.id],
    queryFn: async () => {
      if (!currentEvent) return [];
      const response = await fetch(`/api/hotels/by-event/${currentEvent.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch hotels');
      }
      return response.json();
    },
    enabled: !!currentEvent
  });

  // Create hotel form
  const hotelForm = useForm<z.infer<typeof hotelSchema>>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      website: "",
      description: "",
      isDefault: false,
      priceRange: "",
      distanceFromVenue: "",
      amenities: "",
      specialNotes: "",
      bookingInstructions: "",
    }
  });

  // Fetch global room types for the selected hotel
  const {
    data: hotelGlobalRoomTypes = [],
    isLoading: hotelGlobalRoomTypesLoading
  } = useQuery({
    queryKey: ['hotelGlobalRoomTypes', selectedHotel?.name],
    queryFn: async () => {
      if (!selectedHotel) return [];
      const response = await fetch(`/api/global-room-types/by-hotel/${encodeURIComponent(selectedHotel.name)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch global room types for hotel');
      }
      return response.json();
    },
    enabled: !!selectedHotel
  });

  // Create accommodation form
  const accommodationForm = useForm<z.infer<typeof accommodationSchema>>({
    resolver: zodResolver(accommodationSchema),
    defaultValues: {
      hotelId: 0,
      name: "",
      roomType: "",
      bedType: "",
      maxOccupancy: 1,
      totalRooms: 1,
      pricePerNight: "",
      specialFeatures: "",
      globalRoomTypeId: undefined,
      showPricing: false,
      createGlobalType: false
    }
  });

  // Reset forms when selection changes
  React.useEffect(() => {
    if (selectedHotel) {
      hotelForm.reset({
        name: selectedHotel.name,
        address: selectedHotel.address,
        phone: selectedHotel.phone || "",
        website: selectedHotel.website || "",
        description: selectedHotel.description || "",
        isDefault: selectedHotel.isDefault,
        priceRange: selectedHotel.priceRange || "",
        distanceFromVenue: selectedHotel.distanceFromVenue || "",
        amenities: selectedHotel.amenities || "",
        specialNotes: selectedHotel.specialNotes || "",
        bookingInstructions: selectedHotel.bookingInstructions || "",
      });
    } else {
      hotelForm.reset({
        name: "",
        address: "",
        phone: "",
        website: "",
        description: "",
        isDefault: false,
        priceRange: "",
        distanceFromVenue: "",
        amenities: "",
        specialNotes: "",
        bookingInstructions: "",
      });
    }
  }, [selectedHotel, hotelForm]);

  React.useEffect(() => {
    if (selectedHotel) {
      accommodationForm.setValue("hotelId", selectedHotel.id);
    }
  }, [selectedHotel, accommodationForm]);

  // Fetch accommodations for selected hotel
  const {
    data: accommodations = [],
    isLoading: accommodationsLoading,
    error: accommodationsError
  } = useQuery({
    queryKey: ['accommodations', currentEvent?.id, selectedHotel?.id],
    queryFn: async () => {
      if (!currentEvent || !selectedHotel) return [];
      const response = await fetch(`/api/events/${currentEvent.id}/accommodations?hotelId=${selectedHotel.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch accommodations');
      }
      return response.json();
    },
    enabled: !!currentEvent && !!selectedHotel
  });

  // Create hotel mutation
  const createHotelMutation = useMutation({
    mutationFn: async (hotelData: z.infer<typeof hotelSchema>) => {
      if (!currentEvent) throw new Error('No event selected');
      const response = await fetch(`/api/hotels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...hotelData,
          eventId: currentEvent.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create hotel');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Hotel created successfully",
      });
      setIsAddingHotel(false);
      queryClient.invalidateQueries({queryKey: ['hotels', currentEvent?.id]});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update hotel mutation
  const updateHotelMutation = useMutation({
    mutationFn: async (hotelData: z.infer<typeof hotelSchema>) => {
      if (!selectedHotel) throw new Error('No hotel selected');
      const response = await fetch(`/api/hotels/${selectedHotel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hotelData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update hotel');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Hotel updated successfully",
      });
      setSelectedHotel(null);
      queryClient.invalidateQueries({queryKey: ['hotels', currentEvent?.id]});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete hotel mutation
  const deleteHotelMutation = useMutation({
    mutationFn: async (hotelId: number) => {
      const response = await fetch(`/api/hotels/${hotelId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete hotel');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Hotel deleted successfully",
      });
      setSelectedHotel(null);
      queryClient.invalidateQueries({queryKey: ['hotels', currentEvent?.id]});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create accommodation mutation
  const createAccommodationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof accommodationSchema>) => {
      if (!currentEvent) throw new Error('No event selected');
      const response = await fetch(`/api/events/${currentEvent.id}/accommodations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          eventId: currentEvent.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create accommodation');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Room type created successfully",
      });
      setIsAddingRoom(false);
      accommodationForm.reset();
      queryClient.invalidateQueries({queryKey: ['accommodations', currentEvent?.id, selectedHotel?.id]});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update accommodation mutation
  const updateAccommodationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof accommodationSchema>) => {
      if (!selectedAccommodation) throw new Error('No accommodation selected');
      const response = await fetch(`/api/accommodations/${selectedAccommodation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update accommodation');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Room type updated successfully",
      });
      setSelectedAccommodation(null);
      accommodationForm.reset();
      queryClient.invalidateQueries({queryKey: ['accommodations', currentEvent?.id, selectedHotel?.id]});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Hotel form submit handler
  const onHotelSubmit = (data: z.infer<typeof hotelSchema>) => {
    if (selectedHotel) {
      updateHotelMutation.mutate(data);
    } else {
      createHotelMutation.mutate(data);
    }
  };

  // Create global room type mutation
  const createGlobalRoomTypeMutation = useMutation({
    mutationFn: async (data: {
      hotelName: string;
      name: string;
      category: string;
      capacity: number;
      specialFeatures?: string;
    }) => {
      const response = await fetch('/api/global-room-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create global room type');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Global room type created successfully",
      });
      queryClient.invalidateQueries({queryKey: ['hotelGlobalRoomTypes', selectedHotel?.name]});
      return data;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Accommodation form submit handler
  const onAccommodationSubmit = async (data: z.infer<typeof accommodationSchema>) => {
    try {
      if (selectedAccommodation) {
        // Update existing accommodation
        updateAccommodationMutation.mutate(data);
      } else {
        // Handle global room type creation if requested
        let globalRoomTypeId = data.globalRoomTypeId;

        if (data.createGlobalType && selectedHotel) {
          // Create global room type first
          const globalRoomType = await createGlobalRoomTypeMutation.mutateAsync({
            hotelName: selectedHotel.name,
            name: data.name,
            category: data.roomType,
            capacity: data.maxOccupancy, // Use maxOccupancy instead of capacity
            specialFeatures: data.specialFeatures
          });

          // Use the ID of the newly created global room type
          globalRoomTypeId = globalRoomType.id;

          toast({
            title: "Success",
            description: "Room type added to global room types library",
          });
        }

        // Create accommodation with global room type reference if applicable
        createAccommodationMutation.mutate({
          ...data,
          globalRoomTypeId: globalRoomTypeId
        });
      }
    } catch (error) {
      console.error('Error submitting accommodation form:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleExportToExcel = async () => {
    if (!currentEvent) {
      toast({
        title: "Error",
        description: "No event selected.",
        variant: "destructive",
      });
      return;
    }

    try {
      const formattedData = await formatHotelAssignmentsForExport(currentEvent.id);
      exportToExcel(formattedData, `hotel-assignments-${currentEvent.name}.xlsx`);
      toast({
        title: "Success",
        description: "Hotel assignments exported to Excel.",
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to export hotel assignments.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Hotels & Accommodation</h1>
          <div className="flex gap-2">
            <Button onClick={handleExportToExcel}>
              <FileDown className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            <Button onClick={() => {
              setSelectedHotel(null);
              setIsAddingHotel(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Hotel
            </Button>
          </div>
        </div>

        {hotelsLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        ) : hotelsError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {hotelsError instanceof Error ? hotelsError.message : "Failed to load hotels"}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotels.map((hotel: Hotel) => (
              <Card 
                key={hotel.id} 
                className={`overflow-hidden ${hotel.isDefault ? 'border-primary' : ''}`}
                onClick={() => setSelectedHotel(hotel)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{hotel.name}</CardTitle>
                    {hotel.isDefault && (
                      <Badge>Default</Badge>
                    )}
                  </div>
                  <CardDescription>{hotel.address}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  {hotel.distanceFromVenue && (
                    <p className="text-sm mb-1">
                      <span className="font-medium">Distance:</span> {hotel.distanceFromVenue}
                    </p>
                  )}
                  {hotel.priceRange && (
                    <p className="text-sm mb-1">
                      <span className="font-medium">Price Range:</span> {hotel.priceRange}
                    </p>
                  )}
                  {hotel.amenities && (
                    <p className="text-sm mb-1">
                      <span className="font-medium">Amenities:</span> {hotel.amenities}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    deleteHotelMutation.mutate(hotel.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Hotel detail/edit view */}
        {selectedHotel && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedHotel.name}</h2>
                <p className="text-muted-foreground">{selectedHotel.address}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setIsAddingRoom(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Room Type
                </Button>
                <Button variant="outline" onClick={() => setSelectedHotel(null)}>
                  Back to Hotels
                </Button>
              </div>
            </div>

            <Tabs defaultValue="rooms" className="w-full">
              <TabsList>
                <TabsTrigger value="rooms">Room Types</TabsTrigger>
                <TabsTrigger value="details">Hotel Details</TabsTrigger>
                <TabsTrigger value="auto-assignments">Auto Assignments</TabsTrigger>
              </TabsList>

              <TabsContent value="rooms" className="py-4">
                {accommodationsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-border" />
                  </div>
                ) : accommodationsError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {accommodationsError instanceof Error ? accommodationsError.message : "Failed to load accommodations"}
                    </AlertDescription>
                  </Alert>
                ) : accommodations.length === 0 ? (
                  <div className="text-center py-8">
                    <h3 className="text-lg font-medium mb-2">No room types added yet</h3>
                    <p className="text-muted-foreground mb-4">Add room types to track accommodations for this hotel</p>
                    <Button onClick={() => setIsAddingRoom(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Room Type
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                      {accommodations.map((acc: Accommodation) => (
                        <Card key={acc.id} className="overflow-hidden">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-xl flex items-center">
                                  {acc.name}
                                  {acc.globalRoomTypeId && (
                                    <Badge className="ml-2" variant="outline">Global</Badge>
                                  )}
                                </CardTitle>
                                <CardDescription>
                                  {acc.roomType} · {acc.bedType ? `${acc.bedType} bed · ` : ''}Max Occupancy: {acc.maxOccupancy} guests
                                </CardDescription>
                              </div>
                              <div className="flex space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAccommodation(acc);
                                    accommodationForm.reset({
                                      hotelId: acc.hotelId,
                                      name: acc.name,
                                      roomType: acc.roomType,
                                      bedType: acc.bedType || "",
                                      maxOccupancy: acc.maxOccupancy,
                                      totalRooms: acc.totalRooms,
                                      pricePerNight: acc.pricePerNight || "",
                                      specialFeatures: acc.specialFeatures || "",
                                      globalRoomTypeId: acc.globalRoomTypeId,
                                      showPricing: acc.showPricing || false,
                                      createGlobalType: false
                                    });
                                    setIsAddingRoom(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <span className="text-sm font-medium">Room Inventory:</span>
                                <span className="text-sm ml-1">
                                  {acc.allocatedRooms || 0}/{acc.totalRooms} assigned
                                </span>
                              </div>
                              {acc.specialFeatures && (
                                <Badge variant="secondary">
                                  {acc.specialFeatures.length > 20 
                                    ? acc.specialFeatures.substring(0, 20) + '...' 
                                    : acc.specialFeatures}
                                </Badge>
                              )}
                            </div>

                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Set the selected accommodation for room management
                                  setSelectedAccommodation(acc);
                                }}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Manage Assignments
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Show room assignments for selected accommodation */}
                    {selectedAccommodation && (
                      <div className="mt-8 border rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold">
                            Room Assignments: {selectedAccommodation.name}
                          </h3>
                          <Button 
                            variant="outline" 
                            onClick={() => setSelectedAccommodation(null)}
                          >
                            Back to Room Types
                          </Button>
                        </div>

                        <RoomAllocationList
                          accommodationId={selectedAccommodation.id}
                          accommodationName={selectedAccommodation.name}
                          maxOccupancy={selectedAccommodation.maxOccupancy}
                          bedType={selectedAccommodation.bedType}
                          totalRooms={selectedAccommodation.totalRooms}
                          allocatedRooms={selectedAccommodation.allocatedRooms || 0}
                          eventId={currentEvent?.id || 0}
                        />
                      </div>
                    )}

                    {!selectedAccommodation && (
                      <div className="text-center border rounded-lg p-8 bg-muted/20">
                        <UserPlus className="h-12 w-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">Room Assignment Management</h3>
                        <p className="text-muted-foreground mt-2 mb-4 max-w-md mx-auto">
                          Select a room type above to manage guest assignments and track room inventory
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Display available global room types */}
                {!selectedAccommodation && hotelGlobalRoomTypes.length > 0 && (
                  <>
                    <h3 className="text-lg font-medium mb-3">
                      Available Global Room Types
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        (room types that can be reused across events)
                      </span>
                    </h3>
                    <div className="mb-6 space-y-2 max-h-[200px] overflow-y-auto">
                      {hotelGlobalRoomTypes.map((roomType: GlobalRoomType) => (
                        <div 
                          key={roomType.id} 
                          className="flex items-center justify-between p-3 border rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => {
                            // Fill the form with global room type 
                            accommodationForm.setValue("name", roomType.name);
                            accommodationForm.setValue("roomType", roomType.category);
                            accommodationForm.setValue("maxOccupancy", roomType.capacity);
                            accommodationForm.setValue("specialFeatures", roomType.specialFeatures || "");
                            accommodationForm.setValue("globalRoomTypeId", roomType.id);

                            toast({
                              title: "Global Room Type Selected",
                              description: "Form populated with global room type data.",
                            });
                          }}
                        >
                          <div>
                            <div className="font-medium flex items-center">
                              {roomType.name}
                              <Badge className="ml-2" variant="secondary">Shared</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {roomType.category} · Capacity: {roomType.capacity}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Separator className="mb-6" />
                  </>
                )}
              </TabsContent>

              <TabsContent value="auto-assignments" className="py-4">
                {currentEvent ? (
                  <AutoAssignmentDashboard eventId={currentEvent.id} />
                ) : (
                  <Alert>
                    <AlertTitle>No Event Selected</AlertTitle>
                    <AlertDescription>
                      Please select an event to view auto-assigned rooms
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="details" className="py-4">
                <Form {...hotelForm}>
                  <form onSubmit={hotelForm.handleSubmit(onHotelSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={hotelForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hotel Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter hotel name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={hotelForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter hotel address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={hotelForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={hotelForm.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter website URL" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={hotelForm.control}
                        name="priceRange"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price Range</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., $100-$200" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={hotelForm.control}
                        name="distanceFromVenue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Distance from Venue</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 2 km" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={hotelForm.control}
                        name="amenities"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Amenities</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Wi-Fi, Pool, Gym" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={hotelForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter hotel description" 
                                className="min-h-[100px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={hotelForm.control}
                        name="specialNotes"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Special Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Any special notes about this hotel" 
                                className="min-h-[100px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={hotelForm.control}
                        name="bookingInstructions"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Booking Instructions</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Instructions for booking rooms at this hotel" 
                                className="min-h-[100px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={hotelForm.control}
                        name="isDefault"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 col-span-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Set as Default Hotel</FormLabel>
                              <FormDescription>
                                This hotel will be selected by default when assigning accommodations
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setSelectedHotel(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={updateHotelMutation.isPending}
                      >
                        {updateHotelMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Update Hotel
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Hotel creation dialog */}
        <Dialog open={isAddingHotel && !selectedHotel} onOpenChange={setIsAddingHotel}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Hotel</DialogTitle>
              <DialogDescription>
                Add a new hotel for guest accommodations
              </DialogDescription>
            </DialogHeader>

            <Form {...hotelForm}>
              <form onSubmit={hotelForm.handleSubmit(onHotelSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={hotelForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hotel Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter hotel name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={hotelForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter hotel address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={hotelForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={hotelForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter website URL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={hotelForm.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 col-span-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Set as Default Hotel</FormLabel>
                          <FormDescription>
                            This hotel will be selected by default when assigning accommodations
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddingHotel(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createHotelMutation.isPending}
                  >
                    {createHotelMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Hotel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Room type creation/edit dialog */}
        <Dialog open={isAddingRoom} onOpenChange={(open) => {
          setIsAddingRoom(open);
          if (!open) {
            setSelectedAccommodation(null);
            accommodationForm.reset({
              hotelId: selectedHotel?.id || 0,
              name: "",
              roomType: "",
              bedType: "",
              maxOccupancy: 1,
              totalRooms: 1,
              pricePerNight: "",
              specialFeatures: "",
              globalRoomTypeId: undefined,
              showPricing: false,
              createGlobalType: false
            });
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedAccommodation ? "Edit Room Type" : "Add New Room Type"}
              </DialogTitle>
              <DialogDescription>
                {selectedAccommodation 
                  ? "Update room type details" 
                  : "Add a new room type for this hotel"
                }
              </DialogDescription>
            </DialogHeader>

            <Form {...accommodationForm}>
              <form onSubmit={accommodationForm.handleSubmit(onAccommodationSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={accommodationForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Deluxe Room" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accommodationForm.control}
                    name="roomType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Single, Double, Suite" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accommodationForm.control}
                    name="bedType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bed Type</FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select bed type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="double">Double</SelectItem>
                            <SelectItem value="twin">Twin</SelectItem>
                            <SelectItem value="queen">Queen</SelectItem>
                            <SelectItem value="king">King</SelectItem>
                            <SelectItem value="mix">Mixed Types</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The type of beds available in this room
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accommodationForm.control}
                    name="maxOccupancy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Occupancy</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum number of guests allowed per room
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accommodationForm.control}
                    name="totalRooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Rooms</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accommodationForm.control}
                    name="showPricing"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              setShowPricing(!!checked);
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Show Pricing</FormLabel>
                          <FormDescription>
                            Enable if guests are paying for their own rooms
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {(showPricing || accommodationForm.watch("showPricing")) && (
                    <FormField
                      control={accommodationForm.control}
                      name="pricePerNight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price per Night</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., $150" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={accommodationForm.control}
                    name="specialFeatures"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Special Features</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g., Sea view, Balcony, etc." 
                            className="min-h-[80px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!selectedAccommodation && (
                    <FormField
                      control={accommodationForm.control}
                      name="createGlobalType"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 col-span-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Add to Global Room Types</FormLabel>
                            <FormDescription>
                              This room type will be available for reuse in other events
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsAddingRoom(false);
                      setSelectedAccommodation(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createAccommodationMutation.isPending || updateAccommodationMutation.isPending}
                  >
                    {(createAccommodationMutation.isPending || updateAccommodationMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {selectedAccommodation ? "Update Room Type" : "Add Room Type"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default HotelsPage;