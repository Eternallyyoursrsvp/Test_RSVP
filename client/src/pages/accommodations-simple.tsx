import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Building, Hotel, BedDouble, Users, AlertTriangle, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { CORE_PERMISSIONS } from "@/hooks/use-permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCurrentEvent } from "@/hooks/use-current-event";
import { get, ApiEndpoints } from "@/lib/api-utils";

// Simple types
type Hotel = {
  id: number;
  name: string;
  address: string;
  description?: string;
};

type Accommodation = {
  id: number;
  name: string;
  roomType: string;
  maxOccupancy: number;
  totalRooms: number;
  allocatedRooms: number;
};

export default function AccommodationsSimple() {
  const { currentEvent } = useCurrentEvent();
  const eventId = currentEvent?.id;

  // Fetch hotels
  const {
    data: hotels = [],
    isLoading: isHotelsLoading,
    error: hotelsError
  } = useQuery({
    queryKey: ["hotels", "by-event", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const response = await get(`${ApiEndpoints.HOTELS.BY_EVENT}/${eventId}`);
      return response.data || [];
    },
    enabled: !!eventId,
  });

  // Fetch accommodations
  const {
    data: accommodations = [],
    isLoading: isAccommodationsLoading,
    error: accommodationsError
  } = useQuery({
    queryKey: ["accommodations", "by-event", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const response = await get(`${ApiEndpoints.EVENTS.BASE}/${eventId}/accommodations`);
      return response.data || [];
    },
    enabled: !!eventId,
  });

  const isLoading = isHotelsLoading || isAccommodationsLoading;
  const error = hotelsError || accommodationsError;

  if (isLoading) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-muted-foreground">Loading accommodation data...</p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load accommodation data"}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute requiredPermission={CORE_PERMISSIONS.EVENT_READ}>
      <DashboardLayout>
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground">Accommodations</h2>
          <p className="text-sm text-muted-foreground">
            Manage hotel accommodations and room allocations
          </p>
        </div>

      {hotels.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center justify-center text-center">
              <Building className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Hotels Set Up</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                Hotels need to be configured in the Event Setup Wizard before managing accommodations.
              </p>
              <Button onClick={() => window.location.href = `/event-setup-wizard/${eventId}?step=4`}>
                Go to Hotels & Accommodations Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Hotels Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Hotel className="mr-2 h-5 w-5" />
                Hotels ({hotels.length})
              </CardTitle>
              <CardDescription>
                Hotels configured for this event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {hotels.map((hotel: Hotel) => (
                  <Card key={hotel.id}>
                    <CardContent className="p-4">
                      <h4 className="font-medium">{hotel.name}</h4>
                      <p className="text-sm text-muted-foreground">{hotel.address}</p>
                      {hotel.description && (
                        <p className="text-xs text-muted-foreground mt-2">{hotel.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Accommodations Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BedDouble className="mr-2 h-5 w-5" />
                Room Types ({accommodations.length})
              </CardTitle>
              <CardDescription>
                Room types and availability
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accommodations.length === 0 ? (
                <div className="text-center py-8">
                  <BedDouble className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No room types defined yet</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {accommodations.map((accommodation: Accommodation) => (
                    <Card key={accommodation.id}>
                      <CardContent className="p-4">
                        <h4 className="font-medium">{accommodation.name}</h4>
                        <p className="text-sm text-muted-foreground">{accommodation.roomType}</p>
                        <div className="mt-2 text-xs">
                          <div>Max Occupancy: {accommodation.maxOccupancy}</div>
                          <div>Total Rooms: {accommodation.totalRooms}</div>
                          <div>Allocated: {accommodation.allocatedRooms}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}