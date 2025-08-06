/**
 * WebSocket Handler for Real-time Communication Monitoring
 * Provides live updates for the Communication Command Center
 * Enterprise-grade real-time monitoring with performance metrics
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { UnifiedProviderInheritanceService } from '../services/unified-provider-inheritance';
import { UnifiedTemplateInheritanceService } from '../services/unified-template-inheritance';

interface MonitoringClient {
  ws: WebSocket;
  userId?: string;
  tenantId?: string;
  eventId?: string;
  subscriptions: Set<string>;
  lastHeartbeat: Date;
}

interface RealTimeMetrics {
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
  context?: Record<string, any>;
}

export class CommunicationMonitoringService {
  private wss: WebSocketServer;
  private clients: Map<string, MonitoringClient> = new Map();
  private providerService: UnifiedProviderInheritanceService;
  private templateService: UnifiedTemplateInheritanceService;
  private metricsInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  // In-memory metrics storage (would be replaced with Redis/database in production)
  private currentMetrics: RealTimeMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageLatency: 0,
    activeProviders: 0,
    queueDepth: 0,
    throughput: 0
  };

  private providerMetrics: Map<string, ProviderMetric> = new Map();

  constructor(server: any) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/communication-monitor',
      clientTracking: true
    });

    this.providerService = new UnifiedProviderInheritanceService();
    this.templateService = new UnifiedTemplateInheritanceService();

    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', this.handleConnection.bind(this));
    this.startMetricsCollection();
    this.startHeartbeat();

    console.log('Communication monitoring WebSocket server initialized');
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage) {
    const clientId = this.generateClientId();
    const client: MonitoringClient = {
      ws,
      subscriptions: new Set(),
      lastHeartbeat: new Date()
    };

    this.clients.set(clientId, client);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(clientId, message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        this.sendError(clientId, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      console.log(`Client ${clientId} disconnected from communication monitor`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.clients.delete(clientId);
    });

    // Send initial data
    this.sendInitialData(clientId);

    console.log(`Client ${clientId} connected to communication monitor`);
  }

  private handleClientMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(clientId, message.payload);
        break;
      case 'unsubscribe':
        this.handleUnsubscription(clientId, message.payload);
        break;
      case 'heartbeat':
        client.lastHeartbeat = new Date();
        this.sendMessage(clientId, { type: 'heartbeat_ack', timestamp: new Date() });
        break;
      case 'test_provider':
        this.handleProviderTest(clientId, message.payload);
        break;
      default:
        this.sendError(clientId, `Unknown message type: ${message.type}`);
    }
  }

  private handleSubscription(clientId: string, payload: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { subscriptions, userId, tenantId, eventId } = payload;
    
    client.userId = userId;
    client.tenantId = tenantId;
    client.eventId = eventId;

    if (Array.isArray(subscriptions)) {
      subscriptions.forEach(sub => client.subscriptions.add(sub));
    }

    this.sendMessage(clientId, {
      type: 'subscription_confirmed',
      subscriptions: Array.from(client.subscriptions)
    });
  }

  private handleUnsubscription(clientId: string, payload: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { subscriptions } = payload;
    
    if (Array.isArray(subscriptions)) {
      subscriptions.forEach(sub => client.subscriptions.delete(sub));
    }

    this.sendMessage(clientId, {
      type: 'unsubscription_confirmed',
      subscriptions: Array.from(client.subscriptions)
    });
  }

  private async handleProviderTest(clientId: string, payload: any) {
    try {
      const { providerId } = payload;
      const client = this.clients.get(clientId);
      if (!client || !client.userId) return;

      const context = {
        userId: parseInt(client.userId) || 1, // Convert to number and provide fallback
        userRole: 'admin', // Would be retrieved from authentication
        requestId: this.generateRequestId(),
        ipAddress: '127.0.0.1', // Would be extracted from connection
        userAgent: 'WebSocket Client'
      };

      const testResult = await this.providerService.testProviderConnection(providerId, context);
      
      this.sendMessage(clientId, {
        type: 'provider_test_result',
        payload: testResult.data
      });

      // Update provider metrics after test
      this.updateProviderMetrics();

    } catch (error) {
      this.sendError(clientId, `Provider test failed: ${(error as Error).message}`);
    }
  }

  private sendInitialData(clientId: string) {
    // Send current metrics
    this.sendMessage(clientId, {
      type: 'metrics',
      payload: this.currentMetrics
    });

    // Send provider status
    this.sendMessage(clientId, {
      type: 'provider_status',
      payload: Array.from(this.providerMetrics.values())
    });
  }

  private startMetricsCollection() {
    // Collect metrics every 5 seconds
    this.metricsInterval = setInterval(async () => {
      await this.collectAndBroadcastMetrics();
    }, 5000);
  }

  private startHeartbeat() {
    // Check client connections every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleThreshold = 60000; // 60 seconds

      for (const [clientId, client] of this.clients.entries()) {
        const timeSinceHeartbeat = now.getTime() - client.lastHeartbeat.getTime();
        
        if (timeSinceHeartbeat > staleThreshold) {
          console.log(`Removing stale client ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
        }
      }
    }, 30000);
  }

  private async collectAndBroadcastMetrics() {
    try {
      // Update current metrics (would integrate with actual monitoring system)
      await this.updateCurrentMetrics();
      await this.updateProviderMetrics();

      // Broadcast to subscribed clients
      this.broadcast('metrics', this.currentMetrics);
      this.broadcast('provider_status', Array.from(this.providerMetrics.values()));

    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }

  private async updateCurrentMetrics() {
    // Simulate metrics collection - would integrate with actual monitoring
    const baseMetrics = this.currentMetrics;
    
    this.currentMetrics = {
      totalRequests: baseMetrics.totalRequests + Math.floor(Math.random() * 50),
      successfulRequests: baseMetrics.successfulRequests + Math.floor(Math.random() * 45),
      failedRequests: baseMetrics.failedRequests + Math.floor(Math.random() * 5),
      averageLatency: 120 + Math.floor(Math.random() * 100),
      activeProviders: 8 + Math.floor(Math.random() * 3),
      queueDepth: Math.floor(Math.random() * 100),
      throughput: 1000 + Math.floor(Math.random() * 500)
    };

    // Check for alert conditions
    this.checkAlertConditions();
  }

  private async updateProviderMetrics() {
    // Simulate provider metrics - would integrate with actual provider monitoring
    const providers = [
      { id: 'provider-1', name: 'Gmail', type: 'email' as const },
      { id: 'provider-2', name: 'Twilio', type: 'sms' as const },
      { id: 'provider-3', name: 'WhatsApp Business', type: 'whatsapp' as const }
    ];

    providers.forEach(provider => {
      const latency = 100 + Math.floor(Math.random() * 200);
      const errorRate = Math.random() * 5;
      
      const metric: ProviderMetric = {
        providerId: provider.id,
        providerName: provider.name,
        providerType: provider.type,
        status: latency > 300 ? 'degraded' : 'online',
        latency,
        requestsPerMinute: Math.floor(Math.random() * 100),
        errorRate
      };

      this.providerMetrics.set(provider.id, metric);
    });
  }

  private checkAlertConditions() {
    const { averageLatency, queueDepth, activeProviders } = this.currentMetrics;

    // High latency alert
    if (averageLatency > 300) {
      this.broadcastAlert({
        severity: 'warning',
        message: `High average latency detected: ${averageLatency}ms`
      });
    }

    // Queue depth alert
    if (queueDepth > 500) {
      this.broadcastAlert({
        severity: 'error',
        message: `Message queue depth is high: ${queueDepth} messages`
      });
    }

    // Provider availability alert
    if (activeProviders < 5) {
      this.broadcastAlert({
        severity: 'critical',
        message: `Low provider availability: only ${activeProviders} providers active`
      });
    }
  }

  private broadcast(type: string, payload: any) {
    const message = JSON.stringify({ type, payload });
    
    for (const [clientId, client] of this.clients.entries()) {
      if (client.subscriptions.has(type) || client.subscriptions.has('all')) {
        try {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(message);
          }
        } catch (error) {
          console.error(`Error broadcasting to client ${clientId}:`, error);
        }
      }
    }
  }

  private broadcastAlert(alert: SystemAlert) {
    this.broadcast('alert', alert);
  }

  private sendMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error);
    }
  }

  private sendError(clientId: string, error: string) {
    this.sendMessage(clientId, {
      type: 'error',
      message: error,
      timestamp: new Date()
    });
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `ws-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for external integration
  public recordProviderRequest(providerId: string, success: boolean, latency: number) {
    this.currentMetrics.totalRequests++;
    if (success) {
      this.currentMetrics.successfulRequests++;
    } else {
      this.currentMetrics.failedRequests++;
    }

    // Update provider-specific metrics
    const provider = this.providerMetrics.get(providerId);
    if (provider) {
      provider.latency = latency;
      provider.errorRate = success ? Math.max(0, provider.errorRate - 0.1) : provider.errorRate + 1;
    }
  }

  public triggerAlert(alert: SystemAlert) {
    this.broadcastAlert(alert);
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }

  public shutdown() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    for (const [clientId, client] of this.clients.entries()) {
      client.ws.close();
    }

    this.wss.close();
    console.log('Communication monitoring service shut down');
  }
}

export default CommunicationMonitoringService;