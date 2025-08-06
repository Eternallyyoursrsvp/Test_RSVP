import React, { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { AnalyticsRoute } from "@/components/auth/protected-route";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  Users, 
  FileSpreadsheet, 
  CalendarDays,
  MessageSquare,
  Mail,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  MousePointer,
  Download,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDateForDisplay } from "@/lib/date-utils";
import { useRealtimeAnalytics } from "@/hooks/use-realtime-analytics";
import RsvpStatusDisplay from "@/components/rsvp/rsvp-status-display";
import { useCurrentEvent } from "@/hooks/use-current-event";
import { get } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("30"); // days
  const { toast } = useToast();
  
  // Real-time analytics
  const { 
    isConnected, 
    isConnecting, 
    metrics: realtimeMetrics,
    alerts
  } = useRealtimeAnalytics();
  
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

  // Fetch analytics dashboard data
  const { data: analyticsData, isLoading: isLoadingAnalytics, refetch: refetchAnalytics } = useQuery<any>({
    queryKey: [`/api/analytics/events/${eventId}/dashboard`],
    enabled: !!eventId,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Fetch event statistics
  const { data: eventStats, isLoading: isLoadingEventStats } = useQuery<any>({
    queryKey: [`/api/analytics/events/${eventId}/stats`],
    enabled: !!eventId,
  });

  // Fetch RSVP trends
  const { data: rsvpTrends, isLoading: isLoadingTrends } = useQuery<any>({
    queryKey: [`/api/analytics/events/${eventId}/rsvp-trends?days=${dateRange}`],
    enabled: !!eventId,
  });

  // Fetch communication analytics
  const { data: communicationData, isLoading: isLoadingComm } = useQuery<any>({
    queryKey: [`/api/communication-analytics/dashboard/${eventId}`],
    enabled: !!eventId,
  });

  // Fetch real-time communication stats
  const { data: realtimeStats } = useQuery<any>({
    queryKey: [`/api/communication-analytics/realtime/${eventId}`],
    enabled: !!eventId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Export data handler
  const handleExportData = async (format: 'json' | 'csv') => {
    try {
      const response = await get(`/api/analytics/events/${eventId}/export/${format}`);
      
      // Create download link
      const blob = new Blob([format === 'json' ? JSON.stringify(response.data, null, 2) : response.data], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `analytics-${eventId}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: `Analytics data exported as ${format.toUpperCase()} file.`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export analytics data.",
        variant: "destructive",
      });
    }
  };

  // Calculate guest statistics
  const confirmedCount = guests.filter((guest: any) => guest.rsvpStatus === "confirmed").length;
  const declinedCount = guests.filter((guest: any) => guest.rsvpStatus === "declined").length;
  const pendingCount = guests.filter((guest: any) => guest.rsvpStatus === "pending").length;
  const totalCount = guests.length;
  const responseRate = totalCount > 0 ? Math.round(((confirmedCount + declinedCount) / totalCount) * 100) : 0;

  if (isLoadingGuests || isLoadingAnalytics) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <AnalyticsRoute>
      <DashboardLayout>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-playfair font-bold text-neutral">Reports & Analytics</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">
                View event statistics and track progress
              </p>
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <Activity className="w-4 h-4 text-green-600" />
                ) : isConnecting ? (
                  <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
                ) : (
                  <Activity className="w-4 h-4 text-gray-400" />
                )}
                <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
                  {isConnected ? "Real-time" : isConnecting ? "Connecting..." : "Static"}
                </Badge>
                {alerts.length > 0 && (
                  <Badge variant="destructive" className="text-xs ml-1">
                    {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={() => refetchAnalytics()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => handleExportData('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-4xl">
          <TabsTrigger value="overview">
            <BarChart3 className="mr-2 h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="rsvp">
            <Users className="mr-2 h-4 w-4" /> RSVP Analysis
          </TabsTrigger>
          <TabsTrigger value="events">
            <CalendarDays className="mr-2 h-4 w-4" /> Event Statistics
          </TabsTrigger>
          <TabsTrigger value="communication">
            <MessageSquare className="mr-2 h-4 w-4" /> Communication
          </TabsTrigger>
          <TabsTrigger value="realtime">
            <Activity className="mr-2 h-4 w-4" /> Real-time
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{totalCount}</div>
                    <p className="text-muted-foreground text-sm">Total Guests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{confirmedCount}</div>
                    <p className="text-muted-foreground text-sm">Confirmed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{responseRate}%</div>
                    <p className="text-muted-foreground text-sm">Response Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold">{pendingCount}</div>
                    <p className="text-muted-foreground text-sm">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>RSVP Progress Overview</CardTitle>
                <CardDescription>Current response status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Confirmed ({confirmedCount})</span>
                      <span>{Math.round((confirmedCount / totalCount) * 100)}%</span>
                    </div>
                    <Progress value={(confirmedCount / totalCount) * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Declined ({declinedCount})</span>
                      <span>{Math.round((declinedCount / totalCount) * 100)}%</span>
                    </div>
                    <Progress value={(declinedCount / totalCount) * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Pending ({pendingCount})</span>
                      <span>{Math.round((pendingCount / totalCount) * 100)}%</span>
                    </div>
                    <Progress value={(pendingCount / totalCount) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Insights</CardTitle>
                <CardDescription>Key metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {eventStats && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total Events</span>
                        <Badge variant="secondary">{eventStats.totalEvents || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Average Attendance</span>
                        <Badge variant="secondary">{eventStats.averageAttendance || 0}%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Most Popular Meal</span>
                        <Badge variant="secondary">{eventStats.popularMeal || 'N/A'}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Dietary Restrictions</span>
                        <Badge variant="secondary">{eventStats.dietaryCount || 0}</Badge>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="rsvp">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>RSVP Completion Status</CardTitle>
                <CardDescription>
                  Track which guests have completed each stage of the RSVP process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>RSVP Status</TableHead>
                        <TableHead>Responded On</TableHead>
                        <TableHead>Stage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(guests) && guests.map(guest => (
                        <TableRow key={guest.id}>
                          <TableCell>
                            {guest.firstName} {guest.lastName}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              {guest.email && <span>{guest.email}</span>}
                              {guest.phone && <span>{guest.phone}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <RsvpStatusDisplay guest={guest} />
                          </TableCell>
                          <TableCell>
                            {guest.rsvpStatus !== "pending" ? formatDateForDisplay(guest.updatedAt) : "Not yet responded"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={guest.rsvpStage === 2 ? "default" : "secondary"}>
                              Stage {guest.rsvpStage || 1}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {rsvpTrends && (
              <Card>
                <CardHeader>
                  <CardTitle>RSVP Trends</CardTitle>
                  <CardDescription>Response patterns over the last {dateRange} days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{rsvpTrends.dailyConfirmed || 0}</div>
                        <p className="text-sm text-muted-foreground">Daily Confirmations</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{rsvpTrends.dailyDeclined || 0}</div>
                        <p className="text-sm text-muted-foreground">Daily Declines</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{rsvpTrends.projectedTotal || totalCount}</div>
                        <p className="text-sm text-muted-foreground">Projected Total</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="events">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Statistics</CardTitle>
                <CardDescription>Detailed attendance and participation metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {analyticsData?.ceremoniesStats?.map((ceremony: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-2">{ceremony.name}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Confirmed</span>
                          <span className="font-medium">{ceremony.confirmed || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Attendance Rate</span>
                          <span className="font-medium">{ceremony.attendanceRate || 0}%</span>
                        </div>
                        <Progress value={ceremony.attendanceRate || 0} className="h-2 mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dietary Requirements</CardTitle>
                <CardDescription>Breakdown of guest dietary preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{analyticsData?.dietaryStats?.vegetarian || 0}</div>
                    <p className="text-sm text-muted-foreground">Vegetarian</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-700">{analyticsData?.dietaryStats?.vegan || 0}</div>
                    <p className="text-sm text-muted-foreground">Vegan</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">{analyticsData?.dietaryStats?.glutenFree || 0}</div>
                    <p className="text-sm text-muted-foreground">Gluten-Free</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-orange-600">{analyticsData?.dietaryStats?.allergies || 0}</div>
                    <p className="text-sm text-muted-foreground">Allergies</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="communication">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold">{communicationData?.emailStats?.sent || 0}</div>
                      <p className="text-muted-foreground text-sm">Emails Sent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold">{communicationData?.whatsappStats?.sent || 0}</div>
                      <p className="text-muted-foreground text-sm">WhatsApp Messages</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="text-2xl font-bold">{communicationData?.totalEngagement || 0}%</div>
                      <p className="text-muted-foreground text-sm">Engagement Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
                <CardDescription>Communication effectiveness by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {communicationData?.channelStats?.map((channel: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {channel.type === 'email' && <Mail className="h-4 w-4 text-blue-600" />}
                        {channel.type === 'whatsapp' && <Smartphone className="h-4 w-4 text-green-600" />}
                        {channel.type === 'sms' && <MessageSquare className="h-4 w-4 text-purple-600" />}
                        <span className="font-medium capitalize">{channel.type}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Delivered: </span>
                          <span className="font-medium">{channel.delivered || 0}%</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Opened: </span>
                          <span className="font-medium">{channel.opened || 0}%</span>
                        </div>
                        <Badge variant={channel.status === 'active' ? 'default' : 'secondary'}>
                          {channel.status || 'unknown'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="realtime">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="text-2xl font-bold">{realtimeStats?.activeUsers || 0}</div>
                      <p className="text-muted-foreground text-sm">Active Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold">{realtimeStats?.todayRSVPs || 0}</div>
                      <p className="text-muted-foreground text-sm">Today's RSVPs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <MousePointer className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold">{realtimeStats?.pageViews || 0}</div>
                      <p className="text-muted-foreground text-sm">Page Views (24h)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="text-2xl font-bold">{realtimeStats?.messages || 0}</div>
                      <p className="text-muted-foreground text-sm">Messages Sent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Live Activity Feed
                </CardTitle>
                <CardDescription>Recent guest activities and system events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {realtimeStats?.recentActivities?.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-2 border-l-2 border-gray-200">
                      <div className="flex-shrink-0">
                        {activity.type === 'rsvp' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {activity.type === 'message' && <MessageSquare className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'view' && <Eye className="h-4 w-4 text-gray-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8">
                      <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium">No recent activity</h3>
                      <p className="text-muted-foreground">
                        Live activity will appear here as guests interact with your event.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </DashboardLayout>
    </AnalyticsRoute>
  );
}