import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { get, put, post } from '@/lib/api-utils';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeAnalytics } from '@/hooks/use-realtime-analytics';
import {
  Car,
  Users,
  MapPin,
  Clock,
  User,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Truck,
  Bus,
  Navigation,
  Activity,
  Info,
  Route,
  Timer,
  Phone,
  MessageSquare,
  Wifi,
  WifiOff,
  Zap,
  TrendingUp,
  BarChart3,
  Send,
  Shield
} from 'lucide-react';

// Types based on workflow patterns
interface TransportGroup {
  id: string;
  name: string;
  vehicleType: string;
  capacity: number;
  assigned: number;
  utilizationRate: number;
  driver: {
    id: string;
    name: string;
    phone: string;
    status: 'available' | 'en-route' | 'loading' | 'completed';
  };
  route: {
    id: string;
    name: string;
    stops: string[];
    estimatedDuration: number;
    currentStop?: string;
  };
  passengers: Array<{
    id: string;
    name: string;
    pickupLocation: string;
    dropoffLocation: string;
    status: 'pending' | 'picked-up' | 'dropped-off';
  }>;
  schedule: {
    departureTime: string;
    estimatedArrival: string;
    actualDeparture?: string;
    actualArrival?: string;
  };
  tracking: {
    lastUpdate: string;
    currentLocation?: string;
    eta?: string;
  };
}

interface DriverStatus {
  id: string;
  name: string;
  phone: string;
  status: 'available' | 'en-route' | 'loading' | 'completed' | 'offline';
  vehicleType: string;
  currentGroup?: string;
  lastUpdate: string;
  location?: string;
}

interface TransportOperationsDashboardProps {
  eventId: number;
}

