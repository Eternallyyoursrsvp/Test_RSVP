import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { get, post, put, del } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plane, 
  Users, 
  Clock, 
  MapPin, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  Plus,
  Edit,
  Search,
  Filter,
  Download,
  RefreshCw,
  Phone,
  Mail,
  User,
  Route,
  Luggage,
  Building,
  CreditCard
} from "lucide-react";
import { useCurrentEvent } from '@/hooks/use-current-event';
import { useTravelData } from '@/hooks/use-travel-data';
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { CORE_PERMISSIONS } from "@/hooks/use-permissions";
import FlightCoordinationWorkflow from "@/components/travel/flight-coordination-workflow";

interface TravelInfo {
  id: number;
  guestId: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  travelMode: string;
  flightNumber?: string;
  arrivalTime?: string;
  departureTime?: string;
  originAirport?: string;
  destinationAirport?: string;
  airline?: string;
  status: string;
  needsFlightAssistance: boolean;
  accommodationPreference?: string;
  specialRequests?: string;
}

interface AirportRepresentative {
  id: number;
  name: string;
  phone: string;
  email: string;
  airport: string;
  languages: string[];
  isActive: boolean;
}

export default function TravelManagement() {
  const { toast } = useToast();
  const { currentEvent } = useCurrentEvent();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isGuestTravelDialogOpen, setIsGuestTravelDialogOpen] = useState(false);
  const [isRepDialogOpen, setIsRepDialogOpen] = useState(false);
  const [selectedTravelInfo, setSelectedTravelInfo] = useState<TravelInfo | null>(null);
  
  const eventId = currentEvent?.id;

  // Use ultra-fast batch travel data
  const { 
    travelGuests: travelData = [], 
    airportReps = [],
    travelSettings = {},
    statistics: travelStats = {
      totalGuests: 0,
      withFlightInfo: 0,
      confirmed: 0,
      pending: 0,
      needsAssistance: 0,
      completionRate: 0
    },
    isLoading: isLoadingTravel
  } = useTravelData();

  // All data now comes from the ultra-fast batch hook above

  // Filter travel data based on search and status
  const filteredTravelData = React.useMemo(() => {
    return travelData.filter((travel: any) => {
      const matchesSearch = !searchTerm || 
        travel.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        travel.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        travel.flightInfo?.flightNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || travel.flightStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [travelData, searchTerm, statusFilter]);

  const getStatusBadge = (status: string) => {
    const config = {
      'confirmed': { variant: 'default' as const, color: 'text-green-600' },
      'pending': { variant: 'secondary' as const, color: 'text-yellow-600' },
      'cancelled': { variant: 'destructive' as const, color: 'text-red-600' }
    };
    
    return config[status as keyof typeof config] || { variant: 'outline' as const, color: 'text-gray-600' };
  };

  if (!eventId) {
    return (
      <DashboardLayout>
        <Card className="glass">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Event Selected</h3>
            <p className="text-muted-foreground">Please select an event to manage travel coordination</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute requiredPermission={CORE_PERMISSIONS.TRANSPORT_READ}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Travel Statistics Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Travelers</p>
                    <p className="text-2xl font-bold">{travelStats.totalGuests}</p>
                  <p className="text-xs text-muted-foreground">guests with travel info</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Confirmed Flights</p>
                  <p className="text-2xl font-bold text-green-600">{travelStats.confirmed}</p>
                  <p className="text-xs text-green-600">ready for coordination</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Coordination</p>
                  <p className="text-2xl font-bold text-yellow-600">{travelStats.pending}</p>
                  <p className="text-xs text-yellow-600">awaiting confirmation</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Need Assistance</p>
                  <p className="text-2xl font-bold text-purple-600">{travelStats.needsAssistance}</p>
                  <p className="text-xs text-purple-600">require special help</p>
                </div>
                <Luggage className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Travel Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center">
            <TabsList className="glass">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="workflow">Flight Coordination</TabsTrigger>
              <TabsTrigger value="guests">Guest Travel</TabsTrigger>
              <TabsTrigger value="representatives">Airport Reps</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetchTravel()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setIsGuestTravelDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Travel Info
              </Button>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Travel Coordination Overview</CardTitle>
                <CardDescription>
                  Complete overview of guest travel coordination and flight management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Travel Settings</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Flight Mode:</span>
                        <Badge variant="outline">
                          {travelSettings?.flightMode?.replace('_', ' ') || 'Not configured'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Travel Assistance:</span>
                        <Badge variant={travelSettings?.offerTravelAssistance ? 'default' : 'outline'}>
                          {travelSettings?.offerTravelAssistance ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Buffer Times:</span>
                        <span className="text-sm">
                          {travelSettings?.arrivalBufferTime || 'N/A'} / {travelSettings?.departureBufferTime || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Recent Activity</h4>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        No recent travel activities to display
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Coordination Progress</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">
                      {travelStats.confirmed} of {travelStats.totalGuests} guests have confirmed travel details
                    </span>
                    <div className="text-xl font-bold text-blue-600">
                      {travelStats.completionRate}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-4">
            <FlightCoordinationWorkflow />
          </TabsContent>

          <TabsContent value="guests" className="space-y-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Guest Travel Information</CardTitle>
                <CardDescription>
                  Manage individual guest travel details and flight information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filter */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, or flight number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Guest Travel Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guest</TableHead>
                        <TableHead>Flight Info</TableHead>
                        <TableHead>Travel Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assistance</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTravelData.map((travel: any) => {
                        const statusConfig = getStatusBadge(travel.flightStatus || 'pending');
                        
                        return (
                          <TableRow key={travel.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{travel.name}</p>
                                  <p className="text-xs text-muted-foreground">{travel.email}</p>
                                  {travel.phone && (
                                    <p className="text-xs text-muted-foreground">{travel.phone}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {travel.flightInfo ? (
                                <div>
                                  <p className="font-medium">{travel.flightInfo.flightNumber}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {travel.flightInfo.airline}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {travel.flightInfo.originAirport} → {travel.flightInfo.destinationAirport}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No flight info</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {travel.flightInfo ? (
                                <div>
                                  <p className="text-xs">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    Arrival: {travel.flightInfo.arrivalTime ? 
                                      format(new Date(travel.flightInfo.arrivalTime), 'MMM dd, HH:mm') : 'TBD'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3 inline mr-1" />
                                    Departure: {travel.flightInfo.departureTime ? 
                                      format(new Date(travel.flightInfo.departureTime), 'MMM dd, HH:mm') : 'TBD'}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Pending</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusConfig.variant}>
                                {travel.flightStatus || 'pending'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={travel.needsFlightAssistance ? 'default' : 'outline'}>
                                {travel.needsFlightAssistance ? 'Required' : 'Self-managed'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTravelInfo(travel);
                                    setIsGuestTravelDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Mail className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Phone className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {filteredTravelData.length === 0 && (
                  <div className="text-center py-8">
                    <Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Travel Information</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'No guests match your search criteria' 
                        : 'No guest travel information available'}
                    </p>
                    <Button onClick={() => setIsGuestTravelDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Travel Information
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="representatives" className="space-y-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Airport Representatives</CardTitle>
                <CardDescription>
                  Manage airport representatives for guest assistance coordination
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    {airportReps.length} representatives available for coordination
                  </p>
                  <Button onClick={() => setIsRepDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Representative
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {airportReps.map((rep: AirportRepresentative) => (
                    <Card key={rep.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{rep.name}</h4>
                          <Badge variant={rep.isActive ? 'default' : 'outline'}>
                            {rep.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            <Building className="h-3 w-3 inline mr-1" />
                            {rep.airport}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 inline mr-1" />
                            {rep.phone}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <Mail className="h-3 w-3 inline mr-1" />
                            {rep.email}
                          </p>
                          {rep.languages && rep.languages.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Languages: {rep.languages.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 mt-3">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Phone className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Mail className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {airportReps.length === 0 && (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Representatives</h3>
                    <p className="text-muted-foreground mb-4">Add airport representatives to coordinate guest assistance</p>
                    <Button onClick={() => setIsRepDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Representative
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Travel Coordination Settings</CardTitle>
                <CardDescription>
                  Configure travel assistance and flight coordination preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Flight Coordination Mode</Label>
                    <Select value={travelSettings?.flightMode || 'none'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Flight Coordination</SelectItem>
                        <SelectItem value="guidance">Guidance Only</SelectItem>
                        <SelectItem value="list_collection">List Collection for Travel Agent</SelectItem>
                        <SelectItem value="full_coordination">Full Coordination Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Arrival Buffer Time</Label>
                      <Input 
                        value={travelSettings?.arrivalBufferTime || ''} 
                        placeholder="01:00"
                        disabled
                      />
                    </div>
                    <div>
                      <Label>Departure Buffer Time</Label>
                      <Input 
                        value={travelSettings?.departureBufferTime || ''} 
                        placeholder="02:00"
                        disabled
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Flight Instructions</Label>
                    <Textarea 
                      value={travelSettings?.flightInstructions || ''} 
                      placeholder="Special flight coordination instructions..."
                      rows={3}
                      disabled
                    />
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Travel settings are configured during event setup. 
                      Use the Event Setup Wizard to modify these settings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}