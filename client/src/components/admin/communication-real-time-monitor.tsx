/**
 * Real-time Communication Monitor
 * Live monitoring component for the Communication Command Center
 * WebSocket-based real-time updates with performance metrics
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Play
} from 'lucide-react';

interface RealTimeMetrics {
  timestamp: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  activeProviders: number;
  queueDepth: number;
  throughput: number;
}

interface ProviderMetric {
  providerId: string;
  providerName: string;
  providerType: 'email' | 'sms' | 'whatsapp';
  status: 'online' | 'degraded' | 'offline';
  latency: number;
  requestsPerMinute: number;
  errorRate: number;
  lastUpdate: Date;
}

interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  providerId?: string;
  acknowledged: boolean;
}

export const CommunicationRealTimeMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<RealTimeMetrics[]>([]);
  const [providerMetrics, setProviderMetrics] = useState<ProviderMetric[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const maxDataPoints = 60; // Keep last 60 data points (1 hour at 1-minute intervals)

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isPaused) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isPaused]);

  const connectWebSocket = () => {
    try {
      // WebSocket URL would be configured based on environment
      const wsUrl = process.env.NODE_ENV === 'development' 
        ? 'ws://localhost:3001/ws/communication-monitor'
        : `wss://${window.location.host}/ws/communication-monitor`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('Connected to real-time communication monitor');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealTimeUpdate(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('Disconnected from real-time communication monitor');
        
        // Attempt to reconnect after 5 seconds if not paused
        if (!isPaused) {
          setTimeout(connectWebSocket, 5000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  const handleRealTimeUpdate = (data: any) => {
    switch (data.type) {
      case 'metrics':
        updateMetrics(data.payload);
        break;
      case 'provider_status':
        updateProviderMetrics(data.payload);
        break;
      case 'alert':
        addAlert(data.payload);
        break;
      default:
        console.warn('Unknown real-time update type:', data.type);
    }
  };

  const updateMetrics = (newMetric: Omit<RealTimeMetrics, 'timestamp'>) => {
    const metric: RealTimeMetrics = {
      ...newMetric,
      timestamp: new Date()
    };

    setMetrics(prev => {
      const updated = [...prev, metric];
      return updated.slice(-maxDataPoints); // Keep only recent data points
    });
  };

  const updateProviderMetrics = (providers: ProviderMetric[]) => {
    setProviderMetrics(providers.map(p => ({
      ...p,
      lastUpdate: new Date()
    })));
  };

  const addAlert = (alert: Omit<SystemAlert, 'id' | 'timestamp' | 'acknowledged'>) => {
    const newAlert: SystemAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false
    };

    setAlerts(prev => [newAlert, ...prev.slice(0, 49)]); // Keep only recent 50 alerts
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  // Calculate current metrics
  const currentMetrics = metrics[metrics.length - 1];
  const previousMetrics = metrics[metrics.length - 2];
  
  const successRate = currentMetrics 
    ? (currentMetrics.successfulRequests / currentMetrics.totalRequests) * 100
    : 0;

  const latencyTrend = currentMetrics && previousMetrics
    ? currentMetrics.averageLatency - previousMetrics.averageLatency
    : 0;

  const throughputTrend = currentMetrics && previousMetrics
    ? currentMetrics.throughput - previousMetrics.throughput
    : 0;

  // Chart data formatting
  const chartData = metrics.map(metric => ({
    time: metric.timestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    latency: metric.averageLatency,
    throughput: metric.throughput,
    successRate: (metric.successfulRequests / metric.totalRequests) * 100,
    queueDepth: metric.queueDepth
  }));

  // Provider status distribution for pie chart
  const providerStatusData = [
    { name: 'Online', value: providerMetrics.filter(p => p.status === 'online').length, color: '#10b981' },
    { name: 'Degraded', value: providerMetrics.filter(p => p.status === 'degraded').length, color: '#f59e0b' },
    { name: 'Offline', value: providerMetrics.filter(p => p.status === 'offline').length, color: '#ef4444' }
  ];

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-time Monitor</h2>
          <p className="text-gray-600 mt-1">Live communication system performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={togglePause}
          >
            {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
        </div>
      </div>

      {/* Real-time Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Throughput
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {currentMetrics?.throughput.toLocaleString() || '0'}
            </div>
            <div className="flex items-center text-xs text-gray-600">
              {throughputTrend > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span>messages/hour</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Avg Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {currentMetrics?.averageLatency || 0}ms
            </div>
            <div className="flex items-center text-xs text-gray-600">
              {latencyTrend < 0 ? (
                <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span>{Math.abs(latencyTrend).toFixed(0)}ms change</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {successRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">
              {currentMetrics?.successfulRequests || 0} of {currentMetrics?.totalRequests || 0} requests
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Active Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {currentMetrics?.activeProviders || 0}
            </div>
            <div className="text-xs text-gray-600">
              Queue: {currentMetrics?.queueDepth || 0} messages
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Response Time Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Throughput Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Throughput & Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="throughput" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="successRate" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Provider Status and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Provider Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {providerMetrics.map((provider) => (
                <div key={provider.providerId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      provider.status === 'online' ? 'bg-green-500' :
                      provider.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-medium">{provider.providerName}</span>
                    <Badge variant="outline" className="text-xs">
                      {provider.providerType}
                    </Badge>
                  </div>
                  <div className="text-right text-xs text-gray-600">
                    <div>{provider.latency}ms</div>
                    <div>{provider.requestsPerMinute}/min</div>
                  </div>
                </div>
              ))}
            </div>
            
            {providerStatusData.some(d => d.value > 0) && (
              <div className="mt-4 flex justify-center">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={providerStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={40}
                      dataKey="value"
                    >
                      {providerStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>No active alerts</p>
                </div>
              ) : (
                alerts.slice(0, 10).map((alert) => (
                  <Alert 
                    key={alert.id} 
                    className={`${alert.acknowledged ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2">
                        {getAlertIcon(alert.severity)}
                        <div>
                          <AlertDescription className="text-sm">
                            {alert.message}
                          </AlertDescription>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={getAlertBadgeVariant(alert.severity)} className="text-xs">
                              {alert.severity}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {alert.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="text-xs"
                        >
                          Ack
                        </Button>
                      )}
                    </div>
                  </Alert>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CommunicationRealTimeMonitor;