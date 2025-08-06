import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';

export interface Notification {
  id: string;
  type: string;
  eventId?: number;
  userId?: number;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface WebSocketClient {
  id: string;
  socket: WebSocket;
  userId?: number;
  eventId?: number;
  subscriptions: Set<string>;
  lastPing: number;
  metadata: {
    userAgent?: string;
    ip?: string;
    connectedAt: number;
  };
}

export class NotificationWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0
  };
  private pingInterval: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/notifications',
      perMessageDeflate: false
    });
    
    this.setupEventHandlers();
    this.startPingPong();
    
    console.log('✅ WebSocket notification server initialized');
  }

  private setupEventHandlers() {
    this.wss.on('connection', (socket: WebSocket, req) => {
      const clientId = uuidv4();
      const client: WebSocketClient = {
        id: clientId,
        socket,
        subscriptions: new Set(),
        lastPing: Date.now(),
        metadata: {
          userAgent: req.headers['user-agent'],
          ip: req.socket.remoteAddress,
          connectedAt: Date.now()
        }
      };

      this.clients.set(clientId, client);
      this.metrics.totalConnections++;
      this.metrics.activeConnections++;

      console.log(`🔌 WebSocket client connected: ${clientId} (${this.metrics.activeConnections} active)`);

      // Send welcome message
      this.sendToClient(clientId, {
        id: uuidv4(),
        type: 'SYSTEM_WELCOME',
        title: 'Connected',
        message: 'WebSocket connection established',
        timestamp: new Date().toISOString(),
        priority: 'low',
        data: { clientId }
      });

      socket.on('message', (data) => {
        this.handleClientMessage(clientId, data);
      });

      socket.on('close', (code, reason) => {
        this.handleClientDisconnect(clientId, code, reason?.toString());
      });

      socket.on('error', (error) => {
        this.handleClientError(clientId, error);
      });

      socket.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
        }
      });
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
      this.metrics.errors++;
    });
  }

  private handleClientMessage(clientId: string, data: WebSocket.Data) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      this.metrics.messagesReceived++;
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'SUBSCRIBE':
          this.handleSubscription(clientId, message.data);
          break;
        case 'UNSUBSCRIBE':
          this.handleUnsubscription(clientId, message.data);
          break;
        case 'PING':
          this.sendToClient(clientId, {
            id: uuidv4(),
            type: 'PONG',
            title: 'Pong',
            message: 'Connection alive',
            timestamp: new Date().toISOString(),
            priority: 'low'
          });
          break;
        case 'IDENTIFY':
          this.handleClientIdentification(clientId, message.data);
          break;
        default:
          console.warn(`⚠️ Unknown message type from ${clientId}:`, message.type);
      }
    } catch (error) {
      console.error(`❌ Error handling message from ${clientId}:`, error);
      this.metrics.errors++;
    }
  }

  private handleSubscription(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { eventId, userId, channels } = data;
    
    if (eventId) client.eventId = eventId;
    if (userId) client.userId = userId;
    
    if (channels && Array.isArray(channels)) {
      channels.forEach(channel => client.subscriptions.add(channel));
    }

    console.log(`📡 Client ${clientId} subscribed to:`, Array.from(client.subscriptions));

    this.sendToClient(clientId, {
      id: uuidv4(),
      type: 'SUBSCRIPTION_CONFIRMED',
      title: 'Subscribed',
      message: `Subscribed to ${client.subscriptions.size} channels`,
      timestamp: new Date().toISOString(),
      priority: 'low',
      data: { subscriptions: Array.from(client.subscriptions) }
    });
  }

  private handleUnsubscription(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channels } = data;
    
    if (channels && Array.isArray(channels)) {
      channels.forEach(channel => client.subscriptions.delete(channel));
    }

    this.sendToClient(clientId, {
      id: uuidv4(),
      type: 'UNSUBSCRIPTION_CONFIRMED',
      title: 'Unsubscribed',
      message: `Unsubscribed from channels`,
      timestamp: new Date().toISOString(),
      priority: 'low'
    });
  }

  private handleClientIdentification(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { userId, eventId, role } = data;
    
    if (userId) client.userId = userId;
    if (eventId) client.eventId = eventId;
    
    // Auto-subscribe based on role and context
    if (role === 'admin') {
      client.subscriptions.add('admin');
      client.subscriptions.add('system');
    }
    
    if (eventId) {
      client.subscriptions.add(`event:${eventId}`);
    }
    
    if (userId) {
      client.subscriptions.add(`user:${userId}`);
    }

    console.log(`🆔 Client ${clientId} identified as user ${userId} with role ${role}`);
  }

  private handleClientDisconnect(clientId: string, code: number, reason?: string) {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      this.metrics.activeConnections--;
      
      const duration = Date.now() - client.metadata.connectedAt;
      console.log(`🔌 Client ${clientId} disconnected (code: ${code}, duration: ${duration}ms, active: ${this.metrics.activeConnections})`);
    }
  }

  private handleClientError(clientId: string, error: Error) {
    console.error(`❌ Client ${clientId} error:`, error);
    this.metrics.errors++;
    
    const client = this.clients.get(clientId);
    if (client && client.socket.readyState === WebSocket.OPEN) {
      client.socket.close(1011, 'Server error');
    }
  }

  private startPingPong() {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 seconds

      this.clients.forEach((client, clientId) => {
        if (client.socket.readyState === WebSocket.OPEN) {
          if (now - client.lastPing > timeout) {
            console.log(`⏰ Client ${clientId} timed out, closing connection`);
            client.socket.close(1001, 'Ping timeout');
          } else {
            client.socket.ping();
          }
        } else {
          this.clients.delete(clientId);
          this.metrics.activeConnections--;
        }
      });
    }, 15000); // Check every 15 seconds
  }

  // Public methods for sending notifications
  broadcast(notification: Notification, channel?: string) {
    const start = performance.now();
    let sentCount = 0;

    this.clients.forEach((client, clientId) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        // Check if client should receive this notification
        if (this.shouldReceiveNotification(client, notification, channel)) {
          this.sendToClient(clientId, notification);
          sentCount++;
        }
      }
    });

    const duration = performance.now() - start;
    console.log(`📡 Broadcast sent to ${sentCount}/${this.clients.size} clients in ${duration.toFixed(2)}ms`);
    
    return { sentCount, totalClients: this.clients.size, duration };
  }

  sendToUser(userId: number, notification: Notification) {
    let sentCount = 0;
    
    this.clients.forEach((client, clientId) => {
      if (client.userId === userId && client.socket.readyState === WebSocket.OPEN) {
        this.sendToClient(clientId, notification);
        sentCount++;
      }
    });

    return { sentCount };
  }

  sendToEvent(eventId: number, notification: Notification) {
    let sentCount = 0;
    
    this.clients.forEach((client, clientId) => {
      if (client.eventId === eventId && client.socket.readyState === WebSocket.OPEN) {
        this.sendToClient(clientId, notification);
        sentCount++;
      }
    });

    return { sentCount };
  }

  sendToChannel(channel: string, notification: Notification) {
    let sentCount = 0;
    
    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel) && client.socket.readyState === WebSocket.OPEN) {
        this.sendToClient(clientId, notification);
        sentCount++;
      }
    });

    return { sentCount };
  }

  private sendToClient(clientId: string, notification: Notification) {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.socket.send(JSON.stringify(notification));
      this.metrics.messagesSent++;
      return true;
    } catch (error) {
      console.error(`❌ Error sending to client ${clientId}:`, error);
      this.metrics.errors++;
      return false;
    }
  }

  private shouldReceiveNotification(client: WebSocketClient, notification: Notification, channel?: string): boolean {
    // Check channel subscription
    if (channel && !client.subscriptions.has(channel)) {
      return false;
    }

    // Check event-specific notifications
    if (notification.eventId && client.eventId !== notification.eventId) {
      return false;
    }

    // Check user-specific notifications
    if (notification.userId && client.userId !== notification.userId) {
      return false;
    }

    return true;
  }

  // Utility methods
  getMetrics() {
    return {
      ...this.metrics,
      activeConnections: this.clients.size,
      clientDetails: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        userId: client.userId,
        eventId: client.eventId,
        subscriptions: Array.from(client.subscriptions),
        connectedAt: client.metadata.connectedAt,
        lastPing: client.lastPing
      }))
    };
  }

  getClientCount(): number {
    return this.clients.size;
  }

  close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.clients.forEach(client => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.close(1001, 'Server shutting down');
      }
    });
    
    this.wss.close();
    console.log('🔌 WebSocket notification server closed');
  }
}
