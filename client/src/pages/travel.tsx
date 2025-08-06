import React from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import FlightCoordinationDashboard from "@/components/travel/FlightCoordinationDashboard";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Users, Calendar, AlertTriangle } from "lucide-react";

export default function TravelPage() {
  // Get current event from session
  const { data: events = [] } = useQuery({
    queryKey: ['/api/events'],
    queryFn: async () => {
      const response = await get('/api/events');
      return response.data;
    }
  });

  // Use the first event for now (in production, this would come from route params or context)
  const currentEvent = events.find((event: any) => event.id === 11) || events[0];

  if (!currentEvent) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                No Event Selected
              </CardTitle>
              <CardDescription>
                Please create or select an event to access travel management features.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Travel Management</h1>
            <p className="text-muted-foreground">
              Coordinate guest flights and travel arrangements for {currentEvent.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">Flight Coordination Active</span>
          </div>
        </div>

        {/* Event Info */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{currentEvent.title}</CardTitle>
                <CardDescription>
                  {currentEvent.groomName} & {currentEvent.brideName} • {currentEvent.location}
                </CardDescription>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {currentEvent.date}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Event ID: {currentEvent.id}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Flight Coordination Dashboard */}
        <FlightCoordinationDashboard eventId={currentEvent.id} />
      </div>
    </DashboardLayout>
  );
}