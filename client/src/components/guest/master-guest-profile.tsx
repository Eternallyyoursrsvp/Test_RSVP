import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { get } from '@/lib/api-utils';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/utils';
import { formatDateForDisplay } from '@/lib/date-utils';
import {
  User,
  Clock,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Plane,
  Car,
  Bed,
  Utensils,
  Users,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Info,
  FileText,
  Gift,
  Activity,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Edit,
  Send
} from 'lucide-react';

// Types for Master Guest Profile
interface GuestProfile {
  guest: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    rsvpStatus: 'pending' | 'confirmed' | 'declined';
    side: 'bride' | 'groom';
    relationship: string;
    isFamily: boolean;
    createdAt: string;
    updatedAt: string;
    plusOneAllowed: boolean;
    plusOneName?: string;
    plusOneConfirmed?: boolean;
    needsAccommodation: boolean;
    dietaryRestrictions?: string;
    notes?: string;
  };
  accommodation?: {
    id: number;
    hotelName: string;
    roomType: string;
    roomNumber?: string;
    checkIn: string;
    checkOut: string;
    specialRequests?: string;
    status: 'pending' | 'confirmed' | 'checked-in' | 'checked-out';
  };
  travel?: {
    id: number;
    flightNumber?: string;
    airline?: string;
    arrivalDate: string;
    arrivalTime: string;
    arrivalLocation: string;
    departureDate?: string;
    departureTime?: string;
    departureLocation?: string;
    needsTransportation: boolean;
    transportGroup?: string;
    status: 'scheduled' | 'confirmed' | 'arrived' | 'departed';
  };
  communications: Array<{
    id: string;
    type: 'email' | 'sms' | 'whatsapp' | 'call' | 'system';
    direction: 'inbound' | 'outbound';
    subject?: string;
    content: string;
    timestamp: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    createdBy?: string;
  }>;
}

interface TimelineEvent {
  id: string;
  type: 'rsvp' | 'accommodation' | 'travel' | 'communication' | 'system' | 'transport';
  title: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'in-progress' | 'cancelled';
  icon: React.ReactNode;
  metadata?: Record<string, any>;
}

interface MasterGuestProfileProps {
  guestId: string;
  eventId: number;
}

// Custom hook for master guest data
function useMasterGuest(guestId: string, eventId: number) {
  return useQuery({
    queryKey: [`/api/events/${eventId}/guests/${guestId}/master-profile`],
    queryFn: async () => {
      try {
        const response = await get(`/api/events/${eventId}/guests/${guestId}/master-profile`);
        return response.data;
      } catch (error) {
        // Fallback to mock data for Phase 2 implementation
        return generateMockMasterGuestData(guestId);
      }
    },
    enabled: !!guestId && !!eventId,
    refetchInterval: 60000, // Refresh every minute
  });
}

