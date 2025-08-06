import express, { Router } from 'express';
import { ModuleService } from '../core/module-service';
import { ValidationMiddleware } from '../core/validation';
import { isAuthenticated, isAdmin } from '../../middleware';
import { NotificationWebSocketServer, Notification } from '../../services/notification-websocket';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const notificationSchema = z.object({
  type: z.string(),
  title: z.string(),
  message: z.string(),
  eventId: z.number().optional(),
  userId: z.number().optional(),
  data: z.any().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  channel: z.string().optional()
});

const subscriptionSchema = z.object({
  channels: z.array(z.string()),
  eventId: z.number().optional(),
  userId: z.number().optional()
});

let notificationServer: NotificationWebSocketServer | null = null;

export function setNotificationServer(server: NotificationWebSocketServer) {
  notificationServer = server;
}

export async function createNotificationAPI(): Promise<Router> {
  const router = express.Router();
  const service = new ModuleService('notifications');
  const validator = new ValidationMiddleware('notifications');

  router.use(service.middleware);

  // Send notification (admin only)
  router.post('/send', 
    isAuthenticated, 
    isAdmin, 
    validator.validate(notificationSchema), 
    async (req, res) => {
      try {
        if (!notificationServer) {
          return res.status(503).json({ message: 'Notification server not available' });
        }

        const notificationData = req.validatedBody;
        const notification: Notification = {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          ...notificationData
        };

        let result;
        if (notificationData.channel) {
          result = notificationServer.sendToChannel(notificationData.channel, notification);
        } else if (notificationData.userId) {
          result = notificationServer.sendToUser(notificationData.userId, notification);
        } else if (notificationData.eventId) {
          result = notificationServer.sendToEvent(notificationData.eventId, notification);
        } else {
          result = notificationServer.broadcast(notification);
        }

        res.json({
          message: 'Notification sent',
          notification,
          result
        });
      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // Broadcast to all clients (admin only)
  router.post('/broadcast', 
    isAuthenticated, 
    isAdmin, 
    validator.validate(notificationSchema), 
    async (req, res) => {
      try {
        if (!notificationServer) {
          return res.status(503).json({ message: 'Notification server not available' });
        }

        const notificationData = req.validatedBody;
        const notification: Notification = {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          ...notificationData
        };

        const result = notificationServer.broadcast(notification, notificationData.channel);

        res.json({
          message: 'Broadcast sent',
          notification,
          result
        });
      } catch (error) {
        service.handleError(error, res);
      }
    }
  );

  // Get WebSocket metrics (admin only)
  router.get('/metrics', isAuthenticated, isAdmin, (req, res) => {
    try {
      if (!notificationServer) {
        return res.status(503).json({ message: 'Notification server not available' });
      }

      const metrics = notificationServer.getMetrics();
      res.json(metrics);
    } catch (error) {
      service.handleError(error, res);
    }
  });

  // Test notification endpoint
  router.post('/test', isAuthenticated, async (req, res) => {
    try {
      if (!notificationServer) {
        return res.status(503).json({ message: 'Notification server not available' });
      }

      const userId = (req.user as any).id;
      const testNotification: Notification = {
        id: uuidv4(),
        type: 'TEST_NOTIFICATION',
        title: 'Test Notification',
        message: 'This is a test notification to verify WebSocket connectivity',
        userId,
        timestamp: new Date().toISOString(),
        priority: 'low',
        data: {
          test: true,
          timestamp: Date.now()
        }
      };

      const result = notificationServer.sendToUser(userId, testNotification);

      res.json({
        message: 'Test notification sent',
        notification: testNotification,
        result
      });
    } catch (error) {
      service.handleError(error, res);
    }
  });

  // Get connection status
  router.get('/status', isAuthenticated, (req, res) => {
    try {
      if (!notificationServer) {
        return res.status(503).json({ 
          connected: false,
          message: 'Notification server not available' 
        });
      }

      const clientCount = notificationServer.getClientCount();
      const metrics = notificationServer.getMetrics();

      res.json({
        connected: true,
        clientCount,
        totalConnections: metrics.totalConnections,
        messagesSent: metrics.messagesSent,
        messagesReceived: metrics.messagesReceived,
        errors: metrics.errors
      });
    } catch (error) {
      service.handleError(error, res);
    }
  });

  return router;
}

// Utility functions for other modules to send notifications
export class NotificationService {
  static async trigger(type: string, data: any, options: {
    eventId?: number;
    userId?: number;
    channel?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  } = {}) {
    if (!notificationServer) {
      console.warn('⚠️ Notification server not available for trigger:', type);
      return null;
    }

    const notification: Notification = {
      id: uuidv4(),
      type,
      title: this.getNotificationTitle(type, data),
      message: this.getNotificationMessage(type, data),
      timestamp: new Date().toISOString(),
      priority: options.priority || 'medium',
      eventId: options.eventId,
      userId: options.userId,
      data
    };

    let result;
    if (options.channel) {
      result = notificationServer.sendToChannel(options.channel, notification);
    } else if (options.userId) {
      result = notificationServer.sendToUser(options.userId, notification);
    } else if (options.eventId) {
      result = notificationServer.sendToEvent(options.eventId, notification);
    } else {
      result = notificationServer.broadcast(notification);
    }

    console.log(`📡 Notification triggered: ${type} (sent to ${result.sentCount} clients)`);
    return result;
  }

  private static getNotificationTitle(type: string, data: any): string {
    switch (type) {
      case 'RSVP_RECEIVED':
        return `RSVP Received`;
      case 'GUEST_ADDED':
        return `New Guest Added`;
      case 'ACCOMMODATION_ASSIGNED':
        return `Accommodation Assigned`;
      case 'TRANSPORT_ASSIGNED':
        return `Transport Assigned`;
      case 'FLIGHT_MATCHED':
        return `Flight Information Matched`;
      case 'USER_APPROVED':
        return `User Approved`;
      case 'SYSTEM_UPDATE':
        return `System Update`;
      default:
        return `Notification`;
    }
  }

  private static getNotificationMessage(type: string, data: any): string {
    switch (type) {
      case 'RSVP_RECEIVED':
        return `${data.guestName} has submitted their RSVP with status: ${data.status}`;
      case 'GUEST_ADDED':
        return `${data.guestName} has been added to the guest list`;
      case 'ACCOMMODATION_ASSIGNED':
        return `${data.guestName} has been assigned accommodation at ${data.hotelName}`;
      case 'TRANSPORT_ASSIGNED':
        return `${data.guestName} has been assigned to transport group ${data.groupName}`;
      case 'FLIGHT_MATCHED':
        return `Flight information matched for ${data.guestName}: ${data.flightNumber}`;
      case 'USER_APPROVED':
        return `User ${data.username} has been approved and can now access the system`;
      case 'SYSTEM_UPDATE':
        return data.message || 'System has been updated';
      default:
        return data.message || 'New notification received';
    }
  }
}
