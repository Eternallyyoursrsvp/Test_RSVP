/**
 * Real-time Analytics Hook
 * Provides WebSocket-based live data connections for enterprise analytics
 * Ferrari transformation: Phase 2.5 - Real-time analytics implementation
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useCurrentEvent } from './use-current-event';

interface RealtimeMetrics {
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
}

interface SystemAlert {
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  providerId?: string;
  timestamp: string;
  context?: Record<string, any>;
}

interface AnalyticsData {
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
}

interface UseRealtimeAnalyticsReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Real-time data
  metrics: RealtimeMetrics | null;
  providerMetrics: ProviderMetric[];
  alerts: SystemAlert[];
  analyticsData: AnalyticsData | null;
  
  // Connection control
  connect: () => void;
  disconnect: () => void;
  
  // Subscriptions
  subscribe: (subscriptions: string[]) => void;
  unsubscribe: (subscriptions: string[]) => void;
  
  // Actions
  testProvider: (providerId: string) => void;
  clearAlerts: () => void;
}

const WS_URL = process.env.NODE_ENV === 'development' 
  ? 'ws://localhost:3001/ws/communication-monitor'
  : `wss://${window.location.host}/ws/communication-monitor`;

export function useRealtimeAnalytics(): UseRealtimeAnalyticsReturn {
  const { user } = useAuth();
  const { currentEvent } = useCurrentEvent();
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Real-time data
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [providerMetrics, setProviderMetrics] = useState<ProviderMetric[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  
  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Real-time analytics WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Subscribe to analytics data
        const subscriptions = ['metrics', 'provider_status', 'alert', 'analytics_data'];
        ws.send(JSON.stringify({
          type: 'subscribe',
          payload: {
            subscriptions,
            userId: user.id.toString(),
            tenantId: (user as any).tenantId?.toString(),
            eventId: currentEvent?.id?.toString()
          }
        }));
        
        // Start heartbeat
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Real-time analytics WebSocket disconnected');
        setIsConnected(false);
        setIsConnecting(false);
        stopHeartbeat();
        
        // Attempt reconnection if not manual disconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setConnectionError('Failed to establish connection after multiple attempts');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('WebSocket connection error');
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to create connection');
      setIsConnecting(false);
    }
  }, [user, currentEvent]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    stopHeartbeat();
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttempts.current = maxReconnectAttempts; // Prevent auto-reconnect
  }, []);

  const handleMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'metrics':
        setMetrics(message.payload);
        break;
        
      case 'provider_status':
        setProviderMetrics(message.payload);
        break;
        
      case 'alert':
        setAlerts(prev => {
          const newAlert = { ...message.payload, timestamp: new Date().toISOString() };
          return [newAlert, ...prev.slice(0, 19)]; // Keep last 20 alerts
        });
        break;
        
      case 'analytics_data':
        setAnalyticsData(message.payload);
        break;
        
      case 'subscription_confirmed':
        console.log('Subscriptions confirmed:', message.subscriptions);
        break;
        
      case 'heartbeat_ack':
        // Heartbeat acknowledged
        break;
        
      case 'provider_test_result':
        console.log('Provider test result:', message.payload);
        break;
        
      case 'error':
        console.error('WebSocket error message:', message.message);
        setConnectionError(message.message);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      }
    }, 30000); // Send heartbeat every 30 seconds
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const subscribe = useCallback((subscriptions: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        payload: { subscriptions }
      }));
    }
  }, []);

  const unsubscribe = useCallback((subscriptions: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        payload: { subscriptions }
      }));
    }
  }, []);

  const testProvider = useCallback((providerId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'test_provider',
        payload: { providerId }
      }));
    }
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Auto-connect when user is available
  useEffect(() => {
    if (user) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    
    // Real-time data
    metrics,
    providerMetrics,
    alerts,
    analyticsData,
    
    // Connection control
    connect,
    disconnect,
    
    // Subscriptions
    subscribe,
    unsubscribe,
    
    // Actions
    testProvider,
    clearAlerts
  };
}