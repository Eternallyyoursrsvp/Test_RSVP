import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Edit3, 
  Save, 
  X, 
  Plane, 
  Clock, 
  Calendar, 
  Check, 
  Download,
  Upload,
  Filter,
  Search,
  Users,
  AlertCircle,
  Send,
  FileExport,
  MapPin,
  Building,
  MessageSquare,
  RefreshCw,
  Mail,
  Smartphone,
  User,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { post } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
import { useCurrentEvent } from "@/hooks/use-current-event";

interface FlightData {
  id: number;
  guestId: number;
  guestName: string;
  flightNumber?: string;
  airline?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  arrivalLocation?: string;
  departureDate?: string;
  departureTime?: string;
  departureLocation?: string;
  terminal?: string;
  gate?: string;
  flightStatus: string;
  needsTransportation: boolean;
  specialRequirements?: string;
}

interface FlightDataTableProps {
  eventId: number;
  guests: any[];
  flightData: FlightData[];
}

export default function FlightDataTable({ eventId, guests, flightData }: FlightDataTableProps) {
  const [editingGuest, setEditingGuest] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<FlightData>>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuests, setSelectedGuests] = useState<number[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentEvent } = useCurrentEvent();

  // Flight coordination statistics
  const stats = React.useMemo(() => {
    const totalFlights = flightData.length;
    const confirmedFlights = flightData.filter(f => f.flightStatus === 'confirmed').length;
    const pendingFlights = flightData.filter(f => f.flightStatus === 'pending').length;
    const needsTransportation = flightData.filter(f => f.needsTransportation).length;
    const specialRequirements = flightData.filter(f => f.specialRequirements).length;

    return {
      totalFlights,
      confirmedFlights,
      pendingFlights,
      needsTransportation,
      specialRequirements,
      confirmationRate: totalFlights > 0 ? Math.round((confirmedFlights / totalFlights) * 100) : 0
    };
  }, [flightData]);

  // Filter flight data based on status and search
  const filteredFlightData = React.useMemo(() => {
    let filtered = flightData;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(f => f.flightStatus === filterStatus);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(f => 
        f.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.flightNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.airline?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [flightData, filterStatus, searchTerm]);

  const saveFlightInfo = useMutation({
    mutationFn: async (data: Partial<FlightData>) => {
      return post(`/api/events/${eventId}/flights`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/flights`] });
      setEditingGuest(null);
      setEditData({});
      toast({
        title: "Flight information saved",
        description: "The guest's flight details have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save flight information. Please try again.",
        variant: "destructive",
      });
    }
  });

  const startEditing = (guest: any) => {
    const existingFlight = flightData.find(f => f.guestId === guest.id);
    setEditingGuest(guest.id);
    setEditData({
      guestId: guest.id,
      guestName: `${guest.first_name} ${guest.last_name}`,
      flightNumber: existingFlight?.flightNumber || '',
      airline: existingFlight?.airline || '',
      arrivalDate: existingFlight?.arrivalDate || '',
      arrivalTime: existingFlight?.arrivalTime || '',
      arrivalLocation: existingFlight?.arrivalLocation || '',
      departureDate: existingFlight?.departureDate || '',
      departureTime: existingFlight?.departureTime || '',
      departureLocation: existingFlight?.departureLocation || '',
      flightStatus: existingFlight?.flightStatus || 'No_Flight',
      needsTransportation: existingFlight?.needsTransportation || false,
      specialRequirements: existingFlight?.specialRequirements || ''
    });
  };

  const cancelEditing = () => {
    setEditingGuest(null);
    setEditData({});
  };

  const saveChanges = () => {
    saveFlightInfo.mutate(editData);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'Confirmed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'Booked': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'No_Flight': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    };
    
    return (
      <Badge className={cn("text-xs", variants[status] || variants['No_Flight'])}>
        {status === 'No_Flight' ? 'No Flight' : status}
      </Badge>
    );
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-primary" />
          Guest Flight Management
        </CardTitle>
        <CardDescription>
          Click "Edit" to add or update flight information for each guest. Clean, responsive design for efficiency.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b">
            <div className="grid grid-cols-8 gap-2 p-3 text-sm font-medium text-muted-foreground">
              <div>Guest Name</div>
              <div>Email</div>
              <div>Mobile</div>
              <div>Flight Info</div>
              <div>Arrival</div>
              <div>Departure</div>
              <div className="text-center">Status</div>
              <div className="text-center">Actions</div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="max-h-[500px] overflow-y-auto">
            {guests.map((guest) => {
              const existingFlight = flightData.find(f => f.guestId === guest.id);
              const isEditing = editingGuest === guest.id;

              return (
                <div key={guest.id} className="grid grid-cols-8 gap-2 p-3 border-b hover:bg-muted/10 transition-colors">
                  {/* Guest Name */}
                  <div className="flex items-center">
                    <div className="font-medium text-sm truncate">{guest.first_name} {guest.last_name}</div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center">
                    <div className="text-xs text-muted-foreground truncate">{guest.email}</div>
                  </div>

                  {/* Mobile */}
                  <div className="flex items-center">
                    <div className="text-xs text-muted-foreground truncate">{guest.phone || 'No phone'}</div>
                  </div>

                  {/* Flight Info */}
                  <div className="flex items-center">
                    {isEditing ? (
                      <div className="w-full space-y-1">
                        <Input
                          placeholder="Flight Number"
                          value={editData.flightNumber || ''}
                          onChange={(e) => setEditData({ ...editData, flightNumber: e.target.value })}
                          className="h-7 text-xs"
                        />
                        <Input
                          placeholder="Airline"
                          value={editData.airline || ''}
                          onChange={(e) => setEditData({ ...editData, airline: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </div>
                    ) : (
                      <div className="w-full">
                        {existingFlight?.flightNumber ? (
                          <>
                            <div className="font-medium text-sm">{existingFlight.flightNumber}</div>
                            <div className="text-xs text-muted-foreground">{existingFlight.airline}</div>
                          </>
                        ) : (
                          <div className="text-xs text-muted-foreground">No flight info</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Arrival */}
                  <div className="flex items-center">
                    {isEditing ? (
                      <div className="w-full space-y-1">
                        <div className="grid grid-cols-2 gap-1">
                          <Input
                            type="date"
                            value={editData.arrivalDate || ''}
                            onChange={(e) => setEditData({ ...editData, arrivalDate: e.target.value })}
                            className="h-7 text-xs"
                          />
                          <Input
                            type="time"
                            value={editData.arrivalTime || ''}
                            onChange={(e) => setEditData({ ...editData, arrivalTime: e.target.value })}
                            className="h-7 text-xs"
                          />
                        </div>
                        <Input
                          placeholder="Airport"
                          value={editData.arrivalLocation || ''}
                          onChange={(e) => setEditData({ ...editData, arrivalLocation: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </div>
                    ) : (
                      <div className="w-full">
                        {existingFlight?.arrivalDate ? (
                          <>
                            <div className="text-xs font-medium">{existingFlight.arrivalDate} {existingFlight.arrivalTime}</div>
                            <div className="text-xs text-muted-foreground truncate">{existingFlight.arrivalLocation}</div>
                          </>
                        ) : (
                          <div className="text-xs text-muted-foreground">Not set</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Departure */}
                  <div className="flex items-center">
                    {isEditing ? (
                      <div className="w-full space-y-1">
                        <div className="grid grid-cols-2 gap-1">
                          <Input
                            type="date"
                            value={editData.departureDate || ''}
                            onChange={(e) => setEditData({ ...editData, departureDate: e.target.value })}
                            className="h-7 text-xs"
                          />
                          <Input
                            type="time"
                            value={editData.departureTime || ''}
                            onChange={(e) => setEditData({ ...editData, departureTime: e.target.value })}
                            className="h-7 text-xs"
                          />
                        </div>
                        <Input
                          placeholder="Airport"
                          value={editData.departureLocation || ''}
                          onChange={(e) => setEditData({ ...editData, departureLocation: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </div>
                    ) : (
                      <div className="w-full">
                        {existingFlight?.departureDate ? (
                          <>
                            <div className="text-xs font-medium">{existingFlight.departureDate} {existingFlight.departureTime}</div>
                            <div className="text-xs text-muted-foreground truncate">{existingFlight.departureLocation}</div>
                          </>
                        ) : (
                          <div className="text-xs text-muted-foreground">Not set</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-center">
                    {isEditing ? (
                      <select
                        value={editData.flightStatus || 'No_Flight'}
                        onChange={(e) => setEditData({ ...editData, flightStatus: e.target.value })}
                        className="w-full h-7 px-1 border rounded text-xs bg-background"
                      >
                        <option value="No_Flight">No Flight</option>
                        <option value="Booked">Booked</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    ) : (
                      getStatusBadge(existingFlight?.flightStatus || 'No_Flight')
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          onClick={saveChanges}
                          disabled={saveFlightInfo.isPending}
                          className="h-7 px-2"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          className="h-7 px-2"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(guest)}
                        className="h-7 px-2"
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        {existingFlight ? 'Edit' : 'Add'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}