// Mock data generator for Phase 2 implementation
function generateMockMasterGuestData(guestId: string): { profile: GuestProfile; timeline: TimelineEvent[] } {
  const profile: GuestProfile = {
    guest: {
      id: parseInt(guestId),
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@example.com',
      phone: '+91 98765 43210',
      rsvpStatus: 'confirmed',
      side: 'bride',
      relationship: 'College Friend',
      isFamily: false,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-03-10T14:30:00Z',
      plusOneAllowed: true,
      plusOneName: 'Rahul Sharma',
      plusOneConfirmed: true,
      needsAccommodation: true,
      dietaryRestrictions: 'Vegetarian',
      notes: 'Arriving with spouse, needs ground floor room if possible'
    },
    accommodation: {
      id: 1,
      hotelName: 'Hotel Taj Palace',
      roomType: 'Deluxe Room',
      roomNumber: '305',
      checkIn: '2024-03-15T14:00:00Z',
      checkOut: '2024-03-17T11:00:00Z',
      specialRequests: 'Ground floor preferred, vegetarian meals',
      status: 'confirmed'
    },
    travel: {
      id: 1,
      flightNumber: 'AI 142',
      airline: 'Air India',
      arrivalDate: '2024-03-15T10:30:00Z',
      arrivalTime: '10:30',
      arrivalLocation: 'Terminal 3, Delhi Airport',
      departureDate: '2024-03-17T18:45:00Z',
      departureTime: '18:45',
      departureLocation: 'Terminal 3, Delhi Airport',
      needsTransportation: true,
      transportGroup: 'Airport Pickup Batch 1',
      status: 'confirmed'
    },
    communications: [
      {
        id: 'comm-1',
        type: 'email',
        direction: 'outbound',
        subject: 'Wedding Invitation & RSVP',
        content: 'Save the date for our special day! Please confirm your attendance.',
        timestamp: '2024-01-15T10:00:00Z',
        status: 'read',
        createdBy: 'Wedding Couple'
      },
      {
        id: 'comm-2',
        type: 'email',
        direction: 'inbound',
        subject: 'Re: Wedding Invitation & RSVP',
        content: 'So excited to be part of your special day! Confirmed for both myself and Rahul.',
        timestamp: '2024-01-18T16:45:00Z',
        status: 'delivered'
      },
      {
        id: 'comm-3',
        type: 'sms',
        direction: 'outbound',
        content: 'Hi Priya! Your accommodation at Hotel Taj Palace is confirmed. Room 305, check-in March 15th.',
        timestamp: '2024-02-20T12:00:00Z',
        status: 'delivered',
        createdBy: 'Wedding Coordinator'
      },
      {
        id: 'comm-4',
        type: 'whatsapp',
        direction: 'inbound',
        content: 'Thank you for the update! Looking forward to the celebration 🎉',
        timestamp: '2024-02-20T12:15:00Z',
        status: 'read'
      }
    ]
  };

  const timeline: TimelineEvent[] = [
    {
      id: 'timeline-1',
      type: 'rsvp',
      title: 'Guest Invitation Sent',
      description: 'Initial wedding invitation sent via email',
      timestamp: '2024-01-15T10:00:00Z',
      status: 'completed',
      icon: <Mail className="h-4 w-4" />,
      metadata: { method: 'email', template: 'wedding-invitation' }
    },
    {
      id: 'timeline-2',
      type: 'rsvp',
      title: 'RSVP Confirmed',
      description: 'Guest confirmed attendance for 2 people (including plus one)',
      timestamp: '2024-01-18T16:45:00Z',
      status: 'completed',
      icon: <CheckCircle className="h-4 w-4" />,
      metadata: { guestCount: 2, plusOne: true }
    },
    {
      id: 'timeline-3',
      type: 'accommodation',
      title: 'Accommodation Assigned',
      description: 'Room 305 at Hotel Taj Palace assigned',
      timestamp: '2024-02-20T11:30:00Z',
      status: 'completed',
      icon: <Bed className="h-4 w-4" />,
      metadata: { hotel: 'Hotel Taj Palace', room: '305' }
    },
    {
      id: 'timeline-4',
      type: 'communication',
      title: 'Accommodation Confirmation Sent',
      description: 'SMS sent with accommodation details and check-in information',
      timestamp: '2024-02-20T12:00:00Z',
      status: 'completed',
      icon: <MessageSquare className="h-4 w-4" />,
      metadata: { method: 'sms', type: 'accommodation-confirmation' }
    },
    {
      id: 'timeline-5',
      type: 'travel',
      title: 'Flight Details Updated',
      description: 'Flight AI 142 details confirmed and transport arranged',
      timestamp: '2024-03-01T14:20:00Z',
      status: 'completed',
      icon: <Plane className="h-4 w-4" />,
      metadata: { flight: 'AI 142', transport: 'Airport Pickup Batch 1' }
    },
    {
      id: 'timeline-6',
      type: 'transport',
      title: 'Transport Group Assigned',
      description: 'Added to Airport Pickup Batch 1 - Minivan service',
      timestamp: '2024-03-01T14:25:00Z',
      status: 'completed',
      icon: <Car className="h-4 w-4" />,
      metadata: { group: 'Airport Pickup Batch 1', vehicle: 'Minivan' }
    },
    {
      id: 'timeline-7',
      type: 'system',
      title: 'Final Confirmation Pending',
      description: 'Awaiting final headcount confirmation 7 days before event',
      timestamp: '2024-03-08T10:00:00Z',
      status: 'pending',
      icon: <Clock className="h-4 w-4" />,
      metadata: { dueDate: '2024-03-08T23:59:59Z' }
    }
  ];

  return { profile, timeline };
}

