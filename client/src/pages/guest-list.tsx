import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { CORE_PERMISSIONS } from "@/hooks/use-permissions";
import { GuestListErrorBoundary } from "./guest-list-error-boundary";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useOptimizedCurrentEvent, useOptimizedGuests } from "@/hooks/use-optimized-queries";
import { useQuery, useMutation } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api-utils";
import { queryClient } from "@/lib/queryClient";
import GuestFormSinglePage from "@/components/ui/guest-form";
import GuestImportDialog from "@/components/guest/guest-import-dialog";
import GuestDetailDialog from "@/components/guest/guest-detail-dialog";
import { getRsvpStatusColor, getInitials, cn } from "@/lib/utils";
import { formatDateForDisplay } from "@/lib/date-utils";
import { 
  Plus, 
  FileDown, 
  FileUp, 
  Pencil, 
  Trash2, 
  Eye,
  Mail,
  Phone,
  MapPin,
  Users,
  UserPlus,
  User,
  Car,
  Bed,
  Plane,
  Utensils,
  Hotel,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// Professional guest statistics cards with 2-stage RSVP integration
interface GuestStatsCardsProps {
  stats: any;
  eventConfig: any;
}

function GuestStatsCards({ stats, eventConfig }: GuestStatsCardsProps) {
  const rsvpStage1Stats = {
    total: stats?.total || 0,
    confirmed: stats?.confirmed || 0,
    pending: stats?.pending || 0,
    declined: stats?.declined || 0,
    responseRate: stats?.total ? Math.round(((stats?.confirmed + stats?.declined) / stats?.total) * 100) : 0
  };

  const rsvpStage2Stats = {
    accommodationRequired: stats?.accommodationRequired || 0,
    travelAssistanceRequired: stats?.travelAssistanceRequired || 0,
    dietaryRestrictions: stats?.dietaryRestrictions || 0,
    plusOnes: stats?.plusOnes || 0
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Stage 1 RSVP Overview */}
      <Card className="glassmorphism">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Guests</p>
              <p className="text-3xl font-bold text-primary">{rsvpStage1Stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Response Rate: {rsvpStage1Stats.responseRate}%
          </div>
        </CardContent>
      </Card>

      <Card className="glassmorphism">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
              <p className="text-3xl font-bold text-green-600">{rsvpStage1Stats.confirmed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Stage 1 RSVP Complete
          </div>
        </CardContent>
      </Card>

      <Card className="glassmorphism">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{rsvpStage1Stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Awaiting Response
          </div>
        </CardContent>
      </Card>

      <Card className="glassmorphism">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Declined</p>
              <p className="text-3xl font-bold text-red-600">{rsvpStage1Stats.declined}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Cannot Attend
          </div>
        </CardContent>
      </Card>

      {/* Stage 2 RSVP Details - Show only if relevant features are enabled */}
      {(eventConfig?.accommodationMode !== 'none' || eventConfig?.transportMode !== 'none' || eventConfig?.flightMode !== 'none') && (
        <>
          {eventConfig?.accommodationMode !== 'none' && (
            <Card className="glassmorphism">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Need Accommodation</p>
                    <p className="text-3xl font-bold text-blue-600">{rsvpStage2Stats.accommodationRequired}</p>
                  </div>
                  <Hotel className="h-8 w-8 text-blue-600" />
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Stage 2 RSVP Details
                </div>
              </CardContent>
            </Card>
          )}

          {(eventConfig?.transportMode !== 'none' || eventConfig?.flightMode !== 'none') && (
            <Card className="glassmorphism">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Travel Assistance</p>
                    <p className="text-3xl font-bold text-purple-600">{rsvpStage2Stats.travelAssistanceRequired}</p>
                  </div>
                  <Plane className="h-8 w-8 text-purple-600" />
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Flight Coordination
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dietary Requirements</p>
                  <p className="text-3xl font-bold text-orange-600">{rsvpStage2Stats.dietaryRestrictions}</p>
                </div>
                <Utensils className="h-8 w-8 text-orange-600" />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Special Meal Prep
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plus Ones</p>
                  <p className="text-3xl font-bold text-pink-600">{rsvpStage2Stats.plusOnes}</p>
                </div>
                <UserPlus className="h-8 w-8 text-pink-600" />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Additional Guests
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function GuestList() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: currentEvent } = useOptimizedCurrentEvent();
  const currentEventId = currentEvent?.data?.id;
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Selected guest for operations
  const [selectedGuest, setSelectedGuest] = useState<any>(null);

  // Get parameters from URL query params
  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const editGuestId = urlParams.get("edit");
  const addGuest = urlParams.get("add");
  const filter = urlParams.get("filter");

  // Use the current event ID from the context
  const eventId = currentEventId || 1;

  // Fetch event configuration to understand wizard settings
  const { data: eventConfig } = useQuery({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  // Master guest data fetching with simplified reliable data flow
  const { data: masterGuestResponse = {}, isLoading, refetch } = useQuery({
    queryKey: ['/api/events', eventId, 'guests'],
    queryFn: async () => {
      try {
        const response = await get(`/api/events/${eventId}/guests`);
        const guestsData = response.data || response || [];
        return { guests: Array.isArray(guestsData) ? guestsData : [], totalGuests: guestsData.length || 0 };
      } catch (error) {
        return { guests: [], totalGuests: 0 };
      }
    },
    enabled: !!eventId,
  });

  const guests = (masterGuestResponse as any).guests || [];

  // Enhanced guest statistics with master data integration
  const { data: guestStats = null } = useQuery({
    queryKey: ['/api/events', eventId, 'guest-stats-comprehensive'],
    queryFn: async () => {
      try {
        // Get guests data
        const guestsResponse = await get('/api/events/' + eventId + '/guests');
        const guestsList = guestsResponse.data || guestsResponse || [];
        
        if (!Array.isArray(guestsList)) return defaultStats;
        
        // Calculate comprehensive statistics for both RSVP stages
        const stats = {
          // Stage 1 RSVP Statistics
          total: guestsList.length,
          confirmed: guestsList.filter((g: any) => 
            g.rsvpStatus === 'confirmed' || g.rsvpStatus === 'yes'
          ).length,
          pending: guestsList.filter((g: any) => 
            g.rsvpStatus === 'pending' || !g.rsvpStatus
          ).length,
          declined: guestsList.filter((g: any) => 
            g.rsvpStatus === 'declined' || g.rsvpStatus === 'no'
          ).length,
          
          // Stage 2 RSVP Statistics (detailed logistics)
          plusOnes: guestsList.filter((g: any) => g.plusOneAllowed && g.plusOneName?.trim()).length,
          accommodationRequired: guestsList.filter((g: any) => g.needsAccommodation).length,
          travelAssistanceRequired: guestsList.filter((g: any) => 
            g.travelMode === 'air' || g.needsTransportation
          ).length,
          dietaryRestrictions: guestsList.filter((g: any) => 
            g.dietaryRestrictions?.trim() || g.allergies?.trim()
          ).length,
          
          // Children and family statistics
          withChildren: guestsList.filter((g: any) => 
            (g.childrenDetails && Array.isArray(g.childrenDetails) && g.childrenDetails.length > 0) ||
            g.numberOfChildren > 0
          ).length,
          familyMembers: guestsList.filter((g: any) => g.isFamily).length,
          
          // Ceremony-specific stats (if ceremonies are configured)
          brideGuests: guestsList.filter((g: any) => g.side === 'bride').length,
          groomGuests: guestsList.filter((g: any) => g.side === 'groom').length,
          mutualGuests: guestsList.filter((g: any) => g.side === 'mutual').length,
          
          // Communication preferences
          whatsappEnabled: guestsList.filter((g: any) => g.whatsappAvailable).length,
          emailContacts: guestsList.filter((g: any) => g.email?.trim()).length,
          
          // Integration with wizard configuration
          wizardConfig: {
            accommodationMode: (eventConfig as any)?.accommodationMode || 'none',
            transportMode: (eventConfig as any)?.transportMode || 'none', 
            flightMode: (eventConfig as any)?.flightMode || 'none',
            showAccommodationStats: (eventConfig as any)?.accommodationMode !== 'none',
            showTravelStats: ((eventConfig as any)?.transportMode !== 'none') || ((eventConfig as any)?.flightMode !== 'none'),
            rsvpStage1Enabled: true, // Always enabled
            rsvpStage2Enabled: (eventConfig as any)?.accommodationMode !== 'none' || 
                              (eventConfig as any)?.transportMode !== 'none' || 
                              (eventConfig as any)?.flightMode !== 'none'
          }
        };
        
        return stats;
      } catch (error) {
        return defaultStats;
      }
    },
    enabled: !!eventId && !!eventConfig,
  });

  // Helper functions for comprehensive guest management
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const defaultStats = {
    total: 0,
    confirmed: 0,
    pending: 0,
    declined: 0,
    plusOnes: 0,
    accommodationRequired: 0,
    travelAssistanceRequired: 0,
    dietaryRestrictions: 0,
    wizardConfig: {
      accommodationMode: 'none',
      transportMode: 'none',
      flightMode: 'none',
      showAccommodationStats: false,
      showTravelStats: false
    }
  };

  // Handle URL parameters for guest operations
  useEffect(() => {
    if (editGuestId && guests.length > 0) {
      const guest = guests.find((g: any) => g.id.toString() === editGuestId);
      if (guest) {
        setSelectedGuest(guest);
        setShowEditDialog(true);
      }
    }
    
    if (addGuest === "true") {
      setShowAddDialog(true);
    }
  }, [editGuestId, addGuest, guests]);

  // Create guest mutation
  const createGuestMutation = useMutation({
    mutationFn: async (guestData: any) => {
      const response = await post('/api/events/' + eventId + '/guests', guestData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/events', eventId, 'guests']
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/events', eventId, 'guest-stats-comprehensive']
      });
      refetch();
      setShowAddDialog(false);
      setLocation("/guests");
      toast({
        title: "Guest Added",
        description: "The guest has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Add Guest",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    },
  });

  // Update guest mutation
  const updateGuestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await put('/api/guests/' + id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/events', eventId, 'guests']
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/events', eventId, 'guest-stats-comprehensive']
      });
      refetch();
      setShowEditDialog(false);
      setSelectedGuest(null);
      setLocation("/guests");
      toast({
        title: "Guest Updated",
        description: "The guest has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Update Guest",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    },
  });

  // Delete guest mutation
  const deleteGuestMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await del('/api/guests/' + id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/events', eventId, 'guests']
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/events', eventId, 'guest-stats-comprehensive']
      });
      refetch();
      setShowDeleteDialog(false);
      setSelectedGuest(null);
      toast({
        title: "Guest Deleted",
        description: "The guest has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Delete Guest",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    },
  });

  // Contact preference update mutation
  const updateContactPreference = useMutation({
    mutationFn: async ({ guestId, plusOneRsvpContact }: { guestId: number; plusOneRsvpContact: boolean }) => {
      const response = await fetch(`/api/guests/${guestId}/contact-preference`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ plusOneRsvpContact }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update contact preference');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/events', eventId, 'master-guest-data']
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/events', eventId, 'guest-stats-integrated']
      });
      refetch();
      toast({
        title: "Contact Updated",
        description: "RSVP contact preference updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update contact preference",
      });
    },
  });

  // Inline editing states for data table
  const [editingGuestId, setEditingGuestId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      if (guests.length === 0) {
        toast({
          variant: "destructive",
          title: "No Data to Export",
          description: "There are no guests to export.",
        });
        return;
      }

      // Format guests for export without template literals
      const formattedGuests = guests.map((guest: any) => ({
        "First Name": guest.firstName || "",
        "Last Name": guest.lastName || "",
        "Email": guest.email || "",
        "Phone": guest.phone || "",
        "RSVP Status": guest.rsvpStatus || "pending",
        "Plus One": guest.plusOne ? "Yes" : "No",
        "Plus One Name": guest.plusOneName || "",
        "Relationship": guest.relationship || "",
        "Address": guest.address || "",
        "City": guest.city || "",
        "State": guest.state || "",
        "Country": guest.country || "",
        "Dietary Restrictions": Array.isArray(guest.dietaryRestrictions) 
          ? guest.dietaryRestrictions.join(", ") 
          : guest.dietaryRestrictions || "",
        "Special Requests": guest.specialRequests || "",
        "Accommodation Required": guest.accommodationRequired ? "Yes" : "No",
        "Travel Mode": guest.travelMode || "",
        "Arrival Date": guest.arrivalDate || "",
        "Departure Date": guest.departureDate || "",
      }));

      // Create filename without template literals
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = "guest-list-" + timestamp + ".xlsx";

      // Simple export function
      const worksheet = formattedGuests;
      const blob = new Blob([JSON.stringify(worksheet)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Guest list has been exported successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export guest list. Please try again.",
      });
    }
  };

  const handleImport = () => {
    setShowImportDialog(true);
  };

  const handleAddGuest = () => {
    setShowAddDialog(true);
  };

  const handleViewGuest = (guest: any) => {
    setSelectedGuest(guest);
    setShowDetailDialog(true);
  };

  const handleEditGuest = (guest: any) => {
    setSelectedGuest(guest);
    setShowEditDialog(true);
  };

  const handleDeleteGuest = (guest: any) => {
    setSelectedGuest(guest);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedGuest) {
      deleteGuestMutation.mutate(selectedGuest.id);
    }
  };

  const getRsvpStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-300";
      case "declined":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
    }
  };

  const getAccommodationIcon = (guest: any) => {
    if (guest.accommodationRequired) {
      return <Bed className="h-4 w-4 text-blue-500" />;
    }
    return null;
  };

  const getTravelIcon = (guest: any) => {
    switch (guest.travelMode) {
      case "air":
        return <Plane className="h-4 w-4 text-blue-500" />;
      case "train":
        return <Car className="h-4 w-4 text-green-500" />;
      case "road":
        return <Car className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };



  // Inline editing handlers
  const handleInlineEdit = (guestId: number, field: string) => {
    setEditingGuestId(guestId);
    setEditingField(field);
  };

  const handleInlineSave = async (guestId: number, field: string, value: any) => {
    try {
      await updateGuestMutation.mutateAsync({ 
        id: guestId, 
        data: { [field]: value } 
      });
      setEditingGuestId(null);
      setEditingField("");
    } catch (error) {
      console.error("Failed to update guest:", error);
    }
  };

  const handleInlineCancel = () => {
    setEditingGuestId(null);
    setEditingField("");
  };

  // Master guest data table columns with inline editing
  const columns = [
    {
      header: "Guest Details",
      accessor: "firstName" as keyof any,
      cell: (guest: any) => {
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-gradient-to-br from-purple-700 to-purple-900">
              <AvatarFallback className="text-white text-sm font-medium">
                {getInitials((guest.firstName || "") + " " + (guest.lastName || ""))}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-sm">
                {(guest.firstName || "") + " " + (guest.lastName || "")}
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {editingGuestId === guest.id && editingField === 'side' ? (
                  <div className="flex items-center space-x-1">
                    <Select
                      defaultValue={guest.side || 'mutual'}
                      onValueChange={(value) => handleInlineSave(guest.id, 'side', value)}
                    >
                      <SelectTrigger className="w-20 h-6 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bride">Bride</SelectItem>
                        <SelectItem value="groom">Groom</SelectItem>
                        <SelectItem value="mutual">Mutual</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0"
                      onClick={handleInlineCancel}
                    >
                      <XCircle className="h-2 w-2" />
                    </Button>
                  </div>
                ) : (
                  <Badge 
                    variant="outline" 
                    className="text-xs capitalize px-1 py-0 cursor-pointer hover:bg-muted/50" 
                    onClick={() => handleInlineEdit(guest.id, 'side')}
                  >
                    {guest.side || 'mutual'}
                  </Badge>
                )}
                {guest.stats?.completionPercentage && (
                  <span className="text-primary font-medium">
                    {guest.stats.completionPercentage}% complete
                  </span>
                )}
              </div>
              {guest.plusOneConfirmed && guest.plusOneName && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  <UserPlus className="h-3 w-3 mr-1" />
                  + {guest.plusOneName}
                </div>
              )}
              {guest.numberOfChildren > 0 && (
                <div className="text-xs text-muted-foreground flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {guest.numberOfChildren} children
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "Contact & Communication", 
      accessor: "email" as keyof any,
      cell: (guest: any) => {
        const isPlusOneContact = guest.plusOneRsvpContact;
        const primaryContact = isPlusOneContact ? {
          email: guest.plusOneEmail,
          phone: guest.plusOnePhone,
          name: guest.plusOneName
        } : {
          email: guest.email,
          phone: guest.phone,
          name: `${guest.firstName} ${guest.lastName}`
        };

        return (
          <div className="space-y-1">
            {/* Primary Contact Display */}
            <div className="flex items-center space-x-1 text-sm">
              <Mail className="h-3 w-3 text-blue-500" />
              <span className="truncate max-w-[150px]">{primaryContact.email || 'No email'}</span>
            </div>
            <div className="flex items-center space-x-1 text-sm">
              <Phone className="h-3 w-3 text-green-500" />
              <span>{primaryContact.phone || 'No phone'}</span>
            </div>
            
            {/* RSVP Contact Control for guests with plus-ones */}
            {guest.plusOneConfirmed && guest.plusOneName && (
              <div className="flex items-center space-x-1 mt-1">
                {editingGuestId === guest.id && editingField === 'plusOneRsvpContact' ? (
                  <div className="flex items-center space-x-1">
                    <Select
                      defaultValue={isPlusOneContact ? 'plus_one' : 'guest'}
                      onValueChange={async (value) => {
                        try {
                          const newValue = value === 'plus_one';
                          await updateContactPreference.mutateAsync({
                            guestId: guest.id,
                            plusOneRsvpContact: newValue
                          });
                          // The mutation will automatically refresh the data
                          setEditingGuestId(null);
                          setEditingField(null);
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to update contact preference",
                            variant: "destructive",
                          });
                          setEditingGuestId(null);
                          setEditingField(null);
                        }
                      }}
                    >
                      <SelectTrigger className="w-24 h-6 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guest">
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            Guest
                          </div>
                        </SelectItem>
                        <SelectItem value="plus_one">
                          <div className="flex items-center">
                            <UserPlus className="h-3 w-3 mr-1" />
                            Plus One
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0"
                      onClick={handleInlineCancel}
                    >
                      <XCircle className="h-2 w-2" />
                    </Button>
                  </div>
                ) : (
                  <Badge 
                    variant={isPlusOneContact ? "default" : "secondary"} 
                    className="text-xs cursor-pointer hover:bg-muted/50" 
                    onClick={() => handleInlineEdit(guest.id, 'plusOneRsvpContact')}
                  >
                    {isPlusOneContact ? (
                      <>
                        <UserPlus className="h-2 w-2 mr-1" />
                        Plus One Contact
                      </>
                    ) : (
                      <>
                        <User className="h-2 w-2 mr-1" />
                        Guest Contact
                      </>
                    )}
                  </Badge>
                )}
              </div>
            )}
            
            {/* Communication Methods */}
            <div className="flex items-center space-x-1">
              {guest.communication?.whatsappEnabled && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  WhatsApp ✓
                </Badge>
              )}
              {guest.communication?.emailAvailable && (
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                  Email ✓
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "RSVP & Attendance",
      accessor: "rsvpStatus" as keyof any,
      cell: (guest: any) => {
        const status = guest.rsvpStatus || 'pending';
        const isEditing = editingGuestId === guest.id && editingField === 'rsvpStatus';
        
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <div className="flex items-center space-x-1">
                  <Select
                    defaultValue={status}
                    onValueChange={(value) => handleInlineSave(guest.id, 'rsvpStatus', value)}
                  >
                    <SelectTrigger className="w-32 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </div>
                      </SelectItem>
                      <SelectItem value="confirmed">
                        <div className="flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Confirmed
                        </div>
                      </SelectItem>
                      <SelectItem value="declined">
                        <div className="flex items-center">
                          <XCircle className="h-3 w-3 mr-1" />
                          Declined
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={handleInlineCancel}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                  onClick={() => handleInlineEdit(guest.id, 'rsvpStatus')}
                >
                  <Badge 
                    variant={status === 'confirmed' ? 'default' : status === 'declined' ? 'destructive' : 'secondary'}
                    className="capitalize"
                  >
                    {status === 'confirmed' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {status === 'declined' && <XCircle className="h-3 w-3 mr-1" />}
                    {status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                    {status}
                  </Badge>
                </div>
              )}
            </div>
            
            {guest.ceremonies && guest.ceremonies.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 inline mr-1" />
                {guest.ceremonies.filter((c: any) => c.attending).length} / {guest.ceremonies.length} ceremonies
              </div>
            )}
            
            {guest.rsvpSubmittedAt && (
              <div className="text-xs text-muted-foreground">
                Submitted: {formatDateForDisplay(guest.rsvpSubmittedAt)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Accommodation",
      accessor: "needsAccommodation" as keyof any,
      cell: (guest: any) => {
        const accommodation = guest.accommodation;
        
        return (
          <div className="space-y-1">
            {accommodation ? (
              <>
                <div className="flex items-center space-x-1 text-sm font-medium">
                  <Hotel className="h-3 w-3 text-blue-500" />
                  {accommodation.hotelName}
                </div>
                <div className="text-xs text-muted-foreground">
                  Room {accommodation.roomNumber} - {accommodation.roomType}
                </div>
                <div className="text-xs text-muted-foreground">
                  {accommodation.checkInDate} to {accommodation.checkOutDate}
                </div>
                {accommodation.checkInStatus && (
                  <Badge variant="outline" className="text-xs">
                    {accommodation.checkInStatus}
                  </Badge>
                )}
              </>
            ) : (
              <div className="text-xs text-muted-foreground flex items-center">
                <Bed className="h-3 w-3 mr-1" />
                Not assigned
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Travel & Transport",
      accessor: "travel" as keyof any,
      cell: (guest: any) => {
        const travel = guest.travel;
        const transport = guest.transport;
        
        return (
          <div className="space-y-1">
            {travel && (
              <div className="space-y-1">
                <div className="flex items-center space-x-1 text-sm">
                  <Plane className="h-3 w-3 text-purple-500" />
                  <span className="capitalize">{travel.travelMode}</span>
                </div>
                {travel.flightNumber && (
                  <div className="text-xs text-muted-foreground">
                    {travel.airline} {travel.flightNumber}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {travel.arrivalDate} {travel.arrivalTime}
                </div>
              </div>
            )}
            
            {transport && (
              <div className="space-y-1">
                <div className="flex items-center space-x-1 text-sm">
                  <Car className="h-3 w-3 text-orange-500" />
                  <span>{transport.groupName}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {transport.pickupTime} from {transport.pickupLocation}
                </div>
              </div>
            )}
            
            {!travel && !transport && (
              <div className="text-xs text-muted-foreground">
                Not coordinated
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Special Requirements",
      accessor: "special" as keyof any,
      cell: (guest: any) => {
        const hasDietary = guest.dietaryRestrictions || guest.allergies;
        const hasMeals = guest.meals && guest.meals.length > 0;
        
        return (
          <div className="space-y-1">
            {hasDietary && (
              <div className="space-y-1">
                <div className="flex items-center space-x-1 text-sm">
                  <Utensils className="h-3 w-3 text-orange-500" />
                  <span className="text-xs">Dietary needs</span>
                </div>
                {guest.dietaryRestrictions && (
                  <div className="text-xs text-muted-foreground">
                    {guest.dietaryRestrictions}
                  </div>
                )}
                {guest.allergies && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Allergies
                  </Badge>
                )}
              </div>
            )}
            
            {hasMeals && (
              <div className="text-xs text-muted-foreground">
                {guest.meals.length} meal selections
              </div>
            )}
            
            {guest.notes && (
              <div className="text-xs text-muted-foreground">
                Special notes available
              </div>
            )}
            
            {!hasDietary && !hasMeals && !guest.notes && (
              <div className="text-xs text-muted-foreground">
                None
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Actions",
      accessor: "id" as keyof any,
      cell: (guest: any) => {
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewGuest(guest)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditGuest(guest)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteGuest(guest)}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <ProtectedRoute requiredPermission={CORE_PERMISSIONS.GUEST_READ}>
      <GuestListErrorBoundary>
        <DashboardLayout
          currentPage="guest-list"
          title="Guest Management"
        >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Guest List</h2>
            <p className="text-muted-foreground">
              Manage your wedding guests for Event ID: {eventId}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddGuest}>
              <Plus className="h-4 w-4 mr-2" />
              Add Guest
            </Button>
            <Button variant="outline" onClick={handleImport}>
              <FileUp className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>



        {/* Comprehensive Guest Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{guestStats?.total || guests.length}</div>
                  <div className="text-sm text-muted-foreground">Total Guests</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {guestStats?.confirmed || guests.filter((g: any) => g.rsvpStatus === 'confirmed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Confirmed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {guestStats?.pending || guests.filter((g: any) => g.rsvpStatus === 'pending').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {guestStats?.declined || guests.filter((g: any) => g.rsvpStatus === 'declined').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Declined</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Statistics Row - Conditionally display based on wizard settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-xl font-bold">
                    {guestStats?.plusOnes || guests.filter((g: any) => g.plusOne).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Plus Ones</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Show accommodation stats only if enabled in wizard */}
          {guestStats?.wizardConfig?.showAccommodationStats && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-xl font-bold">
                      {guestStats?.accommodationRequired || guests.filter((g: any) => g.accommodationRequired).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Need Accommodation</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Show travel stats only if enabled in wizard */}
          {guestStats?.wizardConfig?.showTravelStats && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="text-xl font-bold">
                      {guestStats?.travelAssistanceRequired || guests.filter((g: any) => g.travelMode === 'air').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Travel Assistance</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Show dietary restrictions always */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-xl font-bold">
                    {guestStats?.dietaryRestrictions || guests.filter((g: any) => g.dietaryRestrictions?.trim()).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Dietary Requirements</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Guest Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Guest Management</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="text-muted-foreground">Loading guests...</div>
              </div>
            ) : guests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="text-muted-foreground mb-4">No guests found</div>
                <Button onClick={handleAddGuest}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Guest
                </Button>
              </div>
            ) : (
              <DataTable 
                columns={columns} 
                data={guests || []}
                keyField="id"
                onRowClick={(guest: any) => {
                  setSelectedGuest(guest);
                  setShowEditDialog(true);
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Guest Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Guest</DialogTitle>
            <DialogDescription>
              Create a new guest profile with all necessary details for your wedding event.
            </DialogDescription>
          </DialogHeader>
          <GuestFormSinglePage 
            eventId={Number(eventId)}
            onSubmit={(data) => createGuestMutation.mutate(data)}
            onCancel={() => setShowAddDialog(false)}
            isLoading={createGuestMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Guest Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Guest</DialogTitle>
            <DialogDescription>
              Update guest information and preferences for your wedding event.
            </DialogDescription>
          </DialogHeader>
          <GuestFormSinglePage 
            eventId={Number(eventId)}
            guest={selectedGuest}
            onSubmit={(data) => updateGuestMutation.mutate({ id: selectedGuest.id, data })}
            onCancel={() => {
              setShowEditDialog(false);
              setSelectedGuest(null);
            }}
            isLoading={updateGuestMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <GuestImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        eventId={eventId}
        onImportComplete={() => {
          refetch();
          queryClient.invalidateQueries({ 
            queryKey: ['/api/events', eventId, 'guest-stats']
          });
        }}
      />

      {/* Guest Detail Dialog */}
      <GuestDetailDialog
        isOpen={showDetailDialog}
        onClose={() => {
          setShowDetailDialog(false);
          setSelectedGuest(null);
        }}
        guest={selectedGuest}
        onEdit={(guestId) => {
          const guest = guests.find((g: any) => g.id === guestId);
          if (guest) {
            setSelectedGuest(guest);
            setShowDetailDialog(false);
            setShowEditDialog(true);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete {selectedGuest?.firstName} {selectedGuest?.lastName}?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedGuest(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteGuestMutation.isPending}
            >
              {deleteGuestMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </DashboardLayout>
      </GuestListErrorBoundary>
    </ProtectedRoute>
  );
}

export default GuestList;