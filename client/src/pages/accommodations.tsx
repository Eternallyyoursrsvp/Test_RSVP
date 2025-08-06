import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Building, Hotel, BedDouble, Users, BarChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoomAllocationList } from "@/components/room/room-allocation-list";
import { AutoAssignmentDashboard } from "@/components/room/auto-assignment-dashboard";
import { AccommodationReports } from "@/components/room/accommodation-reports";
import { exportToExcel, formatHotelAssignmentsForExport } from "@/lib/xlsx-utils";
import { useCurrentEvent } from "@/hooks/use-current-event";
import { get, ApiEndpoints } from "@/lib/api-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { AccommodationsErrorBoundary } from "./accommodations-error-boundary";

// Types for accommodations and hotels
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

type Accommodation = {
  id: number;
  eventId: number;
  hotelId: number;
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

export default function Accommodations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentEvent } = useCurrentEvent();
  const eventId = currentEvent?.id;
  
  // Fetch hotels for current event
  const {
    data: hotels = [],
    isLoading: isHotelsLoading,
    error: hotelsError
  } = useQuery({
    queryKey: ['hotels', 'by-event', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const response = await get(`${ApiEndpoints.HOTELS.BY_EVENT}/${eventId}`);
      return response.data || [];
    },
    enabled: !!eventId,
  });

  // Fetch accommodations for current event
  const {
    data: accommodations = [],
    isLoading: isAccommodationsLoading,
    error: accommodationsError
  } = useQuery({
    queryKey: ['accommodations', 'by-event', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const response = await get(`${ApiEndpoints.EVENTS.BASE}/${eventId}/accommodations`);
      return response.data || [];
    },
    enabled: !!eventId,
  });

  // Export hotel assignments to Excel
  const handleExportAssignments = async () => {
    try {
      // Fetch room allocations for this event
      const response = await get(ApiEndpoints.ROOM_ALLOCATIONS.BY_EVENT(eventId));
      const allocations = response.data || [];
      
      // Format data and export
      const data = formatHotelAssignmentsForExport(allocations, hotels, accommodations);
      exportToExcel(data, `hotel-assignments-event-${eventId}`);
      
      toast({
        title: "Export Successful",
        description: "Hotel assignments have been exported to Excel",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An error occurred during export",
        variant: "destructive",
      });
    }
  };

  const isLoading = isHotelsLoading || isAccommodationsLoading;
  const error = hotelsError || accommodationsError;

  return (
    <AccommodationsErrorBoundary>
      <DashboardLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Accommodations</h2>
          <p className="text-sm text-gray-500">
            Manage hotel accommodations and room allocations
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleExportAssignments}
          disabled={isLoading || hotels.length === 0 || accommodations.length === 0}
        >
          <FileDown className="mr-2 h-4 w-4" />
          Export Assignments
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-muted-foreground">Loading accommodation data...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load accommodation data"}
          </AlertDescription>
        </Alert>
      ) : hotels.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center justify-center text-center">
              <Building className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Hotels Set Up</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                You haven't set up any hotels for this event yet. Hotels need to be configured in Event Settings before you can manage room allocations.
              </p>
              <Button asChild>
                <a href="/event-settings">Configure Hotels in Event Settings</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : accommodations.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center justify-center text-center">
              <BedDouble className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Room Types Defined</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                You've set up hotels, but you haven't defined any room types yet. Add room types in Event Settings before assigning guests.
              </p>
              <Button asChild>
                <a href="/event-settings">Add Room Types in Event Settings</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="room-allocations">
          <TabsList className="mb-4">
            <TabsTrigger value="room-allocations">
              <BedDouble className="mr-2 h-4 w-4" />
              Room Allocations
            </TabsTrigger>
            <TabsTrigger value="auto-assignments">
              <Users className="mr-2 h-4 w-4" />
              Auto Assignments
            </TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart className="mr-2 h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="room-allocations" className="space-y-4">
            {accommodations.map((acc: Accommodation) => (
              <RoomAllocationList
                key={acc.id}
                accommodationId={acc.id}
                accommodationName={acc.name}
                maxOccupancy={acc.maxOccupancy}
                bedType={acc.bedType}
                totalRooms={acc.totalRooms}
                allocatedRooms={acc.allocatedRooms}
                eventId={eventId || 0}
              />
            ))}
          </TabsContent>
          
          <TabsContent value="auto-assignments">
            <AutoAssignmentDashboard eventId={eventId || 0} />
          </TabsContent>
          
          <TabsContent value="reports">
            <AccommodationReports eventId={eventId || 0} />
          </TabsContent>
        </Tabs>
      )}
      </DashboardLayout>
    </AccommodationsErrorBoundary>
  );
}