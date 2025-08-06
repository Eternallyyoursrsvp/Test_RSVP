/**
 * Flight Coordination Component
 * Comprehensive flight management interface for wedding events
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plane, 
  Clock, 
  MapPin, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  Phone, 
  Mail,
  Calendar,
  Navigation,
  UserCheck,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

// Types
type FlightStatus = 'scheduled' | 'boarding' | 'departed' | 'arrived' | 'delayed' | 'cancelled';

interface FlightDetails {
  id: string;
  guestId: string;
  eventId: string;
  flightType: 'arrival' | 'departure';
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  actualDeparture?: string;
  actualArrival?: string;
  status: FlightStatus;
  gate?: string;
  terminal?: string;
  seat?: string;
  assistanceRequired: boolean;
  specialRequirements: string[];
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

interface AssistanceRequest {
  id: string;
  flightId: string;
  guestId: string;
  assistanceType: 'pickup' | 'checkin' | 'wheelchair' | 'language' | 'customs' | 'baggage';
  description?: string;
  contactPhone?: string;
  meetingPoint?: string;
  status: 'requested' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  representativeName?: string;
  representativePhone?: string;
}

interface AirportRepresentative {
  id: string;
  name: string;
  email: string;
  phone: string;
  airport: string;
  languages: string[];
  specializations: string[];
  rating: number;
  isActive: boolean;
}

// Form Schemas
const flightFormSchema = z.object({
  guestId: z.string().min(1, 'Guest is required'),
  flightType: z.enum(['arrival', 'departure']),
  airline: z.string().min(1, 'Airline is required'),
  flightNumber: z.string().min(1, 'Flight number is required'),
  departureAirport: z.string().length(3, 'Must be 3-letter airport code'),
  arrivalAirport: z.string().length(3, 'Must be 3-letter airport code'),
  scheduledDeparture: z.string().min(1, 'Departure time is required'),
  scheduledArrival: z.string().min(1, 'Arrival time is required'),
  gate: z.string().optional(),
  terminal: z.string().optional(),
  seat: z.string().optional(),
  assistanceRequired: z.boolean().default(false),
  specialRequirements: z.array(z.string()).default([])
});

const assistanceRequestSchema = z.object({
  flightId: z.string().min(1, 'Flight is required'),
  assistanceType: z.enum(['pickup', 'checkin', 'wheelchair', 'language', 'customs', 'baggage']),
  description: z.string().optional(),
  contactPhone: z.string().optional(),
  meetingPoint: z.string().optional()
});

// Status styling
const getStatusBadge = (status: FlightStatus) => {
  const statusConfig = {
    scheduled: { variant: 'default' as const, icon: Clock, color: 'bg-blue-100 text-blue-800' },
    boarding: { variant: 'default' as const, icon: Plane, color: 'bg-yellow-100 text-yellow-800' },
    departed: { variant: 'default' as const, icon: Navigation, color: 'bg-purple-100 text-purple-800' },
    arrived: { variant: 'default' as const, icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    delayed: { variant: 'destructive' as const, icon: AlertCircle, color: 'bg-red-100 text-red-800' },
    cancelled: { variant: 'destructive' as const, icon: AlertCircle, color: 'bg-gray-100 text-gray-800' }
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge variant={config.variant} className={config.color}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

// Flight Coordination Component Props
interface FlightCoordinationProps {
  eventId: string;
  guests: Array<{ id: string; name: string; email: string; phone?: string }>;
  onFlightAdded?: (flight: FlightDetails) => void;
  onFlightUpdated?: (flight: FlightDetails) => void;
}

export const FlightCoordination: React.FC<FlightCoordinationProps> = ({
  eventId,
  guests,
  onFlightAdded,
  onFlightUpdated
}) => {
  // State management
  const [flights, setFlights] = useState<FlightDetails[]>([]);
  const [assistanceRequests, setAssistanceRequests] = useState<AssistanceRequest[]>([]);
  const [representatives, setRepresentatives] = useState<AirportRepresentative[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FlightStatus | 'all'>('all');
  const [flightTypeFilter, setFlightTypeFilter] = useState<'arrival' | 'departure' | 'all'>('all');
  const [showAddFlightDialog, setShowAddFlightDialog] = useState(false);
  const [showAssistanceDialog, setShowAssistanceDialog] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightDetails | null>(null);

  // Forms
  const flightForm = useForm<z.infer<typeof flightFormSchema>>({
    resolver: zodResolver(flightFormSchema),
    defaultValues: {
      assistanceRequired: false,
      specialRequirements: []
    }
  });

  const assistanceForm = useForm<z.infer<typeof assistanceRequestSchema>>({
    resolver: zodResolver(assistanceRequestSchema)
  });

  // API calls
  const fetchFlights = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/travel-coordination/flights/event/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFlights(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch flights:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const createFlight = async (flightData: z.infer<typeof flightFormSchema>) => {
    try {
      const response = await fetch('/api/travel-coordination/flights', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...flightData,
          eventId,
          status: 'scheduled'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const newFlight = result.data;
          setFlights(prev => [...prev, newFlight]);
          setShowAddFlightDialog(false);
          flightForm.reset();
          onFlightAdded?.(newFlight);
        }
      }
    } catch (error) {
      console.error('Failed to create flight:', error);
    }
  };

  const updateFlightStatus = async (flightId: string, statusUpdate: Partial<{
    status: FlightStatus;
    actualDeparture: string;
    actualArrival: string;
    gate: string;
    terminal: string;
  }>) => {
    try {
      const response = await fetch(`/api/travel-coordination/flights/${flightId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(statusUpdate)
      });

      if (response.ok) {
        await fetchFlights(); // Refresh flights
      }
    } catch (error) {
      console.error('Failed to update flight status:', error);
    }
  };

  const createAssistanceRequest = async (requestData: z.infer<typeof assistanceRequestSchema>) => {
    try {
      const response = await fetch('/api/travel-coordination/assistance-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...requestData,
          guestId: selectedFlight?.guestId,
          eventId,
          status: 'requested'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAssistanceRequests(prev => [...prev, result.data]);
          setShowAssistanceDialog(false);
          assistanceForm.reset();
        }
      }
    } catch (error) {
      console.error('Failed to create assistance request:', error);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  // Filter flights
  const filteredFlights = flights.filter(flight => {
    const matchesSearch = !searchTerm || 
      flight.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.airline.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.guestName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || flight.status === statusFilter;
    const matchesType = flightTypeFilter === 'all' || flight.flightType === flightTypeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Statistics
  const statistics = {
    total: flights.length,
    arrived: flights.filter(f => f.status === 'arrived').length,
    delayed: flights.filter(f => f.status === 'delayed').length,
    assistance: flights.filter(f => f.assistanceRequired).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading flight information...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Flight Coordination</h2>
          <p className="text-muted-foreground">Manage guest flights and airport assistance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchFlights()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showAddFlightDialog} onOpenChange={setShowAddFlightDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Flight
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Flight</DialogTitle>
              </DialogHeader>
              <Form {...flightForm}>
                <form onSubmit={flightForm.handleSubmit(createFlight)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={flightForm.control}
                      name="guestId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Guest</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select guest" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {guests.map(guest => (
                                <SelectItem key={guest.id} value={guest.id}>
                                  {guest.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={flightForm.control}
                      name="flightType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flight Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="arrival">Arrival</SelectItem>
                              <SelectItem value="departure">Departure</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={flightForm.control}
                      name="airline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Airline</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., American Airlines" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={flightForm.control}
                      name="flightNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flight Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., AA123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={flightForm.control}
                      name="departureAirport"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departure Airport</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., JFK" maxLength={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={flightForm.control}
                      name="arrivalAirport"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arrival Airport</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., LAX" maxLength={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={flightForm.control}
                      name="scheduledDeparture"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Departure</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={flightForm.control}
                      name="scheduledArrival"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Arrival</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={flightForm.control}
                    name="assistanceRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Airport Assistance Required</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Guest needs assistance at the airport
                          </div>
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

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddFlightDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Add Flight
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Flights</p>
                <p className="text-2xl font-bold">{statistics.total}</p>
              </div>
              <Plane className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Arrived</p>
                <p className="text-2xl font-bold text-green-600">{statistics.arrived}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delayed</p>
                <p className="text-2xl font-bold text-red-600">{statistics.delayed}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Need Assistance</p>
                <p className="text-2xl font-bold text-purple-600">{statistics.assistance}</p>
              </div>
              <UserCheck className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search flights, airlines, or guests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-[150px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="boarding">Boarding</SelectItem>
            <SelectItem value="departed">Departed</SelectItem>
            <SelectItem value="arrived">Arrived</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={flightTypeFilter} onValueChange={(value: any) => setFlightTypeFilter(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="arrival">Arrivals</SelectItem>
            <SelectItem value="departure">Departures</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Flights List */}
      <div className="space-y-4">
        {filteredFlights.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Plane className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Flights Found</h3>
              <p className="text-muted-foreground mb-4">
                {flights.length === 0 ? 'No flights have been added yet.' : 'No flights match your current filters.'}
              </p>
              {flights.length === 0 && (
                <Button onClick={() => setShowAddFlightDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Flight
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredFlights.map((flight) => (
            <Card key={flight.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-4">
                    {/* Flight Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-semibold">
                          {flight.airline} {flight.flightNumber}
                        </div>
                        {getStatusBadge(flight.status)}
                        <Badge variant="outline">
                          {flight.flightType === 'arrival' ? 'Arrival' : 'Departure'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {flight.assistanceRequired && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedFlight(flight);
                              setShowAssistanceDialog(true);
                            }}
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Request Assistance
                          </Button>
                        )}
                        <Select onValueChange={(value) => updateFlightStatus(flight.id, { status: value as FlightStatus })}>
                          <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="Update Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="boarding">Boarding</SelectItem>
                            <SelectItem value="departed">Departed</SelectItem>
                            <SelectItem value="arrived">Arrived</SelectItem>
                            <SelectItem value="delayed">Delayed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Flight Route */}
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">From</div>
                        <div className="text-lg font-semibold">{flight.departureAirport}</div>
                        <div className="text-sm">
                          {new Date(flight.scheduledDeparture).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="h-px bg-border flex-1"></div>
                        <Plane className="w-5 h-5 mx-4 text-muted-foreground" />
                        <div className="h-px bg-border flex-1"></div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">To</div>
                        <div className="text-lg font-semibold">{flight.arrivalAirport}</div>
                        <div className="text-sm">
                          {new Date(flight.scheduledArrival).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Guest and Details */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {flight.guestName || 'Guest'}
                        </div>
                        {flight.gate && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Gate {flight.gate}
                          </div>
                        )}
                        {flight.seat && (
                          <div>Seat {flight.seat}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(flight.scheduledDeparture).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Special Requirements */}
                    {flight.specialRequirements.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Special Requirements:</span>
                        <div className="flex gap-1">
                          {flight.specialRequirements.map((req, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {req}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Assistance Request Dialog */}
      <Dialog open={showAssistanceDialog} onOpenChange={setShowAssistanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Airport Assistance</DialogTitle>
          </DialogHeader>
          <Form {...assistanceForm}>
            <form onSubmit={assistanceForm.handleSubmit(createAssistanceRequest)} className="space-y-4">
              <FormField
                control={assistanceForm.control}
                name="flightId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Flight</FormLabel>
                    <FormControl>
                      <Input 
                        value={selectedFlight ? `${selectedFlight.airline} ${selectedFlight.flightNumber}` : ''}
                        disabled
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={assistanceForm.control}
                name="assistanceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assistance Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assistance type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pickup">Airport Pickup</SelectItem>
                        <SelectItem value="checkin">Check-in Assistance</SelectItem>
                        <SelectItem value="wheelchair">Wheelchair Assistance</SelectItem>
                        <SelectItem value="language">Language Support</SelectItem>
                        <SelectItem value="customs">Customs Support</SelectItem>
                        <SelectItem value="baggage">Baggage Assistance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={assistanceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional details about the assistance needed..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={assistanceForm.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={assistanceForm.control}
                  name="meetingPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Point</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Arrivals Gate A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAssistanceDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Request Assistance
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlightCoordination;