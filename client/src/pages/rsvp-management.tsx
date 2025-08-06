import React, { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { CORE_PERMISSIONS } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PanelLeftOpen, BarChart3, CalendarDays, Users, Send, MessageSquareText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getRsvpStatusColor, calculateRsvpProgress } from "@/lib/utils";
import { formatDateForDisplay } from "@/lib/date-utils";
import DataTable from "@/components/ui/data-table";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { queryClient } from "@/lib/queryClient";
import RsvpStage1Form from "@/components/rsvp/rsvp-stage1-form";
import RsvpStage2Form from "@/components/rsvp/rsvp-stage2-form";
import TwoStageRsvpForm from "@/components/rsvp/two-stage-rsvp-form";
import RsvpLinkGenerator from "@/components/rsvp/rsvp-link-generator";
import RsvpStatusDisplay from "@/components/rsvp/rsvp-status-display";
import RsvpFollowupConfiguration from "@/components/rsvp/rsvp-followup-configuration";
import { post, get } from "@/lib/api-utils"; // Using the consolidated API utilities
import { useToast } from "@/hooks/use-toast";
import { useCurrentEvent } from "@/hooks/use-current-event";

export default function RsvpManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [previewRsvpForm, setPreviewRsvpForm] = useState(false);
  const { toast } = useToast();

  // Use the current event from the context
  const { currentEventId } = useCurrentEvent();
  
  // Fallback to first event only if currentEventId is not available
  const { data: events = [] } = useQuery<any[]>({
    queryKey: ['/api/events'],
  });
  
  const eventId = currentEventId || events?.[0]?.id || 1;
  
  // Fetch guests
  const { data: guests = [], isLoading: isLoadingGuests } = useQuery<any[]>({
    queryKey: [`/api/events/${eventId}/guests`],
    enabled: !!eventId,
  });
  
  // Fetch ceremonies
  const { data: ceremonies = [] } = useQuery<any[]>({
    queryKey: [`/api/events/${eventId}/ceremonies`],
    enabled: !!eventId,
  });
  
  // Fetch meal options (for main ceremony, usually the reception)
  const receptionCeremony = ceremonies.find((c: any) => c.name.toLowerCase().includes('reception'));
  
  const { data: mealOptions = [] } = useQuery<any[]>({
    queryKey: [`/api/ceremonies/${receptionCeremony?.id}/meals`],
    enabled: !!receptionCeremony?.id,
  });
  
  // Calculate RSVP stats
  const confirmedCount = guests.filter((guest: any) => guest.rsvpStatus === "confirmed").length;
  const declinedCount = guests.filter((guest: any) => guest.rsvpStatus === "declined").length;
  const pendingCount = guests.filter((guest: any) => guest.rsvpStatus === "pending").length;
  const totalCount = guests.length;
  
  const rsvpProgressPercentage = calculateRsvpProgress(confirmedCount, declinedCount, pendingCount);
  
  // Guest table columns
  const guestColumns = [
    {
      header: "Name",
      accessor: (row: any) => `${row.firstName} ${row.lastName}`,
    },
    {
      header: "Email",
      accessor: "email",
    },
    {
      header: "Phone",
      accessor: "phone",
      cell: (row: any) => row.phone || "N/A",
    },
    {
      header: "RSVP Status",
      accessor: "rsvpStatus",
      cell: (row: any) => (
        <Badge className={getRsvpStatusColor(row.rsvpStatus)}>
          {row.rsvpStatus.charAt(0).toUpperCase() + row.rsvpStatus.slice(1)}
        </Badge>
      ),
    },
    {
      header: "Responded On",
      accessor: "updatedAt",
      cell: (row: any) => (
        row.rsvpStatus !== "pending" ? formatDateForDisplay(row.updatedAt) : "Awaiting Response"
      ),
    },
    {
      header: "Actions",
      accessor: (row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleSendReminder(row.id);
            }}
            disabled={row.rsvpStatus !== "pending"}
            className={row.rsvpStatus !== "pending" ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Send className="h-4 w-4 mr-1" />
            Remind
          </Button>
        </div>
      ),
    },
  ];
  
  // Ceremonies attendance table
  const ceremonyColumns = [
    {
      header: "Ceremony",
      accessor: "name",
    },
    {
      header: "Date",
      accessor: "date",
      cell: (row: any) => formatDateForDisplay(row.date),
    },
    {
      header: "Time",
      accessor: (row: any) => `${row.startTime} - ${row.endTime}`,
    },
    {
      header: "Location",
      accessor: "location",
    },
    {
      header: "Confirmed Guests",
      accessor: (row: any) => {
        const confirmedForCeremony = row.confirmedGuests || 0;
        return (
          <div className="flex items-center space-x-2">
            <span>{confirmedForCeremony}</span>
            <Progress value={(confirmedForCeremony / totalCount) * 100} className="w-16 h-2" />
          </div>
        );
      },
    },
  ];
  
  // Mock ceremony attendance data (would come from backend in a real app)
  const ceremoniesWithAttendance = ceremonies.map((ceremony: any) => ({
    ...ceremony,
    confirmedGuests: Math.floor(Math.random() * confirmedCount), // This is just for demo
  }));
  
  // Message table
  const { data: messages = [] } = useQuery<any[]>({
    queryKey: [`/api/events/${eventId}/messages`],
    enabled: !!eventId,
  });
  
  const messageColumns = [
    {
      header: "Guest",
      accessor: (row: any) => {
        const guest = guests.find((g: any) => g.id === row.guestId);
        return guest ? `${guest.firstName} ${guest.lastName}` : "Unknown Guest";
      },
    },
    {
      header: "Message",
      accessor: "message",
      cell: (row: any) => (
        <div className="max-w-md truncate" title={row.message}>
          {row.message}
        </div>
      ),
    },
    {
      header: "Date",
      accessor: "createdAt",
      cell: (row: any) => formatDateForDisplay(row.createdAt),
    },
  ];
  
  // Send reminder handler (placeholder for demo)
  const handleSendReminder = async (guestId: number) => {
    try {
      // In a real app, this would send an actual reminder
      // For now, we'll just show a toast
      const guest = guests.find((g: any) => g.id === guestId);
      
      toast({
        title: "Reminder Sent",
        description: `RSVP reminder sent to ${guest.firstName} ${guest.lastName} at ${guest.email}`,
      });
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast({
        variant: "destructive",
        title: "Failed to Send Reminder",
        description: "An error occurred while sending the reminder.",
      });
    }
  };
  
  // Bulk send reminders
  const handleBulkReminders = () => {
    const pendingGuests = guests.filter((guest: any) => guest.rsvpStatus === "pending");
    
    toast({
      title: "Reminders Scheduled",
      description: `RSVP reminders scheduled for ${pendingGuests.length} guests.`,
    });
  };
  
  // Handle RSVP form success
  const handleRsvpSuccess = (data: any) => {
    setPreviewRsvpForm(false);
    toast({
      title: "RSVP Submitted",
      description: "The RSVP form has been successfully submitted.",
    });
  };

  return (
    <ProtectedRoute requiredPermission={[CORE_PERMISSIONS.GUEST_READ, CORE_PERMISSIONS.GUEST_UPDATE]}>
      <DashboardLayout>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-playfair font-bold text-neutral">RSVP Management</h2>
            <p className="text-sm text-gray-500">
              Manage guest responses and send reminders
            </p>
          </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setPreviewRsvpForm(true)}
            className="border-primary text-primary"
          >
            <PanelLeftOpen className="mr-2 h-4 w-4" /> Preview RSVP Form
          </Button>
          <Button 
            onClick={handleBulkReminders}
            className="gold-gradient"
          >
            <Send className="mr-2 h-4 w-4" /> Send Reminders
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="dashboard">
            <BarChart3 className="mr-2 h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="guests">
            <Users className="mr-2 h-4 w-4" /> Guest Responses
          </TabsTrigger>
          <TabsTrigger value="ceremonies">
            <CalendarDays className="mr-2 h-4 w-4" /> Ceremonies
          </TabsTrigger>
          <TabsTrigger value="messages">
            <PanelLeftOpen className="mr-2 h-4 w-4" /> Messages
          </TabsTrigger>
          <TabsTrigger value="invitations">
            <Send className="mr-2 h-4 w-4" /> Invitations & Follow-ups
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{confirmedCount}</div>
                <p className="text-muted-foreground">Confirmed</p>
                <Progress value={(confirmedCount / totalCount) * 100} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{declinedCount}</div>
                <p className="text-muted-foreground">Declined</p>
                <Progress value={(declinedCount / totalCount) * 100} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-muted-foreground">Awaiting Response</p>
                <Progress value={(pendingCount / totalCount) * 100} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{totalCount}</div>
                <p className="text-muted-foreground">Total Guests</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>RSVP Progress</CardTitle>
                <CardDescription>Overall response rate: {rsvpProgressPercentage}%</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <div className="relative h-64 w-64">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      {/* Background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#E5E7EB"
                        strokeWidth="10"
                      />
                      
                      {/* Progress arc */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#D4AF37"
                        strokeWidth="10"
                        strokeDasharray={`${rsvpProgressPercentage * 2.51} 251`}
                        strokeDashoffset="62.75"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-4xl font-bold">{rsvpProgressPercentage}%</span>
                        <p className="text-sm text-muted-foreground">Response Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>RSVP Breakdown</CardTitle>
                <CardDescription>Breakdown of responses by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Confirmed</span>
                      <span className="text-sm font-medium">{confirmedCount} guests ({Math.round((confirmedCount / totalCount) * 100)}%)</span>
                    </div>
                    <Progress value={(confirmedCount / totalCount) * 100} className="h-2 bg-gray-200" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Declined</span>
                      <span className="text-sm font-medium">{declinedCount} guests ({Math.round((declinedCount / totalCount) * 100)}%)</span>
                    </div>
                    <Progress value={(declinedCount / totalCount) * 100} className="h-2 bg-gray-200" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Awaiting Response</span>
                      <span className="text-sm font-medium">{pendingCount} guests ({Math.round((pendingCount / totalCount) * 100)}%)</span>
                    </div>
                    <Progress value={(pendingCount / totalCount) * 100} className="h-2 bg-gray-200" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="guests">
          <Card>
            <CardHeader>
              <CardTitle>Guest Responses</CardTitle>
              <CardDescription>Review and manage all guest RSVP responses</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={guests}
                columns={guestColumns}
                keyField="id"
                searchable={true}
                searchPlaceholder="Search guests..."
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ceremonies">
          <Card>
            <CardHeader>
              <CardTitle>Ceremony Attendance</CardTitle>
              <CardDescription>Track which guests are attending each ceremony</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={ceremoniesWithAttendance}
                columns={ceremonyColumns}
                keyField="id"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Guest Messages</CardTitle>
              <CardDescription>View messages left by guests during RSVP</CardDescription>
            </CardHeader>
            <CardContent>
              {messages.length > 0 ? (
                <DataTable
                  data={messages}
                  columns={messageColumns}
                  keyField="id"
                  searchable={true}
                  searchPlaceholder="Search messages..."
                />
              ) : (
                <div className="py-8 text-center">
                  <PanelLeftOpen className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium">No messages yet</h3>
                  <p className="text-muted-foreground">
                    When guests leave messages during RSVP, they will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="invitations">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Two-Stage RSVP Process</CardTitle>
                <CardDescription>
                  Manage invitations for our two-stage RSVP system - collect basic attendance information first, 
                  then travel and accommodation details
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-6 space-y-2">
                  <h3 className="text-lg font-medium">How it works</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Generate personalized RSVP links for your guests</li>
                    <li>Send invitations via email, WhatsApp, or both</li>
                    <li>Track who has confirmed attendance (Stage 1) and who has provided travel details (Stage 2)</li>
                    <li>Send targeted reminders based on each guest's current stage</li>
                  </ol>
                </div>
                
                <div className="p-4 border rounded-md bg-amber-50 mb-6">
                  <h3 className="font-medium mb-2">RSVP Stages Explained</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Badge className="mb-1">Stage 1</Badge>
                      <h4 className="text-sm font-medium">Basic Attendance</h4>
                      <p className="text-sm text-muted-foreground">
                        Guests confirm if they're attending, which ceremonies they'll join, 
                        and provide any meal preferences or dietary restrictions.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Badge className="mb-1">Stage 2</Badge>
                      <h4 className="text-sm font-medium">Travel & Accommodation</h4>
                      <p className="text-sm text-muted-foreground">
                        Out-of-town guests provide arrival/departure dates and preferences
                        for hotel accommodations and transportation.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <RsvpLinkGenerator 
              guests={Array.isArray(guests) ? guests : []} 
              onSuccess={() => {
                // Invalidate guests query to refresh status
                queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/guests`] });
              }}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>RSVP Follow-up Communication</CardTitle>
                <CardDescription>
                  Configure automated follow-up messages sent to guests after they RSVP
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <RsvpFollowupConfiguration />
              </CardContent>
            </Card>

            {/* RSVP Completion Status section moved to Reports page */}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* RSVP Form Preview Dialog */}
      {previewRsvpForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-playfair font-bold">RSVP Form Preview</h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setPreviewRsvpForm(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                </Button>
              </div>
            </div>
            <div className="p-6">
              <TwoStageRsvpForm 
                eventId={eventId}
                ceremonies={ceremonies} 
                mealOptions={mealOptions}
                onSuccess={handleRsvpSuccess}
              />
            </div>
          </div>
        </div>
      )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