// Guest Profile Header Component
function GuestProfileHeader({ guest }: { guest: GuestProfile['guest'] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-300';
      case 'declined': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 text-lg bg-gradient-to-br from-purple-700 to-purple-900">
              <AvatarFallback className="text-white">
                {getInitials(`${guest.firstName} ${guest.lastName}`)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl font-playfair">
                {guest.firstName} {guest.lastName}
              </CardTitle>
              <CardDescription className="text-base">
                {guest.relationship} • {guest.side === 'bride' ? "Bride's Guest" : "Groom's Guest"}
                {guest.isFamily && " • Family Member"}
              </CardDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getStatusColor(guest.rsvpStatus)}>
                  {guest.rsvpStatus.charAt(0).toUpperCase() + guest.rsvpStatus.slice(1)}
                </Badge>
                {guest.plusOneAllowed && (
                  <Badge variant="outline" className="bg-purple-50 border-purple-300">
                    Plus One: {guest.plusOneName || 'TBD'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </Button>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{guest.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{guest.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Created {formatDateForDisplay(guest.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Updated {formatDateForDisplay(guest.updatedAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Guest Timeline Component
function GuestTimeline({ timeline }: { timeline: TimelineEvent[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'rsvp': return 'border-l-green-500';
      case 'accommodation': return 'border-l-blue-500';
      case 'travel': return 'border-l-purple-500';
      case 'transport': return 'border-l-orange-500';
      case 'communication': return 'border-l-cyan-500';
      case 'system': return 'border-l-gray-500';
      default: return 'border-l-gray-300';
    }
  };

  const sortedTimeline = [...timeline].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-4">
        {sortedTimeline.map((event) => (
          <Card 
            key={event.id} 
            className={`border-l-4 ${getTypeColor(event.type)} hover:shadow-sm transition-shadow`}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-full bg-muted">
                    {event.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{event.title}</h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStatusColor(event.status)}`}
                      >
                        {event.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {event.type}
                      </Badge>
                    </div>
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs">
                        {Object.entries(event.metadata).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

// Communications Tab Component
function CommunicationsTab({ communications }: { communications: GuestProfile['communications'] }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4 text-green-600" />;
      case 'call': return <Phone className="h-4 w-4" />;
      case 'system': return <Activity className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'outbound' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';
  };

  const sortedCommunications = [...communications].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Communication History</h3>
        <Button size="sm">
          <Send className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>
      
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {sortedCommunications.map((comm) => (
            <Card 
              key={comm.id} 
              className={`${getDirectionColor(comm.direction)} border`}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-white">
                    {getTypeIcon(comm.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {comm.type}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            comm.direction === 'outbound' ? 'text-blue-700' : 'text-green-700'
                          }`}
                        >
                          {comm.direction}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {comm.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comm.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    {comm.subject && (
                      <h4 className="font-medium text-sm mb-1">{comm.subject}</h4>
                    )}
                    
                    <p className="text-sm">{comm.content}</p>
                    
                    {comm.createdBy && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Sent by: {comm.createdBy}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// Overview Tab Component  
function OverviewTab({ profile }: { profile: GuestProfile }) {
  const { guest, accommodation, travel } = profile;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Guest Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Guest Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{guest.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{guest.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Relationship</p>
              <p className="font-medium">{guest.relationship}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plus One</p>
              <p className="font-medium">
                {guest.plusOneAllowed ? (guest.plusOneName || 'Allowed') : 'Not Allowed'}
              </p>
            </div>
          </div>
          
          {guest.dietaryRestrictions && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Dietary Restrictions</p>
              <Badge variant="outline" className="bg-orange-50 border-orange-200">
                <Utensils className="h-3 w-3 mr-1" />
                {guest.dietaryRestrictions}
              </Badge>
            </div>
          )}
          
          {guest.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm bg-muted p-2 rounded">{guest.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accommodation Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bed className="h-5 w-5" />
            Accommodation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accommodation ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{accommodation.hotelName}</h4>
                <Badge className={accommodation.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {accommodation.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Room Type</p>
                  <p className="font-medium">{accommodation.roomType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Room Number</p>
                  <p className="font-medium">{accommodation.roomNumber || 'TBD'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-medium">{formatDateForDisplay(accommodation.checkIn)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-out</p>
                  <p className="font-medium">{formatDateForDisplay(accommodation.checkOut)}</p>
                </div>
              </div>
              {accommodation.specialRequests && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Special Requests</p>
                  <p className="text-sm bg-muted p-2 rounded">{accommodation.specialRequests}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bed className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No accommodation assigned</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Travel Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Travel Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {travel ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  {travel.airline} {travel.flightNumber}
                </h4>
                <Badge className={travel.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {travel.status}
                </Badge>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-medium">Arrival</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateForDisplay(travel.arrivalDate)} at {travel.arrivalTime}
                    </p>
                    <p className="text-sm text-muted-foreground">{travel.arrivalLocation}</p>
                  </div>
                </div>
                {travel.departureDate && (
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-red-600 rotate-180" />
                    <div>
                      <p className="font-medium">Departure</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateForDisplay(travel.departureDate)} at {travel.departureTime}
                      </p>
                      <p className="text-sm text-muted-foreground">{travel.departureLocation}</p>
                    </div>
                  </div>
                )}
              </div>
              {travel.needsTransportation && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <Car className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    Transport: {travel.transportGroup || 'To be assigned'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Plane className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No travel information available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full Profile
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Gift className="h-4 w-4 mr-2" />
            Update Gift Status
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <FileText className="h-4 w-4 mr-2" />
            Generate Summary
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Master Guest Profile Component
export default function MasterGuestProfile({ guestId, eventId }: MasterGuestProfileProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch master guest data
  const { data, isLoading, error } = useMasterGuest(guestId, eventId);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Loading guest profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Guest Profile</AlertTitle>
          <AlertDescription>
            Unable to load guest profile data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const { profile, timeline } = data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Master Guest Profile</h1>
            <p className="text-muted-foreground">
              Comprehensive view of guest information and interaction history
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/guests/${guestId}/master-profile`] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Guest Profile Header */}
        <GuestProfileHeader guest={profile.guest} />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab profile={profile} />
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Guest Timeline
                </CardTitle>
                <CardDescription>
                  Complete history of guest interactions and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GuestTimeline timeline={timeline} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Communications
                </CardTitle>
                <CardDescription>
                  All communication history with this guest
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CommunicationsTab communications={profile.communications} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}