// Custom hook for transport operations data with real-time integration
function useTransportOperations(eventId: number) {
  return useQuery({
    queryKey: [`/api/events/${eventId}/transport/operations`],
    queryFn: async () => {
      try {
        const response = await get(`/api/events/${eventId}/transport/operations`);
        return response.data;
      } catch (error) {
        // Fallback to mock data for Phase 3.2 implementation
        return generateMockTransportData();
      }
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes - real-time updates via WebSocket
    refetchInterval: 30000, // Backup refresh every 30 seconds
  });
}

// Mock data generator for Phase 2 implementation
function generateMockTransportData() {
  return {
    groups: [
      {
        id: 'group-1',
        name: 'Airport Pickup Batch 1',
        vehicleType: 'Minivan',
        capacity: 8,
        assigned: 6,
        utilizationRate: 75,
        driver: {
          id: 'driver-1',
          name: 'Rajesh Kumar',
          phone: '+91 98765 43210',
          status: 'en-route'
        },
        route: {
          id: 'route-1',
          name: 'Airport to Hotel Circuit',
          stops: ['Terminal 3', 'Hotel Taj', 'Hotel Marriott'],
          estimatedDuration: 90,
          currentStop: 'Terminal 3'
        },
        passengers: [
          { id: 'p1', name: 'Amit Sharma', pickupLocation: 'Terminal 3', dropoffLocation: 'Hotel Taj', status: 'picked-up' },
          { id: 'p2', name: 'Priya Singh', pickupLocation: 'Terminal 3', dropoffLocation: 'Hotel Marriott', status: 'picked-up' }
        ],
        schedule: {
          departureTime: '2024-03-15T14:30:00',
          estimatedArrival: '2024-03-15T16:00:00',
          actualDeparture: '2024-03-15T14:35:00'
        },
        tracking: {
          lastUpdate: '2024-03-15T15:15:00',
          currentLocation: 'On Airport Express Highway',
          eta: '15 mins'
        }
      },
      {
        id: 'group-2',
        name: 'Venue Shuttle Service',
        vehicleType: 'Bus',
        capacity: 25,
        assigned: 20,
        utilizationRate: 80,
        driver: {
          id: 'driver-2',
          name: 'Mohammad Ali',
          phone: '+91 87654 32109',
          status: 'loading'
        },
        route: {
          id: 'route-2',
          name: 'Hotel to Venue Circuit',
          stops: ['Hotel Taj', 'Hotel Marriott', 'Wedding Venue'],
          estimatedDuration: 45,
          currentStop: 'Hotel Taj'
        },
        passengers: [],
        schedule: {
          departureTime: '2024-03-15T17:00:00',
          estimatedArrival: '2024-03-15T17:45:00'
        },
        tracking: {
          lastUpdate: '2024-03-15T16:55:00',
          currentLocation: 'Hotel Taj Parking',
          eta: '5 mins to departure'
        }
      }
    ] as TransportGroup[],
    drivers: [
      {
        id: 'driver-1',
        name: 'Rajesh Kumar',
        phone: '+91 98765 43210',
        status: 'en-route',
        vehicleType: 'Minivan',
        currentGroup: 'group-1',
        lastUpdate: '2024-03-15T15:15:00',
        location: 'Airport Express Highway'
      },
      {
        id: 'driver-2',
        name: 'Mohammad Ali',
        phone: '+91 87654 32109',
        status: 'loading',
        vehicleType: 'Bus',
        currentGroup: 'group-2',
        lastUpdate: '2024-03-15T16:55:00',
        location: 'Hotel Taj Parking'
      }
    ] as DriverStatus[],
    tracking: {
      totalTrips: 2,
      activeTrips: 2,
      completedTrips: 0,
      averageUtilization: 77.5,
      onTimePerformance: 85
    }
  };
}

// Enhanced Transport Groups Grid Component with Interactive Features
function TransportGroupsGrid({ 
  groups, 
  onStatusUpdate, 
  isConnected 
}: { 
  groups: TransportGroup[];
  onStatusUpdate?: (groupId: string, status: string, location?: string, eta?: string) => void;
  isConnected?: boolean;
}) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'en-route': return 'bg-blue-100 text-blue-800';
      case 'loading': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleStatusUpdate = (groupId: string, newStatus: string) => {
    if (onStatusUpdate) {
      onStatusUpdate(groupId, newStatus);
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType.toLowerCase()) {
      case 'bus': return <Bus className="h-5 w-5" />;
      case 'truck': case 'minivan': return <Truck className="h-5 w-5" />;
      default: return <Car className="h-5 w-5" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map((group) => (
        <Card key={group.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {getVehicleIcon(group.vehicleType)}
                {group.name}
              </CardTitle>
              <Badge className={getStatusColor(group.driver.status)}>
                {group.driver.status}
              </Badge>
            </div>
            <CardDescription>
              {group.vehicleType} • {group.assigned}/{group.capacity} passengers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Utilization Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Capacity Utilization</span>
                <span>{group.utilizationRate}%</span>
              </div>
              <Progress value={group.utilizationRate} className="h-2" />
            </div>

            {/* Driver Info */}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{group.driver.name}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Phone className="h-3 w-3" />
              </Button>
            </div>

            {/* Current Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{group.tracking.currentLocation || 'Location updating...'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>ETA: {group.tracking.eta || 'Calculating...'}</span>
              </div>
            </div>

            {/* Route Progress */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Route Progress</div>
              <div className="flex items-center gap-1">
                {group.route.stops.map((stop, index) => (
                  <React.Fragment key={stop}>
                    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                      stop === group.route.currentStop 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {stop === group.route.currentStop && <Navigation className="h-3 w-3" />}
                      {stop}
                    </div>
                    {index < group.route.stops.length - 1 && (
                      <div className="flex-1 h-0.5 bg-gray-200" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Enhanced Action Buttons with Status Updates */}
            <div className="space-y-2 pt-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Contact
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Route className="h-3 w-3 mr-1" />
                  Track
                </Button>
              </div>
              
              {/* Quick Status Updates */}
              {isConnected && (
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 text-xs"
                    onClick={() => handleStatusUpdate(group.id, 'en-route')}
                    disabled={group.driver.status === 'en-route'}
                  >
                    <Navigation className="h-3 w-3 mr-1" />
                    En Route
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 text-xs"
                    onClick={() => handleStatusUpdate(group.id, 'completed')}
                    disabled={group.driver.status === 'completed'}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Driver Status Panel Component
function DriverStatusPanel({ drivers }: { drivers: DriverStatus[] }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'en-route': return <Navigation className="h-4 w-4 text-blue-600" />;
      case 'loading': return <Timer className="h-4 w-4 text-yellow-600" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-gray-600" />;
      case 'offline': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600';
      case 'en-route': return 'text-blue-600';
      case 'loading': return 'text-yellow-600';
      case 'completed': return 'text-gray-600';
      case 'offline': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Driver Status Panel
        </CardTitle>
        <CardDescription>Real-time driver availability and status</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {drivers.map((driver) => (
              <div key={driver.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(driver.status)}
                  <div>
                    <div className="font-medium">{driver.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {driver.vehicleType}
                      {driver.currentGroup && ` • Group ${driver.currentGroup}`}
                    </div>
                    {driver.location && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {driver.location}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Badge 
                    variant="outline" 
                    className={getStatusColor(driver.status)}
                  >
                    {driver.status}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    Updated: {new Date(driver.lastUpdate).toLocaleTimeString()}
                  </div>
                  <Button variant="ghost" size="sm" className="h-6">
                    <Phone className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Live Tracking Map Component (Placeholder for Phase 2)
function LiveTrackingMap({ tracking, updates }: { tracking: any; updates: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Live Tracking Overview
        </CardTitle>
        <CardDescription>Real-time transport operations monitoring</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 border rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{tracking.totalTrips}</div>
            <div className="text-sm text-muted-foreground">Total Trips</div>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className="text-2xl font-bold text-green-600">{tracking.activeTrips}</div>
            <div className="text-sm text-muted-foreground">Active Now</div>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{tracking.completedTrips}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{tracking.onTimePerformance}%</div>
            <div className="text-sm text-muted-foreground">On Time</div>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Live Map Integration</AlertTitle>
          <AlertDescription>
            Real-time GPS tracking and interactive map will be available in Phase 3 of the implementation.
            Current tracking data is updated every 30 seconds from driver check-ins.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Main Transport Operations Dashboard Component  
export default function TransportOperationsDashboard({ eventId }: TransportOperationsDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('operations');
  const [refreshing, setRefreshing] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Fetch transport operations data
  const { data: transportData, isLoading, error } = useTransportOperations(eventId);

  // Real-time analytics integration  
  const {
    isConnected,
    isConnecting,
    alerts,
    clearAlerts,
    metrics: realtimeMetrics,
    analyticsData
  } = useRealtimeAnalytics();

  // Transport status update mutations
  const updateGroupStatus = useMutation({
    mutationFn: async ({ groupId, status, location, eta }: {
      groupId: string;
      status: string;
      location?: string;
      eta?: string;
    }) => {
      const response = await put(`/api/events/${eventId}/transport/groups/${groupId}/status`, {
        status,
        location,
        eta
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/transport/operations`] });
      toast({
        title: "Status Updated",
        description: "Transport group status updated successfully.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update transport group status.",
      });
    }
  });

  const updateDriverStatus = useMutation({
    mutationFn: async ({ driverId, status, location }: {
      driverId: string;
      status: string;
      location?: string;
    }) => {
      const response = await put(`/api/events/${eventId}/transport/drivers/${driverId}/status`, {
        status,
        location
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/transport/operations`] });
      toast({
        title: "Driver Status Updated",
        description: "Driver status updated successfully.",
      });
    }
  });

  const broadcastToDrivers = useMutation({
    mutationFn: async ({ message, recipients, priority }: {
      message: string;
      recipients?: string[];
      priority: 'low' | 'normal' | 'high' | 'urgent';
    }) => {
      const response = await post(`/api/events/${eventId}/transport/broadcast`, {
        message,
        recipients,
        priority
      });
      return response.data;
    },
    onSuccess: () => {
      setBroadcastMessage('');
      toast({
        title: "Message Sent",
        description: "Broadcast message sent to all drivers successfully.",
      });
    }
  });

  // Refresh all data
  const refreshAllData = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/transport/operations`] });
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Loading transport operations...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Transport Data</AlertTitle>
          <AlertDescription>
            Unable to load transport operations data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const { groups = [], drivers = [], tracking = {} } = transportData || {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Enhanced Header with Real-time Status */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Transport Operations Dashboard</h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">
                Real-time monitoring and management of guest transportation
              </p>
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-600" />
                ) : isConnecting ? (
                  <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-600" />
                )}
                <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
                  {isConnected ? "Live Tracking" : isConnecting ? "Connecting..." : "Static"}
                </Badge>
                {alerts.length > 0 && (
                  <Badge variant="destructive" className="text-xs ml-1">
                    {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <Button 
                onClick={clearAlerts} 
                variant="outline" 
                size="sm"
                className="text-red-600 border-red-200"
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                Clear Alerts
              </Button>
            )}
            <Button onClick={refreshAllData} disabled={refreshing} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh All'}
            </Button>
          </div>
        </div>

        {/* Real-time Analytics Summary */}
        {realtimeMetrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Live Transport Analytics
                <Badge variant="outline" className="ml-auto">
                  Real-time Data
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {transportData?.tracking?.activeTrips || 0}
                  </div>
                  <div className="text-sm text-gray-600">Active Trips</div>
                  <div className="text-xs text-gray-500">Currently running</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {transportData?.tracking?.onTimePerformance || 0}%
                  </div>
                  <div className="text-sm text-gray-600">On-Time Rate</div>
                  <div className="text-xs text-gray-500">Performance metric</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {transportData?.tracking?.averageUtilization || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Utilization</div>
                  <div className="text-xs text-gray-500">Fleet efficiency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {transportData?.drivers?.filter((d: DriverStatus) => d.status === 'available').length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Available Drivers</div>
                  <div className="text-xs text-gray-500">Ready for dispatch</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {realtimeMetrics.totalRequests || 0}
                  </div>
                  <div className="text-sm text-gray-600">API Requests</div>
                  <div className="text-xs text-gray-500">System activity</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">
                    {realtimeMetrics.averageLatency || 0}ms
                  </div>
                  <div className="text-sm text-gray-600">Avg Response</div>
                  <div className="text-xs text-gray-500">System latency</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Real-time Alerts */}
        {alerts.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                Transport Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {alerts.slice(0, 5).map((alert, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Badge 
                      variant={alert.severity === 'critical' ? 'destructive' : 
                             alert.severity === 'error' ? 'destructive' :
                             alert.severity === 'warning' ? 'secondary' : 'outline'}
                      className="text-xs mt-0.5"
                    >
                      {alert.severity}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm text-red-800">{alert.message}</p>
                      <p className="text-xs text-red-600">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="operations">Live Operations</TabsTrigger>
            <TabsTrigger value="analytics">Transport Analytics</TabsTrigger>
            <TabsTrigger value="drivers">Driver Management</TabsTrigger>
            <TabsTrigger value="control">Control Center</TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="space-y-6">
            <TransportGroupsGrid 
              groups={groups} 
              onStatusUpdate={(groupId, status, location, eta) => 
                updateGroupStatus.mutate({ groupId, status, location, eta })
              }
              isConnected={isConnected}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fleet Performance Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Fleet Performance
                    {isConnected && <Badge variant="outline" className="ml-auto">Live</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Active Vehicles</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{groups.length}</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${(groups.length / Math.max(groups.length, 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm">On-Time Performance</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{tracking.onTimePerformance || 85}%</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-600 h-2 rounded-full" 
                            style={{ width: `${tracking.onTimePerformance || 85}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">Capacity Utilization</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{tracking.averageUtilization || 77.5}%</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${tracking.averageUtilization || 77.5}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Driver Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Driver Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['available', 'en-route', 'loading', 'completed', 'offline'].map(status => {
                      const count = drivers.filter((d: DriverStatus) => d.status === status).length;
                      const percentage = drivers.length > 0 ? (count / drivers.length) * 100 : 0;
                      const color = status === 'available' ? 'green' : 
                                  status === 'en-route' ? 'blue' :
                                  status === 'loading' ? 'yellow' :
                                  status === 'completed' ? 'gray' : 'red';
                      
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full bg-${color}-600`}></div>
                            <span className="text-sm capitalize">{status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{count}</span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`bg-${color}-600 h-2 rounded-full`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 w-10">{percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Live Tracking Summary */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Live Tracking Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{tracking.totalTrips || 0}</div>
                      <div className="text-sm text-gray-600">Total Trips</div>
                      <div className="text-xs text-gray-500">All scheduled</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{tracking.activeTrips || 0}</div>
                      <div className="text-sm text-gray-600">Active Now</div>
                      <div className="text-xs text-gray-500">Currently running</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">{tracking.completedTrips || 0}</div>
                      <div className="text-sm text-gray-600">Completed</div>
                      <div className="text-xs text-gray-500">Successfully finished</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {groups.reduce((total: number, group: TransportGroup) => total + group.assigned, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total Passengers</div>
                      <div className="text-xs text-gray-500">Being transported</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="drivers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DriverStatusPanel drivers={drivers} />
              <Card>
                <CardHeader>
                  <CardTitle>Driver Management Actions</CardTitle>
                  <CardDescription>Real-time driver coordination and communication</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Broadcast Message</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type message to all drivers..."
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-md text-sm"
                      />
                      <Button
                        onClick={() => broadcastToDrivers.mutate({
                          message: broadcastMessage,
                          priority: 'normal'
                        })}
                        disabled={!broadcastMessage.trim() || broadcastToDrivers.isPending}
                        size="sm"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Send
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    <Button variant="outline" className="justify-start">
                      <Shield className="h-4 w-4 mr-2" />
                      Emergency Contact Protocol
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Activity className="h-4 w-4 mr-2" />
                      Generate Driver Report
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Zap className="h-4 w-4 mr-2" />
                      System Health Check
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="control" className="space-y-6">
            <LiveTrackingMap tracking={tracking} updates={{}} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}