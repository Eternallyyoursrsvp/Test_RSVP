import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import WebSocket from 'ws';

// Notification System Integration Tests for Ver4 Implementation
describe('Notification System Integration', () => {
  let startTime: number;
  let mockEventId: string;
  let mockGuestId: string;
  let testWebSocket: WebSocket;

  beforeEach(async () => {
    startTime = performance.now();
    mockEventId = 'test-event-notifications';
    mockGuestId = 'test-guest-notifications';
  });

  afterEach(async () => {
    if (testWebSocket && testWebSocket.readyState === WebSocket.OPEN) {
      testWebSocket.close();
    }
    const duration = performance.now() - startTime;
    console.log(`Test completed in ${duration.toFixed(2)}ms`);
  });

  test('WebSocket connection establishes and maintains real-time communication', async () => {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      testWebSocket = new WebSocket('ws://localhost:5000/ws/notifications');

      testWebSocket.on('open', () => {
        clearTimeout(timeout);
        expect(testWebSocket.readyState).toBe(WebSocket.OPEN);
        
        // Send ping to test communication
        testWebSocket.send(JSON.stringify({
          type: 'PING',
          timestamp: Date.now()
        }));
      });

      testWebSocket.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'PONG') {
          const latency = Date.now() - message.originalTimestamp;
          
          // Ver4 requirement: <100ms real-time latency
          expect(latency).toBeLessThan(100);
          resolve();
        }
      });

      testWebSocket.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  });

  test('RSVP submission triggers real-time notifications', async () => {
    // Set up WebSocket listener for notifications
    const notificationPromise = new Promise<any>((resolve) => {
      testWebSocket = new WebSocket('ws://localhost:5000/ws/notifications');
      
      testWebSocket.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'RSVP_NOTIFICATION') {
          resolve(message);
        }
      });
    });

    // Wait for WebSocket connection
    await new Promise(resolve => setTimeout(resolve, 500));

    // Submit RSVP
    const rsvpData = {
      guestId: mockGuestId,
      eventId: mockEventId,
      status: 'confirmed',
      submittedAt: new Date().toISOString()
    };

    const rsvpResponse = await fetch('/api/rsvp/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rsvpData)
    });

    expect(rsvpResponse.status).toBe(200);

    // Wait for real-time notification
    const notification = await notificationPromise;

    expect(notification).toBeDefined();
    expect(notification.type).toBe('RSVP_NOTIFICATION');
    expect(notification.data.guestId).toBe(mockGuestId);
    expect(notification.data.status).toBe('confirmed');
  });

  test('Multi-channel notification delivery (email, SMS, WebSocket)', async () => {
    const notificationData = {
      type: 'ACCOMMODATION_CONFIRMED',
      recipientId: mockGuestId,
      channels: ['email', 'sms', 'websocket'],
      data: {
        roomNumber: '205',
        checkInDate: '2024-06-15',
        checkOutDate: '2024-06-17'
      }
    };

    // Send notification through all channels
    const notificationResponse = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationData)
    });

    expect(notificationResponse.status).toBe(200);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify notification was logged for all channels
    const logsResponse = await fetch(`/api/notifications/logs/${mockGuestId}`);
    const logs = await logsResponse.json();

    const emailLog = logs.find((log: any) => 
      log.channel === 'email' && log.type === 'ACCOMMODATION_CONFIRMED'
    );
    const smsLog = logs.find((log: any) => 
      log.channel === 'sms' && log.type === 'ACCOMMODATION_CONFIRMED'
    );
    const websocketLog = logs.find((log: any) => 
      log.channel === 'websocket' && log.type === 'ACCOMMODATION_CONFIRMED'
    );

    expect(emailLog).toBeDefined();
    expect(emailLog.status).toBe('sent');
    expect(smsLog).toBeDefined();
    expect(smsLog.status).toBe('sent');
    expect(websocketLog).toBeDefined();
    expect(websocketLog.status).toBe('delivered');

    // Verify delivery timestamps are within reasonable range
    const deliveryTimes = [emailLog.deliveredAt, smsLog.deliveredAt, websocketLog.deliveredAt]
      .map(time => new Date(time).getTime());
    
    const maxDeliveryTime = Math.max(...deliveryTimes);
    const minDeliveryTime = Math.min(...deliveryTimes);
    
    // All channels should deliver within 5 seconds of each other
    expect(maxDeliveryTime - minDeliveryTime).toBeLessThan(5000);
  });

  test('Notification templating and variable substitution', async () => {
    const templateData = {
      type: 'TRANSPORT_ASSIGNED',
      recipientId: mockGuestId,
      template: 'transport_confirmation',
      variables: {
        guestName: 'John Doe',
        vehicleType: 'Luxury Bus',
        pickupTime: '2:30 PM',
        pickupLocation: 'Airport Terminal 1',
        driverName: 'Mike Johnson',
        driverPhone: '+1-555-0199'
      }
    };

    const notificationResponse = await fetch('/api/notifications/send-templated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templateData)
    });

    expect(notificationResponse.status).toBe(200);

    // Wait for template processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify template was processed correctly
    const processedResponse = await fetch(`/api/notifications/processed/${mockGuestId}/latest`);
    const processedNotification = await processedResponse.json();

    expect(processedNotification).toBeDefined();
    expect(processedNotification.type).toBe('TRANSPORT_ASSIGNED');
    
    // Verify variable substitution occurred
    expect(processedNotification.content.subject).toContain('John Doe');
    expect(processedNotification.content.body).toContain('Luxury Bus');
    expect(processedNotification.content.body).toContain('2:30 PM');
    expect(processedNotification.content.body).toContain('Airport Terminal 1');
    expect(processedNotification.content.body).toContain('Mike Johnson');
    expect(processedNotification.content.body).toContain('+1-555-0199');

    // Verify no template variables remain unsubstituted
    expect(processedNotification.content.body).not.toContain('{{');
    expect(processedNotification.content.body).not.toContain('}}');
  });

  test('Notification preferences and filtering', async () => {
    // Set guest notification preferences
    const preferencesData = {
      email: true,
      sms: false,
      push: true,
      frequency: 'immediate',
      categories: {
        rsvp: true,
        accommodation: true,
        transport: false,
        general: true
      }
    };

    const preferencesResponse = await fetch(`/api/guests/${mockGuestId}/notification-preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferencesData)
    });

    expect(preferencesResponse.status).toBe(200);

    // Send notifications of different categories
    const notifications = [
      {
        type: 'RSVP_REMINDER',
        category: 'rsvp',
        recipientId: mockGuestId,
        channels: ['email', 'sms', 'push']
      },
      {
        type: 'TRANSPORT_UPDATE',
        category: 'transport',
        recipientId: mockGuestId,
        channels: ['email', 'sms', 'push']
      },
      {
        type: 'ACCOMMODATION_READY',
        category: 'accommodation',
        recipientId: mockGuestId,
        channels: ['email', 'sms', 'push']
      }
    ];

    // Send all notifications
    for (const notification of notifications) {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });
    }

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify filtering based on preferences
    const deliveryLogsResponse = await fetch(`/api/notifications/logs/${mockGuestId}`);
    const deliveryLogs = await deliveryLogsResponse.json();

    // RSVP notification should be sent (email and push only, SMS filtered)
    const rsvpLogs = deliveryLogs.filter((log: any) => log.type === 'RSVP_REMINDER');
    expect(rsvpLogs.length).toBe(2); // email and push only
    expect(rsvpLogs.some((log: any) => log.channel === 'email')).toBe(true);
    expect(rsvpLogs.some((log: any) => log.channel === 'push')).toBe(true);
    expect(rsvpLogs.some((log: any) => log.channel === 'sms')).toBe(false);

    // Transport notification should be blocked entirely
    const transportLogs = deliveryLogs.filter((log: any) => log.type === 'TRANSPORT_UPDATE');
    expect(transportLogs.length).toBe(0);

    // Accommodation notification should be sent (email and push only)
    const accommodationLogs = deliveryLogs.filter((log: any) => log.type === 'ACCOMMODATION_READY');
    expect(accommodationLogs.length).toBe(2);
    expect(accommodationLogs.some((log: any) => log.channel === 'email')).toBe(true);
    expect(accommodationLogs.some((log: any) => log.channel === 'push')).toBe(true);
  });

  test('Notification retry and failure handling', async () => {
    // Mock a failing notification service
    const failingNotification = {
      type: 'TEST_FAILURE',
      recipientId: mockGuestId,
      channels: ['email'],
      forceFailure: true // Test flag to simulate failure
    };

    const notificationResponse = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(failingNotification)
    });

    expect(notificationResponse.status).toBe(200); // Initial acceptance

    // Wait for retry attempts
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify retry attempts were made
    const retryLogsResponse = await fetch(`/api/notifications/retry-logs/${mockGuestId}`);
    const retryLogs = await retryLogsResponse.json();

    const failureAttempts = retryLogs.filter((log: any) => 
      log.type === 'TEST_FAILURE' && log.status === 'failed'
    );

    // Should have initial attempt + 3 retries = 4 total attempts
    expect(failureAttempts.length).toBe(4);

    // Verify exponential backoff was applied
    const retryDelays = [];
    for (let i = 1; i < failureAttempts.length; i++) {
      const previousAttempt = new Date(failureAttempts[i-1].attemptedAt).getTime();
      const currentAttempt = new Date(failureAttempts[i].attemptedAt).getTime();
      retryDelays.push(currentAttempt - previousAttempt);
    }

    // Each retry should have increasing delays (exponential backoff)
    expect(retryDelays[1]).toBeGreaterThan(retryDelays[0]);
    expect(retryDelays[2]).toBeGreaterThan(retryDelays[1]);

    // Final status should be 'failed'
    const finalStatus = failureAttempts[failureAttempts.length - 1];
    expect(finalStatus.status).toBe('failed');
    expect(finalStatus.finalFailure).toBe(true);
  });

  test('Notification analytics and metrics collection', async () => {
    // Send a batch of notifications for analytics
    const testNotifications = [
      { type: 'RSVP_CONFIRMATION', channel: 'email', recipientId: 'guest-1' },
      { type: 'RSVP_CONFIRMATION', channel: 'sms', recipientId: 'guest-2' },
      { type: 'TRANSPORT_UPDATE', channel: 'email', recipientId: 'guest-3' },
      { type: 'TRANSPORT_UPDATE', channel: 'push', recipientId: 'guest-4' },
      { type: 'ACCOMMODATION_READY', channel: 'email', recipientId: 'guest-5' }
    ];

    // Send all notifications
    for (const notification of testNotifications) {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });
    }

    // Wait for processing and analytics calculation
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get notification analytics
    const analyticsResponse = await fetch(`/api/notifications/analytics/${mockEventId}`);
    const analytics = await analyticsResponse.json();

    expect(analytics).toBeDefined();

    // Verify metrics structure
    expect(analytics.totalNotifications).toBeGreaterThanOrEqual(5);
    expect(analytics.byChannel).toBeDefined();
    expect(analytics.byType).toBeDefined();
    expect(analytics.deliveryRate).toBeDefined();
    expect(analytics.avgDeliveryTime).toBeDefined();

    // Verify channel breakdown
    expect(analytics.byChannel.email).toBeGreaterThanOrEqual(3);
    expect(analytics.byChannel.sms).toBeGreaterThanOrEqual(1);
    expect(analytics.byChannel.push).toBeGreaterThanOrEqual(1);

    // Verify type breakdown
    expect(analytics.byType.RSVP_CONFIRMATION).toBeGreaterThanOrEqual(2);
    expect(analytics.byType.TRANSPORT_UPDATE).toBeGreaterThanOrEqual(2);
    expect(analytics.byType.ACCOMMODATION_READY).toBeGreaterThanOrEqual(1);

    // Verify delivery metrics
    expect(analytics.deliveryRate).toBeGreaterThan(0);
    expect(analytics.deliveryRate).toBeLessThanOrEqual(1);
    expect(analytics.avgDeliveryTime).toBeGreaterThan(0);

    // Verify performance metrics
    expect(analytics.performance.avgDeliveryTime).toBeLessThan(5000); // <5s average
    expect(analytics.performance.successRate).toBeGreaterThan(0.95); // >95% success rate
  });

  test('Real-time notification broadcasting to multiple clients', async () => {
    const clients: WebSocket[] = [];
    const receivedMessages: any[][] = [[], [], []];

    // Create multiple WebSocket clients
    for (let i = 0; i < 3; i++) {
      const client = new WebSocket('ws://localhost:5000/ws/notifications');
      clients.push(client);

      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        receivedMessages[i].push(message);
      });
    }

    // Wait for all connections to establish
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Broadcast a notification
    const broadcastData = {
      type: 'SYSTEM_ANNOUNCEMENT',
      broadcast: true,
      data: {
        message: 'Wedding ceremony starting in 30 minutes',
        timestamp: new Date().toISOString()
      }
    };

    const broadcastResponse = await fetch('/api/notifications/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(broadcastData)
    });

    expect(broadcastResponse.status).toBe(200);

    // Wait for message delivery
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify all clients received the broadcast
    for (let i = 0; i < 3; i++) {
      const systemMessages = receivedMessages[i].filter(msg => 
        msg.type === 'SYSTEM_ANNOUNCEMENT'
      );
      expect(systemMessages.length).toBe(1);
      expect(systemMessages[0].data.message).toBe('Wedding ceremony starting in 30 minutes');
    }

    // Clean up WebSocket connections
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
  });

  test('Notification system performance under load', async () => {
    const startTime = performance.now();
    const notificationCount = 50;
    const promises: Promise<Response>[] = [];

    // Send many notifications concurrently
    for (let i = 0; i < notificationCount; i++) {
      const notification = {
        type: 'LOAD_TEST',
        recipientId: `load-test-guest-${i}`,
        channels: ['email'],
        data: {
          testId: i,
          timestamp: Date.now()
        }
      };

      const promise = fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });

      promises.push(promise);
    }

    // Wait for all notifications to be accepted
    const responses = await Promise.all(promises);
    const acceptanceTime = performance.now() - startTime;

    // Verify all were accepted
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // Ver4 requirement: System should handle load efficiently
    expect(acceptanceTime).toBeLessThan(5000); // <5s to accept 50 notifications

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Verify delivery rate
    const deliveryStatsResponse = await fetch('/api/notifications/delivery-stats/load-test');
    const deliveryStats = await deliveryStatsResponse.json();

    expect(deliveryStats.totalSent).toBe(notificationCount);
    expect(deliveryStats.deliveryRate).toBeGreaterThan(0.95); // >95% delivery rate
    expect(deliveryStats.avgDeliveryTime).toBeLessThan(3000); // <3s average delivery time
  });
});