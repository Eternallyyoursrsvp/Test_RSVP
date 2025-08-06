/**
 * Communication Analytics Dashboard
 * Comprehensive dashboard for communication performance monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRealtimeAnalytics } from "@/hooks/use-realtime-analytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Mail,
  MessageSquare,
  Smartphone,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';

interface DashboardMetrics {
  overview: {
    totalMessages: number;
    deliveryRate: number;
    engagementRate: number;
    totalCost: number;
    avgResponseTime: number;
  };
  channelPerformance: Array<{
    channel: string;
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    cost: number;
  }>;
  recentActivity: Array<{
    timestamp: string;
    channel: string;
    eventType: string;
    count: number;
  }>;
  topPerformingMessages: Array<{
    messageId: string;
    subject: string;
    channel: string;
    sentCount: number;
    openRate: number;
    clickRate: number;
  }>;
  alertsAndIssues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
    channel?: string;
  }>;
}

interface RealtimeStats {
  activeUsers: number;
  messagesLast5Min: number;
  currentDeliveryRate: number;
  issuesDetected: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface CommunicationDashboardProps {
  eventId?: string;
  timeRange?: { start: string; end: string };
}

const COLORS = {
  email: '#3B82F6',
  sms: '#10B981',
  whatsapp: '#F59E0B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444'
};

export const CommunicationDashboard: React.FC<CommunicationDashboardProps> = ({
  eventId = 'default',
  timeRange
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Real-time analytics hook
  const {
    isConnected,
    isConnecting,
    connectionError,
    metrics: realtimeMetrics,
    providerMetrics,
    alerts,
    analyticsData,
    testProvider,
    clearAlerts
  } = useRealtimeAnalytics();

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const params = new URLSearchParams();
      if (timeRange) {
        params.append('startDate', timeRange.start);
        params.append('endDate', timeRange.end);
      }

      const dashboardResponse = await fetch(`/api/v2/communication/analytics?eventId=${eventId}&${params}`);

      if (!dashboardResponse.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const dashboardResult = await dashboardResponse.json();
      setDashboardData(dashboardResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [eventId, timeRange]);

  // Auto-refresh realtime data every 30 seconds
  // Real-time data is now handled by WebSocket connection
  // No need for polling-based updates

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSystemHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <XCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData) {
    return (
      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          No analytics data available for this event.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with real-time status and refresh button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Communication Analytics</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600">Real-time communication performance monitoring</p>
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : isConnecting ? (
                <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                {isConnected ? "Live" : isConnecting ? "Connecting..." : "Offline"}
              </Badge>
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
              {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
            </Button>
          )}
          <Button onClick={fetchDashboardData} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Real-time Status Bar */}
      {realtimeMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Real-time Metrics
              <Badge variant="outline" className="ml-auto">
                Live Data
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{realtimeMetrics.totalRequests}</div>
                <div className="text-sm text-gray-600">Total Requests</div>
                <div className="text-xs text-gray-500">
                  Success: {realtimeMetrics.successfulRequests} | Failed: {realtimeMetrics.failedRequests}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{realtimeMetrics.averageLatency}ms</div>
                <div className="text-sm text-gray-600">Avg Latency</div>
                <div className="text-xs text-gray-500">Response time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{realtimeMetrics.activeProviders}</div>
                <div className="text-sm text-gray-600">Active Providers</div>
                <div className="text-xs text-gray-500">Online providers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{realtimeMetrics.throughput}</div>
                <div className="text-sm text-gray-600">Throughput</div>
                <div className="text-xs text-gray-500">msgs/hour</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Realtime Alerts */}
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              System Alerts ({alerts.length})
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

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Mail className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-gray-600">All channels combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.deliveryRate}%</div>
            <Progress value={dashboardData.overview.deliveryRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Users className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.engagementRate}%</div>
            <Progress value={dashboardData.overview.engagementRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dashboardData.overview.totalCost}</div>
            <p className="text-xs text-gray-600">Communication spend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.avgResponseTime}ms</div>
            <p className="text-xs text-gray-600">Delivery speed</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels">Channel Performance</TabsTrigger>
          <TabsTrigger value="providers">Live Providers</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
                <CardDescription>Messages sent and delivery rates by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData.channelPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channel" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalSent" fill={COLORS.email} name="Sent" />
                    <Bar dataKey="delivered" fill={COLORS.success} name="Delivered" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Engagement Rates */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Rates</CardTitle>
                <CardDescription>Open and click rates by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboardData.channelPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channel" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, '']} />
                    <Bar dataKey="openRate" fill={COLORS.sms} name="Open Rate %" />
                    <Bar dataKey="clickRate" fill={COLORS.whatsapp} name="Click Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Channel Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Channel Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Channel</th>
                      <th className="text-right p-2">Sent</th>
                      <th className="text-right p-2">Delivered</th>
                      <th className="text-right p-2">Opened</th>
                      <th className="text-right p-2">Clicked</th>
                      <th className="text-right p-2">Delivery Rate</th>
                      <th className="text-right p-2">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.channelPerformance.map((channel) => (
                      <tr key={channel.channel} className="border-b">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {channel.channel === 'email' && <Mail className="w-4 h-4" />}
                            {channel.channel === 'sms' && <Smartphone className="w-4 h-4" />}
                            {channel.channel === 'whatsapp' && <MessageSquare className="w-4 h-4" />}
                            <span className="capitalize">{channel.channel}</span>
                          </div>
                        </td>
                        <td className="text-right p-2">{channel.totalSent.toLocaleString()}</td>
                        <td className="text-right p-2">{channel.delivered.toLocaleString()}</td>
                        <td className="text-right p-2">{channel.opened.toLocaleString()}</td>
                        <td className="text-right p-2">{channel.clicked.toLocaleString()}</td>
                        <td className="text-right p-2">
                          <Badge variant={channel.deliveryRate >= 95 ? "default" : "secondary"}>
                            {channel.deliveryRate}%
                          </Badge>
                        </td>
                        <td className="text-right p-2">${channel.cost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Live Provider Status
                <Badge variant="outline">{providerMetrics.length} Providers</Badge>
              </CardTitle>
              <CardDescription>
                Real-time status and performance metrics for communication providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {providerMetrics.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No provider data available</p>
                  <p className="text-sm text-gray-400">Real-time connection required</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {providerMetrics.map((provider) => (
                    <div key={provider.providerId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {provider.providerType === 'email' && <Mail className="w-5 h-5 text-blue-600" />}
                            {provider.providerType === 'sms' && <Smartphone className="w-5 h-5 text-green-600" />}
                            {provider.providerType === 'whatsapp' && <MessageSquare className="w-5 h-5 text-green-600" />}
                            <span className="font-medium">{provider.providerName}</span>
                          </div>
                          <Badge 
                            variant={provider.status === 'online' ? 'default' : 
                                   provider.status === 'degraded' ? 'secondary' : 'destructive'}
                          >
                            {provider.status}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testProvider(provider.providerId)}
                          disabled={!isConnected}
                        >
                          <Zap className="w-4 h-4 mr-1" />
                          Test
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Latency</div>
                          <div className={`font-medium ${
                            provider.latency > 300 ? 'text-red-600' :
                            provider.latency > 150 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {provider.latency}ms
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Requests/min</div>
                          <div className="font-medium">{provider.requestsPerMinute}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Error Rate</div>
                          <div className={`font-medium ${
                            provider.errorRate > 5 ? 'text-red-600' :
                            provider.errorRate > 2 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {provider.errorRate.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity Timeline</CardTitle>
              <CardDescription>Communication events in the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.recentActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dashboardData.recentActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value, name) => [value, name]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke={COLORS.email} 
                      fill={COLORS.email} 
                      fillOpacity={0.3}
                      name="Event Count"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent activity to display
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts & Issues</CardTitle>
              <CardDescription>Recent issues and system notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.alertsAndIssues.length > 0 ? (
                  dashboardData.alertsAndIssues.map((alert, index) => (
                    <Alert 
                      key={index} 
                      className={
                        alert.type === 'error' ? 'border-red-200 bg-red-50' :
                        alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      }
                    >
                      {alert.type === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                      {alert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                      {alert.type === 'info' && <CheckCircle className="w-4 h-4 text-blue-600" />}
                      <AlertDescription>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className={
                              alert.type === 'error' ? 'text-red-800' :
                              alert.type === 'warning' ? 'text-yellow-800' :
                              'text-blue-800'
                            }>
                              {alert.message}
                            </div>
                            {alert.channel && (
                              <div className="text-xs text-gray-600 mt-1">
                                Channel: {alert.channel}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                ) : (
                  <div className="text-center py-8 text-green-600">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                    <div>No issues detected - All systems running smoothly!</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommunicationDashboard;