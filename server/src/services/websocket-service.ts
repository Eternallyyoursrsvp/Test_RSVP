/**
 * Enhanced WebSocket Service
 * 
 * Advanced WebSocket implementation with:
 * - Room-based messaging
 * - Message queue and reliability
 * - Connection management and heartbeat
 * - Rate limiting and security
 * - Event-driven architecture
 * - Real-time notifications and updates
 */

import WebSocket, { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { Server as HTTPServer } from 'http';
import { IncomingMessage } from 'http';
import { parse as parseUrl } from 'url';
import { parse as parseQuery } from 'querystring';

export interface WebSocketConfig {
  // Server configuration
  path: string;
  port?: number;
  heartbeatInterval: number; // milliseconds
  clientTimeout: number; // milliseconds
  
  // Security settings
  enableAuth: boolean;
  maxConnections: number;
  rateLimiting: {
    enabled: boolean;
    maxMessages: number;
    windowMs: number;
  };
  
  // Message settings
  maxMessageSize: number; // bytes
  enableCompression: boolean;
  enableQueuing: boolean;
  queueMaxSize: number;
  
  // Features
  enableRooms: boolean;
  enablePresence: boolean;
  enableReconnection: boolean;
}

export interface WSMessage {
  id: string;
  type: string;
  event: string;
  data: unknown;
  timestamp: number;
  userId?: string;
  room?: string;
  reliable?: boolean;
}

export interface WSClient {
  id: string;
  userId?: string;
  socket: WebSocket;
  isAlive: boolean;
  lastPing: number;
  joinedRooms: Set<string>;
  messageQueue: WSMessage[];
  rateLimitCount: number;
  rateLimitReset: number;
  connectionTime: number;
  lastActivity: number;
  metadata: Record<string, unknown>;
}

export interface WSRoom {
  id: string;
  name: string;
  clients: Set<string>;
  metadata: Record<string, unknown>;
  isPrivate: boolean;
  maxClients?: number;
  createdAt: number;
  lastActivity: number;
}

export interface WSStats {
  connections: {
    total: number;
    active: number;
    authenticated: number;
  };
  rooms: {
    total: number;
    totalClients: number;
  };
  messages: {
    sent: number;
    received: number;
    queued: number;
    dropped: number;
  };
  performance: {
    avgLatency: number;
    messageRate: number;
    errorRate: number;
  };
  uptime: number;
}

export class EnhancedWebSocketService extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, WSClient>();
  private rooms = new Map<string, WSRoom>();
  private config: WebSocketConfig;
  private httpServer: HTTPServer;
  private isStarted = false;
  
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private stats: WSStats = {
    connections: { total: 0, active: 0, authenticated: 0 },
    rooms: { total: 0, totalClients: 0 },
    messages: { sent: 0, received: 0, queued: 0, dropped: 0 },
    performance: { avgLatency: 0, messageRate: 0, errorRate: 0 },
    uptime: 0
  };
  
  private startTime = Date.now();

  constructor(httpServer: HTTPServer, config: Partial<WebSocketConfig> = {}) {
    super();
    
    this.httpServer = httpServer;
    this.config = {
      path: '/ws',
      heartbeatInterval: 30000,
      clientTimeout: 60000,
      enableAuth: true,
      maxConnections: 1000,
      rateLimiting: {
        enabled: true,
        maxMessages: 100,
        windowMs: 60000
      },
      maxMessageSize: 64 * 1024, // 64KB
      enableCompression: true,
      enableQueuing: true,
      queueMaxSize: 100,
      enableRooms: true,
      enablePresence: true,
      enableReconnection: true,
      ...config
    };
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    console.log('🚀 Starting Enhanced WebSocket Service...');

    try {
      // Create WebSocket server
      this.wss = new WebSocketServer({
        server: this.httpServer,
        path: this.config.path,
        perMessageDeflate: this.config.enableCompression,
        maxPayload: this.config.maxMessageSize,
        clientTracking: true
      });

      // Set up event handlers
      this.setupEventHandlers();
      
      // Start background tasks
      this.startHeartbeat();
      this.startCleanupTask();
      
      this.isStarted = true;
      this.emit('started');
      
      console.log(`✅ WebSocket service started on ${this.config.path}`);
      console.log(`   - Max connections: ${this.config.maxConnections}`);
      console.log(`   - Heartbeat interval: ${this.config.heartbeatInterval}ms`);
      console.log(`   - Authentication: ${this.config.enableAuth ? 'enabled' : 'disabled'}`);
      console.log(`   - Rooms: ${this.config.enableRooms ? 'enabled' : 'disabled'}`);
      
    } catch (error) {
      console.error('❌ Failed to start WebSocket service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    console.log('🔄 Stopping WebSocket service...');

    // Stop background tasks
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      this.closeClient(client.id, 1001, 'Server shutting down');
    }

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    this.rooms.clear();
    this.isStarted = false;
    this.emit('stopped');
    
    console.log('✅ WebSocket service stopped');
  }

  // Connection management
  private setupEventHandlers(): void {
    if (!this.wss) return;

    this.wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
      this.handleConnection(socket, request);
    });

    this.wss.on('error', (error: Error) => {
      console.error('WebSocket server error:', error);
      this.emit('error', error);
    });
  }

  private async handleConnection(socket: WebSocket, request: IncomingMessage): Promise<void> {
    // Check connection limits
    if (this.clients.size >= this.config.maxConnections) {
      socket.close(1013, 'Maximum connections exceeded');
      return;
    }

    const clientId = this.generateClientId();
    const parsedUrl = parseUrl(request.url || '', true);
    const query = parsedUrl.query;

    // Extract user ID from query or headers if auth is enabled
    let userId: string | undefined;
    if (this.config.enableAuth) {
      userId = await this.authenticateConnection(request, query);
      if (!userId) {
        socket.close(1008, 'Authentication failed');
        return;
      }
    }

    // Create client
    const client: WSClient = {
      id: clientId,
      userId,
      socket,
      isAlive: true,
      lastPing: Date.now(),
      joinedRooms: new Set(),
      messageQueue: [],
      rateLimitCount: 0,
      rateLimitReset: Date.now() + this.config.rateLimiting.windowMs,
      connectionTime: Date.now(),
      lastActivity: Date.now(),
      metadata: {}
    };

    this.clients.set(clientId, client);
    this.updateConnectionStats();

    // Set up client event handlers
    this.setupClientHandlers(client);

    // Send welcome message
    this.sendToClient(client, {
      id: this.generateMessageId(),
      type: 'system',
      event: 'connected',
      data: {
        clientId,
        timestamp: Date.now(),
        config: {
          heartbeatInterval: this.config.heartbeatInterval,
          enableRooms: this.config.enableRooms
        }
      },
      timestamp: Date.now()
    });

    this.emit('client_connected', { clientId, userId });
    console.log(`👤 Client connected: ${clientId}${userId ? ` (user: ${userId})` : ''}`);
  }

  private setupClientHandlers(client: WSClient): void {
    const { socket } = client;

    socket.on('message', (data) => {
      this.handleMessage(client, data);
    });

    socket.on('pong', () => {
      client.isAlive = true;
      client.lastPing = Date.now();
    });

    socket.on('close', (code, reason) => {
      this.handleDisconnection(client, code, reason.toString());
    });

    socket.on('error', (error) => {
      console.error(`Client ${client.id} error:`, error);
      this.handleDisconnection(client, 1006, 'Socket error');
    });
  }

  private async handleMessage(client: WSClient, data: WebSocket.Data): Promise<void> {
    try {
      // Rate limiting check
      if (this.config.rateLimiting.enabled && !this.checkRateLimit(client)) {
        this.sendError(client, 'Rate limit exceeded');
        return;
      }

      // Parse message
      const messageStr = data.toString();
      const message: WSMessage = JSON.parse(messageStr);

      // Update activity
      client.lastActivity = Date.now();
      this.stats.messages.received++;

      // Validate message
      if (!this.validateMessage(message)) {
        this.sendError(client, 'Invalid message format');
        return;
      }

      // Handle different message types
      await this.processMessage(client, message);

    } catch (error) {
      console.error(`Error handling message from ${client.id}:`, error);
      this.sendError(client, 'Message processing failed');
      this.stats.performance.errorRate++;
    }
  }

  private async processMessage(client: WSClient, message: WSMessage): Promise<void> {
    switch (message.type) {
      case 'ping':
        this.sendToClient(client, {
          id: this.generateMessageId(),
          type: 'pong',
          event: 'pong',
          data: { timestamp: Date.now() },
          timestamp: Date.now()
        });
        break;

      case 'join_room':
        if (this.config.enableRooms) {
          await this.handleJoinRoom(client, message);
        }
        break;

      case 'leave_room':
        if (this.config.enableRooms) {
          await this.handleLeaveRoom(client, message);
        }
        break;

      case 'room_message':
        if (this.config.enableRooms) {
          await this.handleRoomMessage(client, message);
        }
        break;

      case 'broadcast':
        await this.handleBroadcast(client, message);
        break;

      case 'direct':
        await this.handleDirectMessage(client, message);
        break;

      case 'presence':
        if (this.config.enablePresence) {
          await this.handlePresence(client, message);
        }
        break;

      default:
        // Custom message types - emit event for handling by application
        this.emit('message', { client, message });
        break;
    }
  }

  private handleDisconnection(client: WSClient, code: number, reason: string): void {
    // Leave all rooms
    for (const roomId of client.joinedRooms) {
      this.leaveRoom(client.id, roomId);
    }

    // Remove client
    this.clients.delete(client.id);
    this.updateConnectionStats();

    this.emit('client_disconnected', { 
      clientId: client.id, 
      userId: client.userId, 
      code, 
      reason 
    });
    
    console.log(`👤 Client disconnected: ${client.id} (code: ${code}, reason: ${reason})`);
  }

  // Room management
  private async handleJoinRoom(client: WSClient, message: WSMessage): Promise<void> {
    const { roomId } = message.data as { roomId: string };
    
    if (!roomId) {
      this.sendError(client, 'Room ID required');
      return;
    }

    const success = this.joinRoom(client.id, roomId);
    
    this.sendToClient(client, {
      id: this.generateMessageId(),
      type: 'room_joined',
      event: 'room_joined',
      data: { roomId, success },
      timestamp: Date.now()
    });

    if (success) {
      // Notify other room members
      this.broadcastToRoom(roomId, {
        id: this.generateMessageId(),
        type: 'room_member_joined',
        event: 'member_joined',
        data: { 
          roomId, 
          clientId: client.id, 
          userId: client.userId 
        },
        timestamp: Date.now()
      }, client.id);
    }
  }

  private async handleLeaveRoom(client: WSClient, message: WSMessage): Promise<void> {
    const { roomId } = message.data as { roomId: string };
    
    if (!roomId) {
      this.sendError(client, 'Room ID required');
      return;
    }

    const success = this.leaveRoom(client.id, roomId);
    
    this.sendToClient(client, {
      id: this.generateMessageId(),
      type: 'room_left',
      event: 'room_left',
      data: { roomId, success },
      timestamp: Date.now()
    });

    if (success) {
      // Notify other room members
      this.broadcastToRoom(roomId, {
        id: this.generateMessageId(),
        type: 'room_member_left',
        event: 'member_left',
        data: { 
          roomId, 
          clientId: client.id, 
          userId: client.userId 
        },
        timestamp: Date.now()
      });
    }
  }

  private async handleRoomMessage(client: WSClient, message: WSMessage): Promise<void> {
    const { roomId, content } = message.data as { roomId: string; content: unknown };
    
    if (!roomId) {
      this.sendError(client, 'Room ID required');
      return;
    }

    if (!client.joinedRooms.has(roomId)) {
      this.sendError(client, 'Not a member of this room');
      return;
    }

    const roomMessage: WSMessage = {
      id: this.generateMessageId(),
      type: 'room_message',
      event: 'room_message',
      data: {
        roomId,
        content,
        from: {
          clientId: client.id,
          userId: client.userId
        }
      },
      timestamp: Date.now()
    };

    this.broadcastToRoom(roomId, roomMessage, client.id);
  }

  private async handleDirectMessage(client: WSClient, message: WSMessage): Promise<void> {
    const { targetUserId, content } = message.data as { targetUserId: string; content: unknown };
    
    if (!targetUserId) {
      this.sendError(client, 'Target user ID required');
      return;
    }

    const targetClients = Array.from(this.clients.values())
      .filter(c => c.userId === targetUserId);

    if (targetClients.length === 0) {
      this.sendError(client, 'Target user not found');
      return;
    }

    const directMessage: WSMessage = {
      id: this.generateMessageId(),
      type: 'direct_message',
      event: 'direct_message',
      data: {
        content,
        from: {
          clientId: client.id,
          userId: client.userId
        }
      },
      timestamp: Date.now()
    };

    // Send to all client sessions of the target user
    for (const targetClient of targetClients) {
      this.sendToClient(targetClient, directMessage);
    }
  }

  private async handleBroadcast(client: WSClient, message: WSMessage): Promise<void> {
    // Only authenticated users can broadcast
    if (!client.userId) {
      this.sendError(client, 'Authentication required for broadcast');
      return;
    }

    const broadcastMessage: WSMessage = {
      id: this.generateMessageId(),
      type: 'broadcast',
      event: 'broadcast',
      data: {
        content: message.data,
        from: {
          clientId: client.id,
          userId: client.userId
        }
      },
      timestamp: Date.now()
    };

    this.broadcast(broadcastMessage, client.id);
  }

  private async handlePresence(client: WSClient, message: WSMessage): Promise<void> {
    const { status, metadata } = message.data as { status: string; metadata?: Record<string, unknown> };
    
    client.metadata = { ...client.metadata, presence: status, ...metadata };
    
    // Broadcast presence update to all rooms the client is in
    for (const roomId of client.joinedRooms) {
      this.broadcastToRoom(roomId, {
        id: this.generateMessageId(),
        type: 'presence_update',
        event: 'presence_update',
        data: {
          roomId,
          clientId: client.id,
          userId: client.userId,
          status,
          metadata
        },
        timestamp: Date.now()
      }, client.id);
    }
  }

  // Room operations
  joinRoom(clientId: string, roomId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    // Get or create room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        name: roomId,
        clients: new Set(),
        metadata: {},
        isPrivate: false,
        createdAt: Date.now(),
        lastActivity: Date.now()
      };
      this.rooms.set(roomId, room);
      this.updateRoomStats();
    }

    // Check room capacity
    if (room.maxClients && room.clients.size >= room.maxClients) {
      return false;
    }

    // Add client to room
    room.clients.add(clientId);
    client.joinedRooms.add(roomId);
    room.lastActivity = Date.now();
    this.updateRoomStats();

    return true;
  }

  leaveRoom(clientId: string, roomId: string): boolean {
    const client = this.clients.get(clientId);
    const room = this.rooms.get(roomId);
    
    if (!client || !room) return false;

    // Remove client from room
    room.clients.delete(clientId);
    client.joinedRooms.delete(roomId);

    // Delete room if empty
    if (room.clients.size === 0) {
      this.rooms.delete(roomId);
    } else {
      room.lastActivity = Date.now();
    }
    
    this.updateRoomStats();
    return true;
  }

  // Messaging operations
  sendToClient(client: WSClient, message: WSMessage): boolean {
    if (client.socket.readyState !== WebSocket.OPEN) {
      if (this.config.enableQueuing && client.messageQueue.length < this.config.queueMaxSize) {
        client.messageQueue.push(message);
        this.stats.messages.queued++;
      } else {
        this.stats.messages.dropped++;
      }
      return false;
    }

    try {
      client.socket.send(JSON.stringify(message));
      this.stats.messages.sent++;
      return true;
    } catch (error) {
      console.error(`Error sending message to ${client.id}:`, error);
      this.stats.messages.dropped++;
      return false;
    }
  }

  broadcastToRoom(roomId: string, message: WSMessage, excludeClientId?: string): number {
    const room = this.rooms.get(roomId);
    if (!room) return 0;

    let sent = 0;
    for (const clientId of room.clients) {
      if (excludeClientId && clientId === excludeClientId) continue;
      
      const client = this.clients.get(clientId);
      if (client && this.sendToClient(client, message)) {
        sent++;
      }
    }

    room.lastActivity = Date.now();
    return sent;
  }

  broadcast(message: WSMessage, excludeClientId?: string): number {
    let sent = 0;
    for (const client of this.clients.values()) {
      if (excludeClientId && client.id === excludeClientId) continue;
      
      if (this.sendToClient(client, message)) {
        sent++;
      }
    }
    return sent;
  }

  // Public API methods
  async sendNotification(userId: string, notification: { title: string; message: string; type: string; data?: unknown }): Promise<number> {
    const message: WSMessage = {
      id: this.generateMessageId(),
      type: 'notification',
      event: 'notification',
      data: notification,
      timestamp: Date.now()
    };

    const clients = Array.from(this.clients.values()).filter(c => c.userId === userId);
    let sent = 0;
    
    for (const client of clients) {
      if (this.sendToClient(client, message)) {
        sent++;
      }
    }

    return sent;
  }

  async sendRoomNotification(roomId: string, notification: { title: string; message: string; type: string; data?: unknown }): Promise<number> {
    const message: WSMessage = {
      id: this.generateMessageId(),
      type: 'room_notification',
      event: 'room_notification',
      data: { roomId, ...notification },
      timestamp: Date.now()
    };

    return this.broadcastToRoom(roomId, message);
  }

  closeClient(clientId: string, code = 1000, reason = 'Closed by server'): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    client.socket.close(code, reason);
    return true;
  }

  // Utility methods
  private async authenticateConnection(request: IncomingMessage, query: any): Promise<string | undefined> {
    // Extract token from query params or headers
    const token = query.token || request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) return undefined;

    try {
      // Here you would validate the token and extract user ID
      // For now, we'll just return the token as user ID
      // In production, you'd integrate with your auth service
      return token as string;
    } catch (error) {
      return undefined;
    }
  }

  private checkRateLimit(client: WSClient): boolean {
    const now = Date.now();
    
    if (now > client.rateLimitReset) {
      client.rateLimitCount = 0;
      client.rateLimitReset = now + this.config.rateLimiting.windowMs;
    }

    client.rateLimitCount++;
    return client.rateLimitCount <= this.config.rateLimiting.maxMessages;
  }

  private validateMessage(message: any): message is WSMessage {
    return message && 
           typeof message.type === 'string' && 
           typeof message.event === 'string' &&
           message.data !== undefined;
  }

  private sendError(client: WSClient, error: string): void {
    this.sendToClient(client, {
      id: this.generateMessageId(),
      type: 'error',
      event: 'error',
      data: { error },
      timestamp: Date.now()
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;

      for (const client of this.clients.values()) {
        if (!client.isAlive) {
          this.handleDisconnection(client, 1006, 'Heartbeat timeout');
          continue;
        }

        client.isAlive = false;
        client.socket.ping();
      }
    }, this.config.heartbeatInterval);
  }

  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      // Process message queues for reconnected clients
      for (const client of this.clients.values()) {
        if (client.socket.readyState === WebSocket.OPEN && client.messageQueue.length > 0) {
          const queue = [...client.messageQueue];
          client.messageQueue = [];
          
          for (const message of queue) {
            this.sendToClient(client, message);
          }
        }
      }
      
      // Clean up empty rooms
      for (const [roomId, room] of this.rooms.entries()) {
        if (room.clients.size === 0 && Date.now() - room.lastActivity > 300000) { // 5 minutes
          this.rooms.delete(roomId);
        }
      }
      
      this.updateRoomStats();
    }, 60000); // Run every minute
  }

  private updateConnectionStats(): void {
    this.stats.connections.total = this.clients.size;
    this.stats.connections.active = Array.from(this.clients.values())
      .filter(c => c.socket.readyState === WebSocket.OPEN).length;
    this.stats.connections.authenticated = Array.from(this.clients.values())
      .filter(c => c.userId).length;
  }

  private updateRoomStats(): void {
    this.stats.rooms.total = this.rooms.size;
    this.stats.rooms.totalClients = Array.from(this.rooms.values())
      .reduce((sum, room) => sum + room.clients.size, 0);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API
  getStats(): WSStats {
    this.stats.uptime = Date.now() - this.startTime;
    return { ...this.stats };
  }

  getClients(): WSClient[] {
    return Array.from(this.clients.values());
  }

  getRooms(): WSRoom[] {
    return Array.from(this.rooms.values());
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  isClientConnected(clientId: string): boolean {
    const client = this.clients.get(clientId);
    return client ? client.socket.readyState === WebSocket.OPEN : false;
  }

  getClientsByUserId(userId: string): WSClient[] {
    return Array.from(this.clients.values()).filter(c => c.userId === userId);
  }

  getRoomClients(roomId: string): WSClient[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    
    return Array.from(room.clients)
      .map(clientId => this.clients.get(clientId))
      .filter(Boolean) as WSClient[];
  }
}