import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileDown, 
  BarChart, 
  PieChart, 
  Calendar,
  Info, 
  Loader2 
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { exportToExcel, formatHotelAssignmentsForExport } from "@/lib/xlsx-utils";
import { ApiEndpoints } from "@/lib/api-utils";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Types for reporting
type RoomAllocation = {
  id: number;
  guestId: number;
  guest: {
    firstName: string;
    lastName: string;
    email?: string;
  };
  accommodationId: number;
  accommodation: {
    name: string;
    roomType: string;
    bedType?: string;
    maxOccupancy: number;
  };
  hotelId: number;
  hotel: {
    name: string;
    address: string;
  };
  roomNumber?: string;
  checkInDate?: string;
  checkOutDate?: string;
  specialRequests?: string;
  includesPlusOne: boolean;
  includesChildren: boolean;
  childrenCount: number;
};

// Props for the reporting component
interface AccommodationReportsProps {
  eventId: number;
}

export function AccommodationReports({ eventId }: AccommodationReportsProps) {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("summary");
  
  // Fetch hotels for current event
  const {
    data: hotels = [],
    isLoading: isHotelsLoading
  } = useQuery({
    queryKey: [ApiEndpoints.HOTELS.BY_EVENT, eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const response = await fetch(`${ApiEndpoints.HOTELS.BY_EVENT}/${eventId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch hotels");
      }
      return response.json();
    },
    enabled: !!eventId,
  });

  // Fetch accommodations for current event
  const {
    data: accommodations = [],
    isLoading: isAccommodationsLoading
  } = useQuery({
    queryKey: [ApiEndpoints.ACCOMMODATIONS.BY_EVENT, eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const response = await fetch(`${ApiEndpoints.ACCOMMODATIONS.BY_EVENT}/${eventId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch accommodations");
      }
      return response.json();
    },
    enabled: !!eventId,
  });

  // Fetch room allocations for reporting
  const {
    data: allocations = [],
    isLoading: isAllocationsLoading,
    error: allocationsError
  } = useQuery({
    queryKey: ["/api/events", eventId, "room-allocations"],
    queryFn: async () => {
      if (!eventId) return [];
      const response = await fetch(`/api/events/${eventId}/room-allocations`);
      if (!response.ok) {
        throw new Error("Failed to fetch room allocations");
      }
      return response.json();
    },
    enabled: !!eventId,
  });

  // Export hotel assignments to Excel
  const handleExportAssignments = async () => {
    try {
      // Format data and export
      const data = await formatHotelAssignmentsForExport(eventId);
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

  // Calculate reporting metrics
  const calculateMetrics = () => {
    if (!allocations.length || !accommodations.length) {
      return {
        totalGuests: 0,
        totalRooms: 0,
        allocatedRooms: 0,
        occupancyRate: 0,
        totalPlusOnes: 0,
        totalChildren: 0,
        allocationsByHotel: {},
        allocationsByRoomType: {}
      };
    }

    // Calculate total allocated rooms
    const allocatedRooms = new Set(allocations.map((a: RoomAllocation) => a.accommodationId)).size;
    
    // Calculate total available rooms
    const totalRooms = accommodations.reduce((sum: number, acc: any) => sum + acc.totalRooms, 0);
    
    // Count guests, plus ones, and children
    const totalGuests = allocations.length;
    const totalPlusOnes = allocations.filter((a: RoomAllocation) => a.includesPlusOne).length;
    const totalChildren = allocations.reduce((sum: number, a: RoomAllocation) => 
      sum + (a.includesChildren ? a.childrenCount : 0), 0);
    
    // Group allocations by hotel
    const allocationsByHotel = allocations.reduce((acc: any, allocation: RoomAllocation) => {
      const hotelName = allocation.hotel?.name || 'Unknown';
      acc[hotelName] = (acc[hotelName] || 0) + 1;
      return acc;
    }, {});
    
    // Group allocations by room type
    const allocationsByRoomType = allocations.reduce((acc: any, allocation: RoomAllocation) => {
      const roomType = allocation.accommodation?.roomType || 'Unknown';
      acc[roomType] = (acc[roomType] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalGuests,
      totalRooms,
      allocatedRooms,
      occupancyRate: totalRooms > 0 ? Math.round((allocatedRooms / totalRooms) * 100) : 0,
      totalPlusOnes,
      totalChildren,
      allocationsByHotel,
      allocationsByRoomType
    };
  };

  const metrics = calculateMetrics();
  const isLoading = isHotelsLoading || isAccommodationsLoading || isAllocationsLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Accommodation Reports</CardTitle>
            <CardDescription>
              View and export accommodation statistics and reports
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={handleExportAssignments}
            disabled={isLoading || !allocations.length}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : allocationsError ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {allocationsError instanceof Error ? allocationsError.message : "Failed to load allocation data"}
            </AlertDescription>
          </Alert>
        ) : allocations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No room allocations found. Assign guests to rooms to see reports.</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard 
                title="Total Guests" 
                value={metrics.totalGuests} 
                icon={<BarChart className="h-4 w-4" />} 
                description="Total guests with room assignments"
              />
              <MetricCard 
                title="Room Occupancy" 
                value={`${metrics.occupancyRate}%`} 
                icon={<PieChart className="h-4 w-4" />} 
                description={`${metrics.allocatedRooms} of ${metrics.totalRooms} rooms allocated`}
              />
              <MetricCard 
                title="Plus Ones" 
                value={metrics.totalPlusOnes} 
                icon={<Calendar className="h-4 w-4" />} 
                description="Additional adult guests"
              />
              <MetricCard 
                title="Children" 
                value={metrics.totalChildren} 
                icon={<Info className="h-4 w-4" />} 
                description="Total children in accommodations"
              />
            </div>
            
            <Tabs value={reportType} onValueChange={setReportType} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="summary">Summary Report</TabsTrigger>
                <TabsTrigger value="byHotel">By Hotel</TabsTrigger>
                <TabsTrigger value="byRoomType">By Room Type</TabsTrigger>
                <TabsTrigger value="detailed">Detailed Report</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <Table>
                      <TableCaption>Room allocation summary report</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hotel</TableHead>
                          <TableHead className="text-right">Room Allocations</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(metrics.allocationsByHotel).map(([hotel, count]) => (
                          <TableRow key={hotel}>
                            <TableCell className="font-medium">{hotel}</TableCell>
                            <TableCell className="text-right">{count as number}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="byHotel" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <Table>
                      <TableCaption>Room allocations by hotel</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hotel</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead className="text-right">Guests</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hotels.map((hotel: any) => {
                          const count = metrics.allocationsByHotel[hotel.name] || 0;
                          return (
                            <TableRow key={hotel.id}>
                              <TableCell className="font-medium">{hotel.name}</TableCell>
                              <TableCell>{hotel.address}</TableCell>
                              <TableCell className="text-right">{count}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="byRoomType" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <Table>
                      <TableCaption>Room allocations by room type</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Room Type</TableHead>
                          <TableHead className="text-right">Allocations</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(metrics.allocationsByRoomType).map(([roomType, count]) => {
                          const percentage = metrics.totalGuests > 0 
                            ? ((count as number) / metrics.totalGuests * 100).toFixed(1) 
                            : '0';
                          
                          return (
                            <TableRow key={roomType}>
                              <TableCell className="font-medium">{roomType}</TableCell>
                              <TableCell className="text-right">{count as number}</TableCell>
                              <TableCell className="text-right">{percentage}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="detailed" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableCaption>Detailed room allocation report</TableCaption>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Guest</TableHead>
                            <TableHead>Hotel</TableHead>
                            <TableHead>Room</TableHead>
                            <TableHead>Check-in</TableHead>
                            <TableHead>Check-out</TableHead>
                            <TableHead className="text-center">Additional</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allocations.map((allocation: RoomAllocation) => (
                            <TableRow key={allocation.id}>
                              <TableCell className="font-medium">
                                {allocation.guest.firstName} {allocation.guest.lastName}
                              </TableCell>
                              <TableCell>{allocation.hotel?.name || 'Unknown'}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span>{allocation.accommodation?.name || 'Unknown'}</span>
                                  {allocation.roomNumber && (
                                    <span className="text-xs text-muted-foreground">
                                      Room #{allocation.roomNumber}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{allocation.checkInDate || 'TBD'}</TableCell>
                              <TableCell>{allocation.checkOutDate || 'TBD'}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center gap-1">
                                  {allocation.includesPlusOne && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className="bg-blue-50">+1</Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Includes plus one</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  {allocation.includesChildren && allocation.childrenCount > 0 && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant="outline" className="bg-purple-50">
                                            {allocation.childrenCount} {allocation.childrenCount === 1 ? 'child' : 'children'}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{allocation.childrenCount} {allocation.childrenCount === 1 ? 'child' : 'children'} included</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper component for metrics display
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
}

function MetricCard({ title, value, icon, description }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="bg-primary/10 p-2 rounded-full">
            {icon}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      </CardContent>
    </Card>
  );
}