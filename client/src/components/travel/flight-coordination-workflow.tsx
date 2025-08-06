import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { get, post } from '@/lib/api-utils';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  Upload, 
  Send, 
  Plane, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  FileSpreadsheet,
  Mail,
  RefreshCw,
  Plus,
  Edit,
  Eye,
  Filter
} from "lucide-react";
import { useCurrentEvent } from '@/hooks/use-current-event';
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Flight Coordination Workflow Component
export default function FlightCoordinationWorkflow() {
  const { toast } = useToast();
  const { currentEvent } = useCurrentEvent();
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState('collection');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  
  const eventId = currentEvent?.id;

  // Get guests needing flight assistance
  const { 
    data: flightGuests = [], 
    isLoading: isLoadingGuests,
    refetch: refetchGuests
  } = useQuery({
    queryKey: ['/api/events', eventId, 'flight-guests'],
    queryFn: async () => {
      if (!eventId) return [];
      const res = await get(`/api/events/${eventId}/guests-comprehensive`);
      const allGuests = res.data;
      return allGuests.filter((guest: any) => guest.needsFlightAssistance || guest.flightInfo);
    },
    enabled: !!eventId
  });

  // Get flight coordination status
  const { 
    data: coordinationStatus,
    isLoading: isLoadingStatus 
  } = useQuery({
    queryKey: ['/api/events', eventId, 'flight-coordination-status'],
    queryFn: async () => {
      if (!eventId) return {};
      const res = await get(`/api/events/${eventId}/flight-coordination-status`);
      return res.data;
    },
    enabled: !!eventId
  });

  // Export flight list mutation
  const exportFlightListMutation = useMutation({
    mutationFn: async (format: 'csv' | 'excel') => {
      const res = await post(`/api/events/${eventId}/export-flight-list`, {
        format,
        includeDetails: true
      });
      return res.data;
    },
    onSuccess: (data) => {
      // Trigger download
      const blob = new Blob([data.content], { 
        type: data.format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flight-list-${currentEvent?.title || 'event'}.${data.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Flight List Exported",
        description: `Flight list exported successfully in ${data.format.toUpperCase()} format`,
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Failed to export flight list. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Import flight details mutation
  const importFlightDetailsMutation = useMutation({
    mutationFn: async (flightData: any[]) => {
      const res = await post(`/api/events/${eventId}/import-flight-details`, {
        flightData
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'flight-guests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'flight-coordination-status'] });
      
      toast({
        title: "Flight Details Imported",
        description: `Successfully imported flight details for ${data.updatedCount} guests`,
      });
      setIsImportDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "Failed to import flight details. Please check your data format.",
        variant: "destructive",
      });
    }
  });

  // Send flight notifications mutation
  const sendNotificationsMutation = useMutation({
    mutationFn: async (notificationType: 'confirmation' | 'reminder' | 'update') => {
      const res = await post(`/api/events/${eventId}/send-flight-notifications`, {
        type: notificationType,
        guestIds: flightGuests.map((g: any) => g.id)
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Notifications Sent",
        description: `Sent ${data.sentCount} flight notifications successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Notification Failed",
        description: "Failed to send flight notifications. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Regenerate transport groups based on flights
  const regenerateTransportMutation = useMutation({
    mutationFn: async () => {
      const res = await post(`/api/events/${eventId}/regenerate-transport-from-flights`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'transport-groups'] });
      
      toast({
        title: "Transport Updated",
        description: `Generated ${data.groupsCreated} transport groups based on flight arrivals`,
      });
    },
    onError: () => {
      toast({
        title: "Transport Update Failed",
        description: "Failed to update transport groups. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Calculate workflow statistics
  const workflowStats = React.useMemo(() => {
    const totalGuests = flightGuests.length;
    const hasFlightInfo = flightGuests.filter((g: any) => g.flightInfo && Object.keys(g.flightInfo).length > 0).length;
    const confirmedFlights = flightGuests.filter((g: any) => g.flightStatus === 'confirmed').length;
    const pendingCollection = flightGuests.filter((g: any) => !g.flightInfo || Object.keys(g.flightInfo).length === 0).length;
    
    return {
      totalGuests,
      hasFlightInfo,
      confirmedFlights,
      pendingCollection,
      completionRate: totalGuests > 0 ? Math.round((hasFlightInfo / totalGuests) * 100) : 0
    };
  }, [flightGuests]);

  const workflowSteps = [
    {
      id: 'collection',
      title: 'List Collection',
      description: 'Collect flight requirements from guests',
      icon: Users,
      status: workflowStats.pendingCollection === 0 ? 'completed' : 'in_progress',
      count: workflowStats.totalGuests
    },
    {
      id: 'export',
      title: 'Export to Travel Agent',
      description: 'Export guest list for travel coordination',
      icon: Download,
      status: coordinationStatus?.exported ? 'completed' : 'pending',
      count: workflowStats.hasFlightInfo
    },
    {
      id: 'import',
      title: 'Import Flight Details',
      description: 'Import confirmed flight information',
      icon: Upload,
      status: workflowStats.confirmedFlights > 0 ? 'completed' : 'pending',
      count: workflowStats.confirmedFlights
    },
    {
      id: 'communicate',
      title: 'Guest Communication',
      description: 'Send confirmations and updates',
      icon: Send,
      status: coordinationStatus?.notificationsSent ? 'completed' : 'pending',
      count: coordinationStatus?.notificationsSent || 0
    }
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      'completed': { variant: 'default' as const, color: 'text-green-600' },
      'in_progress': { variant: 'secondary' as const, color: 'text-blue-600' },
      'pending': { variant: 'outline' as const, color: 'text-gray-600' }
    };
    
    return config[status as keyof typeof config] || config.pending;
  };

  if (!eventId) {
    return (
      <Card className="glass">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Event Selected</h3>
          <p className="text-muted-foreground">Please select an event to manage flight coordination</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workflow Progress Header */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Flight Coordination Workflow
          </CardTitle>
          <CardDescription>
            Manage the complete flight coordination process from guest list to confirmation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              const badgeConfig = getStatusBadge(step.status);
              
              return (
                <Card 
                  key={step.id} 
                  className={`border cursor-pointer transition-colors ${
                    selectedWorkflowStep === step.id ? 'border-purple-300 bg-purple-50/50' : 'border-border'
                  }`}
                  onClick={() => setSelectedWorkflowStep(step.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <Badge variant={badgeConfig.variant}>
                        {step.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <h4 className="font-medium mb-1">{step.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{step.description}</p>
                    <div className="text-lg font-bold text-purple-600">
                      {step.count}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-800">Workflow Progress</p>
                <p className="text-sm text-blue-600">
                  {workflowStats.hasFlightInfo} of {workflowStats.totalGuests} guests have flight information ({workflowStats.completionRate}%)
                </p>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {workflowStats.completionRate}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Step Content */}
      <Tabs value={selectedWorkflowStep} onValueChange={setSelectedWorkflowStep}>
        <TabsContent value="collection" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Guest List Collection</CardTitle>
              <CardDescription>
                Collect flight requirements from guests through RSVP or direct communication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{workflowStats.totalGuests}</div>
                  <div className="text-sm text-green-700">Total Guests</div>
                </div>
                <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{workflowStats.hasFlightInfo}</div>
                  <div className="text-sm text-blue-700">With Flight Info</div>
                </div>
                <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{workflowStats.pendingCollection}</div>
                  <div className="text-sm text-orange-700">Pending Collection</div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Collection Reminders
                </Button>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Flight Manually
                </Button>
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Guest Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Export to Travel Agent</CardTitle>
              <CardDescription>
                Generate and export guest lists for travel agent coordination
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => exportFlightListMutation.mutate('csv')}
                    disabled={exportFlightListMutation.isPending}
                    className="h-auto p-4 flex flex-col items-start"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      <span className="font-medium">Export as CSV</span>
                    </div>
                    <span className="text-sm opacity-80">Simple format for email or basic systems</span>
                  </Button>
                  
                  <Button 
                    onClick={() => exportFlightListMutation.mutate('excel')}
                    disabled={exportFlightListMutation.isPending}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      <span className="font-medium">Export as Excel</span>
                    </div>
                    <span className="text-sm opacity-80">Rich format with multiple sheets and formatting</span>
                  </Button>
                </div>
                
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Export includes:</strong> Guest names, contact details, travel preferences, 
                    accommodation requirements, special requests, and departure/arrival city preferences.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Import Flight Details</CardTitle>
              <CardDescription>
                Import confirmed flight information from travel agents or booking systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={() => setIsImportDialogOpen(true)}
                  className="w-full h-auto p-4 flex flex-col items-center"
                >
                  <Upload className="h-8 w-8 mb-2" />
                  <span className="font-medium">Import Flight Details</span>
                  <span className="text-sm opacity-80">Upload CSV or Excel file with flight information</span>
                </Button>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Manual Entry Mode
                  </Button>
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync with Booking System
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communicate" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Guest Communication</CardTitle>
              <CardDescription>
                Send automated confirmations, updates, and travel information to guests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => sendNotificationsMutation.mutate('confirmation')}
                    disabled={sendNotificationsMutation.isPending}
                    className="h-auto p-4 flex flex-col items-start"
                  >
                    <CheckCircle className="h-5 w-5 mb-2" />
                    <span className="font-medium">Send Confirmations</span>
                    <span className="text-sm opacity-80">Flight booking confirmations</span>
                  </Button>
                  
                  <Button 
                    onClick={() => sendNotificationsMutation.mutate('reminder')}
                    disabled={sendNotificationsMutation.isPending}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start"
                  >
                    <Clock className="h-5 w-5 mb-2" />
                    <span className="font-medium">Send Reminders</span>
                    <span className="text-sm opacity-80">Travel preparation reminders</span>
                  </Button>
                  
                  <Button 
                    onClick={() => sendNotificationsMutation.mutate('update')}
                    disabled={sendNotificationsMutation.isPending}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start"
                  >
                    <Send className="h-5 w-5 mb-2" />
                    <span className="font-medium">Send Updates</span>
                    <span className="text-sm opacity-80">Last-minute travel updates</span>
                  </Button>
                </div>
                
                <Button 
                  onClick={() => regenerateTransportMutation.mutate()}
                  disabled={regenerateTransportMutation.isPending}
                  variant="secondary"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Transport Groups Based on Flights
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Flight Details</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file with confirmed flight information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select File</Label>
              <Input 
                id="file-upload" 
                type="file" 
                accept=".csv,.xlsx,.xls"
                className="mt-1"
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Required columns:</p>
              <ul className="text-xs list-disc list-inside space-y-1">
                <li>Guest Name or Email (for matching)</li>
                <li>Flight Number</li>
                <li>Arrival Date & Time</li>
                <li>Departure Date & Time</li>
                <li>Airport Codes</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle file import logic here
              toast({
                title: "Import Started",
                description: "Processing flight details import...",
              });
              setIsImportDialogOpen(false);
            }}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}