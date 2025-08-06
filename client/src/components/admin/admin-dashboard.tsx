import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Calendar, 
  Activity, 
  TrendingUp, 
  Bell, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useWebSocket } from '@/hooks/use-websocket';
import { StatsGrid } from './stats-grid';
import { UserManagementTable } from './user-management-table';
import { NotificationCenter } from './notification-center';
import { SystemHealth } from './system-health';
import { RealtimeChart } from './realtime-chart';
import { ProviderManagement } from './provider-management';

interface AdminDashboardData {
  users: {
    total: number;
    active: number;
    pending: number;
    byRole: Record<string, number>;
  };
  events: {
    total: number;
    recentlyCreated: number;
  };
  system: {
    uptime: number;
    memoryUsage: number;
    moduleMetrics: Record<string, number>;
  };
}

interface SystemInfo {
  users: Array<{
    id: number;
    username: string;
    name: string;
    role: string;
    status?: string;
  }>;
  events: Array<{
    id: number;
    title: string;
    createdBy: number;
  }>;
  defaultCredentials: {
    username: string;
    password: string;
  };
  authentication: {
    isAuthenticated: boolean;
    user: any;
  };
  system: {
    nodeVersion: string;
    uptime: number;
    memoryUsage: any;
    environment: string;
  };
}

export const AdminDashboard: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds
  const [notifications, setNotifications] = useState<any[]>([]);
  const queryClient = useQueryClient();

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage } = useWebSocket('/ws/notifications', {
    onConnect: (ws) => {
      // Identify as admin and subscribe to admin channels
      ws.send(JSON.stringify({
        type: 'IDENTIFY',
        data: {
          role: 'admin'
        }
      }));
    },
    shouldReconnect: true
  });

  // Fetch admin dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async (): Promise<AdminDashboardData> => {
      const response = await fetch('/api/admin/analytics/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    },
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: true
  });

  // Fetch system information
  const { data: systemInfo, isLoading: isSystemLoading } = useQuery({
    queryKey: ['admin', 'system', 'info'],
    queryFn: async (): Promise<SystemInfo> => {
      const response = await fetch('/api/admin/system/info');
      if (!response.ok) {
        throw new Error('Failed to fetch system info');
      }
      return response.json();
    },
    refetchInterval: 60000 // 1 minute
  });

  // Fetch notification metrics
  const { data: notificationMetrics } = useQuery({
    queryKey: ['admin', 'notifications', 'metrics'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch notification metrics');
      }
      return response.json();
    },
    refetchInterval: 15000 // 15 seconds
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const message = JSON.parse(lastMessage.data);
        
        // Add to notifications list
        if (message.type !== 'SYSTEM_WELCOME' && message.type !== 'PONG') {
          setNotifications(prev => [message, ...prev.slice(0, 49)]); // Keep last 50
        }

        // Invalidate relevant queries for real-time updates
        if (['RSVP_RECEIVED', 'USER_APPROVED', 'GUEST_ADDED'].includes(message.type)) {
          queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        }

        if (message.type === 'USER_APPROVED') {
          queryClient.invalidateQueries({ queryKey: ['admin', 'system', 'info'] });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage, queryClient]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const handleTestNotification = async () => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }
      
      const result = await response.json();
      console.log('Test notification sent:', result);
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  if (isDashboardLoading || isSystemLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading dashboard: {(dashboardError as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage your wedding platform
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <Button variant="outline" size="sm" onClick={handleTestNotification}>
            <Bell className="h-4 w-4 mr-2" />
            Test Notification
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Banner */}
      <SystemHealth 
        isConnected={isConnected}
        systemInfo={systemInfo?.system}
        notificationMetrics={notificationMetrics}
      />

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Stats Grid */}
          <StatsGrid 
            data={dashboardData}
            systemInfo={systemInfo}
          />

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  System Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RealtimeChart 
                  data={dashboardData?.system?.moduleMetrics || {}}
                  type="performance"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {notifications.slice(0, 5).map((notification, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                      </div>
                      <Badge variant={getPriorityVariant(notification.priority)}>
                        {notification.priority}
                      </Badge>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent activity
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <UserManagementTable 
            users={systemInfo?.users || []}
            onUserUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ['admin', 'system', 'info'] });
            }}
          />
        </TabsContent>

        <TabsContent value="providers">
          <ProviderManagement />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationCenter 
            notifications={notifications}
            metrics={notificationMetrics}
            isConnected={isConnected}
          />
        </TabsContent>

        <TabsContent value="system">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2">Environment</h4>
                    <p className="text-sm">Node.js: {systemInfo?.system?.nodeVersion}</p>
                    <p className="text-sm">Environment: {systemInfo?.system?.environment}</p>
                    <p className="text-sm">Uptime: {formatUptime(systemInfo?.system?.uptime || 0)}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Memory Usage</h4>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>Heap Used</span>
                          <span>{Math.round(systemInfo?.system?.memoryUsage?.heapUsed / 1024 / 1024 || 0)} MB</span>
                        </div>
                        <Progress 
                          value={(systemInfo?.system?.memoryUsage?.heapUsed / systemInfo?.system?.memoryUsage?.heapTotal) * 100 || 0} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Default Credentials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded font-mono text-sm">
                  <p>Username: {systemInfo?.defaultCredentials?.username}</p>
                  <p>Password: {systemInfo?.defaultCredentials?.password}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function getPriorityVariant(priority: string) {
  switch (priority) {
    case 'urgent': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    case 'low': return 'outline';
    default: return 'secondary';
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}
