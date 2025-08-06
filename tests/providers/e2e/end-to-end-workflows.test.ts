/**
 * End-to-End Tests for Provider Workflows
 * 
 * Tests complete workflows that span multiple providers, simulating
 * real-world scenarios and user journeys through the RSVP platform.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupProviderTestEnvironment, TEST_CONFIGS, createTestData, createTestFile, waitForAsync } from '../setup/test-environment';

// Import provider management system
import { ProviderManager } from '../../../server/providers/core/provider-manager';
import { EventService } from '../../../server/services/event-service';
import { GuestService } from '../../../server/services/guest-service';
import { EmailService } from '../../../server/services/email-service';
import { FileUploadService } from '../../../server/services/file-upload-service';

// Setup test environment
setupProviderTestEnvironment();

describe('End-to-End Provider Workflows', () => {
  let providerManager: ProviderManager;
  let eventService: EventService;
  let guestService: GuestService;
  let emailService: EmailService;
  let fileUploadService: FileUploadService;

  beforeEach(async () => {
    // Initialize provider manager with test configurations
    providerManager = new ProviderManager();
    await providerManager.initialize({
      database: { type: 'postgresql', config: TEST_CONFIGS.postgresql },
      email: { type: 'sendgrid', config: TEST_CONFIGS.sendgrid },
      storage: { type: 's3', config: TEST_CONFIGS.aws_s3 }
    });

    // Initialize services with provider manager
    eventService = new EventService(providerManager);
    guestService = new GuestService(providerManager);
    emailService = new EmailService(providerManager);
    fileUploadService = new FileUploadService(providerManager);
  });

  afterEach(async () => {
    await providerManager.cleanup();
  });

  describe('Complete Wedding Event Workflow', () => {
    it('should handle full wedding event creation and management', async () => {
      // Step 1: Create wedding event
      const weddingEvent = {
        title: 'Sarah & Mike\'s Wedding',
        description: 'A beautiful celebration of love',
        date: new Date('2024-12-31T18:00:00Z'),
        location: 'Grand Ballroom, Luxury Hotel',
        maxGuests: 150,
        organizerId: 'user-1',
        settings: {
          rsvpDeadline: new Date('2024-11-30T23:59:59Z'),
          allowPlusOnes: true,
          requireMealChoice: true,
          enableTransport: true
        }
      };

      const createdEvent = await eventService.createEvent(weddingEvent);
      expect(createdEvent.id).toBeDefined();
      expect(createdEvent.title).toBe(weddingEvent.title);

      // Step 2: Upload event assets (photos, documents)
      const invitationPdf = createTestFile({
        name: 'wedding-invitation.pdf',
        type: 'application/pdf',
        content: 'Beautiful wedding invitation PDF content'
      });

      const venuePhoto = createTestFile({
        name: 'venue-photo.jpg',
        type: 'image/jpeg',
        content: 'Stunning venue photograph'
      });

      const uploadedInvitation = await fileUploadService.uploadFile(
        `events/${createdEvent.id}/documents/invitation.pdf`,
        invitationPdf,
        { category: 'invitation', public: true }
      );

      const uploadedPhoto = await fileUploadService.uploadFile(
        `events/${createdEvent.id}/photos/venue.jpg`,
        venuePhoto,
        { category: 'photos', public: true }
      );

      expect(uploadedInvitation.success).toBe(true);
      expect(uploadedPhoto.success).toBe(true);

      // Step 3: Import guest list
      const guestList = [
        {
          name: 'John Smith',
          email: 'john@example.com',
          phone: '+1234567890',
          category: 'family',
          allowPlusOnes: 1,
          dietary: 'vegetarian'
        },
        {
          name: 'Emily Johnson',
          email: 'emily@example.com',
          phone: '+1234567891',
          category: 'friends',
          allowPlusOnes: 2,
          dietary: 'none'
        },
        {
          name: 'David Williams',
          email: 'david@example.com',
          phone: '+1234567892',
          category: 'work',
          allowPlusOnes: 0,
          dietary: 'gluten-free'
        }
      ];

      const importedGuests = await guestService.importGuestList(createdEvent.id, guestList);
      expect(importedGuests.success).toBe(true);
      expect(importedGuests.imported).toBe(3);

      // Step 4: Send invitation emails
      const invitationTemplate = {
        subject: 'You\'re Invited: {{eventTitle}}',
        html: `
          <h1>You're Invited!</h1>
          <p>Dear {{guestName}},</p>
          <p>We cordially invite you to {{eventTitle}} on {{eventDate}}.</p>
          <p>Venue: {{eventLocation}}</p>
          <p>Please RSVP by {{rsvpDeadline}}</p>
          <a href="{{rsvpLink}}">RSVP Now</a>
        `,
        attachments: [uploadedInvitation.url]
      };

      const emailResults = await emailService.sendInvitations(
        createdEvent.id,
        invitationTemplate
      );

      expect(emailResults.success).toBe(true);
      expect(emailResults.sent).toBe(3);
      expect(emailResults.failed).toBe(0);

      // Step 5: Simulate guest RSVP responses
      const guests = await guestService.getEventGuests(createdEvent.id);
      
      // John accepts with plus one
      await guestService.updateRSVP(guests[0].id, {
        status: 'confirmed',
        plusOnes: 1,
        dietaryRequirements: 'vegetarian',
        mealChoice: 'vegetarian',
        transportNeeded: true,
        accommodationNeeded: false,
        notes: 'Looking forward to the celebration!'
      });

      // Emily declines
      await guestService.updateRSVP(guests[1].id, {
        status: 'declined',
        notes: 'Sorry, will be traveling that weekend'
      });

      // David accepts without plus one
      await guestService.updateRSVP(guests[2].id, {
        status: 'confirmed',
        plusOnes: 0,
        dietaryRequirements: 'gluten-free',
        mealChoice: 'gluten-free',
        transportNeeded: false,
        accommodationNeeded: true
      });

      // Step 6: Generate event reports
      const rsvpSummary = await eventService.getRSVPSummary(createdEvent.id);
      expect(rsvpSummary.totalInvited).toBe(3);
      expect(rsvpSummary.confirmed).toBe(2);
      expect(rsvpSummary.declined).toBe(1);
      expect(rsvpSummary.pending).toBe(0);
      expect(rsvpSummary.totalAttending).toBe(3); // 2 confirmed + 1 plus one

      // Step 7: Send follow-up communications
      const confirmedGuests = await guestService.getGuestsByStatus(createdEvent.id, 'confirmed');
      
      const reminderTemplate = {
        subject: 'Wedding Reminder: {{eventTitle}}',
        html: `
          <h2>Reminder: {{eventTitle}}</h2>
          <p>Dear {{guestName}},</p>
          <p>This is a friendly reminder about our wedding on {{eventDate}}.</p>
          <p><strong>Details:</strong></p>
          <ul>
            <li>Date: {{eventDate}}</li>
            <li>Time: {{eventTime}}</li>
            <li>Location: {{eventLocation}}</li>
          </ul>
          <p>We can't wait to celebrate with you!</p>
        `
      };

      const reminderResults = await emailService.sendReminderEmails(
        confirmedGuests.map(g => g.id),
        reminderTemplate
      );

      expect(reminderResults.success).toBe(true);
      expect(reminderResults.sent).toBe(2);

      // Step 8: Generate final reports and exports
      const finalReport = await eventService.generateFinalReport(createdEvent.id);
      expect(finalReport.event).toBeDefined();
      expect(finalReport.guestSummary).toBeDefined();
      expect(finalReport.dietary.vegetarian).toBe(1);
      expect(finalReport.dietary['gluten-free']).toBe(1);
      expect(finalReport.transport.required).toBe(1);
      expect(finalReport.accommodation.required).toBe(1);

      // Verify all data persisted correctly across providers
      const persistedEvent = await eventService.getEvent(createdEvent.id);
      expect(persistedEvent.title).toBe(weddingEvent.title);
      
      const persistedGuests = await guestService.getEventGuests(createdEvent.id);
      expect(persistedGuests.length).toBe(3);
      
      const uploadedFiles = await fileUploadService.getEventFiles(createdEvent.id);
      expect(uploadedFiles.length).toBe(2);
    });

    it('should handle provider failover during critical operations', async () => {
      // Create event with primary providers
      const event = await eventService.createEvent({
        title: 'Failover Test Wedding',
        date: new Date('2024-12-25'),
        location: 'Test Venue'
      });

      // Simulate database provider failure during guest import
      const originalDbProvider = providerManager.getProvider('database');
      vi.spyOn(originalDbProvider, 'create').mockRejectedValueOnce(
        new Error('Database connection lost')
      );

      // Configure failover to SQLite
      await providerManager.configureFailover('database', 'sqlite', TEST_CONFIGS.sqlite);

      // Import guests should succeed with failover
      const guestList = [
        { name: 'Test Guest', email: 'test@example.com' }
      ];

      const importResult = await guestService.importGuestList(event.id, guestList);
      expect(importResult.success).toBe(true);
      expect(importResult.failoverUsed).toBe(true);

      // Verify guest was created in failover database
      const guests = await guestService.getEventGuests(event.id);
      expect(guests.length).toBe(1);
      expect(guests[0].name).toBe('Test Guest');
    });

    it('should maintain data consistency across provider switches', async () => {
      // Start with SQLite providers
      await providerManager.switchProvider('database', 'sqlite', TEST_CONFIGS.sqlite);
      
      // Create event and guests in SQLite
      const event = await eventService.createEvent({
        title: 'Provider Switch Test',
        date: new Date('2024-12-20'),
        location: 'Switch Test Venue'
      });

      const guests = await guestService.importGuestList(event.id, [
        { name: 'Guest 1', email: 'guest1@example.com' },
        { name: 'Guest 2', email: 'guest2@example.com' }
      ]);

      expect(guests.imported).toBe(2);

      // Switch to PostgreSQL with data migration
      const switchResult = await providerManager.switchProvider(
        'database', 
        'postgresql', 
        TEST_CONFIGS.postgresql,
        { migrateData: true, validateIntegrity: true }
      );

      expect(switchResult.success).toBe(true);

      // Verify data integrity after switch
      const migratedEvent = await eventService.getEvent(event.id);
      expect(migratedEvent.title).toBe('Provider Switch Test');

      const migratedGuests = await guestService.getEventGuests(event.id);
      expect(migratedGuests.length).toBe(2);
      expect(migratedGuests.map(g => g.name)).toEqual(['Guest 1', 'Guest 2']);

      // Verify new data can be created in PostgreSQL
      const newGuest = await guestService.addGuest(event.id, {
        name: 'New Guest',
        email: 'new@example.com'
      });

      expect(newGuest.id).toBeDefined();
      expect(newGuest.name).toBe('New Guest');
    });
  });

  describe('Multi-Event Management Workflow', () => {
    it('should handle multiple concurrent events', async () => {
      // Create multiple events
      const events = await Promise.all([
        eventService.createEvent({
          title: 'Wedding Event 1',
          date: new Date('2024-12-15'),
          location: 'Venue A'
        }),
        eventService.createEvent({
          title: 'Wedding Event 2',
          date: new Date('2024-12-22'),
          location: 'Venue B'
        }),
        eventService.createEvent({
          title: 'Wedding Event 3',
          date: new Date('2024-12-29'),
          location: 'Venue C'
        })
      ]);

      expect(events.length).toBe(3);

      // Add guests to each event
      const guestPromises = events.map((event, index) => 
        guestService.importGuestList(event.id, [
          { name: `Guest ${index}-1`, email: `guest${index}1@example.com` },
          { name: `Guest ${index}-2`, email: `guest${index}2@example.com` }
        ])
      );

      const guestResults = await Promise.all(guestPromises);
      expect(guestResults.every(r => r.success)).toBe(true);

      // Send invitations for all events
      const invitationPromises = events.map(event =>
        emailService.sendInvitations(event.id, {
          subject: `Invitation: ${event.title}`,
          html: `<p>You're invited to ${event.title}!</p>`
        })
      );

      const invitationResults = await Promise.all(invitationPromises);
      expect(invitationResults.every(r => r.success)).toBe(true);

      // Verify data isolation between events
      for (let i = 0; i < events.length; i++) {
        const eventGuests = await guestService.getEventGuests(events[i].id);
        expect(eventGuests.length).toBe(2);
        expect(eventGuests.every(g => g.eventId === events[i].id)).toBe(true);
      }
    });

    it('should handle event archival and cleanup', async () => {
      // Create completed event
      const completedEvent = await eventService.createEvent({
        title: 'Completed Wedding',
        date: new Date('2023-06-15'), // Past date
        status: 'completed'
      });

      // Add historical data
      await guestService.importGuestList(completedEvent.id, [
        { name: 'Historical Guest', email: 'historical@example.com' }
      ]);

      // Upload event photos
      const photo = createTestFile({
        name: 'wedding-photo.jpg',
        type: 'image/jpeg'
      });

      await fileUploadService.uploadFile(
        `events/${completedEvent.id}/photos/final.jpg`,
        photo
      );

      // Archive event with data preservation
      const archiveResult = await eventService.archiveEvent(completedEvent.id, {
        preservePhotos: true,
        preserveGuestData: true,
        compressionLevel: 'high'
      });

      expect(archiveResult.success).toBe(true);
      expect(archiveResult.archiveSize).toBeGreaterThan(0);

      // Verify archived data is accessible but optimized
      const archivedEvent = await eventService.getArchivedEvent(completedEvent.id);
      expect(archivedEvent.title).toBe('Completed Wedding');
      expect(archivedEvent.isArchived).toBe(true);

      // Verify active queries don't include archived events
      const activeEvents = await eventService.getActiveEvents();
      expect(activeEvents.find(e => e.id === completedEvent.id)).toBeUndefined();
    });
  });

  describe('Disaster Recovery Workflow', () => {
    it('should recover from complete provider failure', async () => {
      // Create event with full data set
      const event = await eventService.createEvent({
        title: 'Disaster Recovery Test',
        date: new Date('2024-12-31')
      });

      const guestResult = await guestService.importGuestList(event.id, [
        { name: 'Important Guest', email: 'important@example.com' }
      ]);

      // Create backup before disaster
      const backupResult = await providerManager.createFullBackup({
        includeFiles: true,
        compression: true
      });

      expect(backupResult.success).toBe(true);
      expect(backupResult.backupId).toBeDefined();

      // Simulate complete provider failure
      await providerManager.simulateDisaster(['database', 'storage']);

      // Verify services are unavailable
      await expect(eventService.getEvent(event.id)).rejects.toThrow();

      // Execute disaster recovery
      const recoveryResult = await providerManager.executeDisasterRecovery(
        backupResult.backupId,
        {
          targetProviders: {
            database: { type: 'postgresql', config: TEST_CONFIGS.postgresql },
            storage: { type: 'local', config: TEST_CONFIGS.local_storage }
          },
          validateRecovery: true
        }
      );

      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.recoveredProviders).toBe(2);

      // Verify data recovery
      const recoveredEvent = await eventService.getEvent(event.id);
      expect(recoveredEvent.title).toBe('Disaster Recovery Test');

      const recoveredGuests = await guestService.getEventGuests(event.id);
      expect(recoveredGuests.length).toBe(1);
      expect(recoveredGuests[0].name).toBe('Important Guest');
    });

    it('should handle partial provider recovery', async () => {
      // Setup with multiple providers
      const event = await eventService.createEvent({
        title: 'Partial Recovery Test',
        date: new Date('2024-11-15')
      });

      // Simulate partial failure (storage only)
      await providerManager.simulateDisaster(['storage']);

      // Database operations should still work
      const guestResult = await guestService.importGuestList(event.id, [
        { name: 'Test Guest', email: 'test@example.com' }
      ]);

      expect(guestResult.success).toBe(true);

      // File operations should fail gracefully
      const file = createTestFile({ name: 'test.jpg' });
      await expect(
        fileUploadService.uploadFile(`events/${event.id}/test.jpg`, file)
      ).rejects.toThrow('Storage provider unavailable');

      // Recover storage provider
      const storageRecovery = await providerManager.recoverProvider(
        'storage',
        { type: 's3', config: TEST_CONFIGS.aws_s3 }
      );

      expect(storageRecovery.success).toBe(true);

      // File operations should work again
      const uploadResult = await fileUploadService.uploadFile(
        `events/${event.id}/recovered.jpg`,
        file
      );

      expect(uploadResult.success).toBe(true);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high-volume concurrent operations', async () => {
      const startTime = Date.now();
      
      // Create multiple events concurrently
      const eventPromises = Array.from({ length: 10 }, (_, i) =>
        eventService.createEvent({
          title: `Load Test Event ${i}`,
          date: new Date(`2024-12-${String(i + 1).padStart(2, '0')}`)
        })
      );

      const events = await Promise.all(eventPromises);
      expect(events.length).toBe(10);

      // Add guests to all events concurrently
      const guestPromises = events.map((event, i) =>
        guestService.importGuestList(event.id, Array.from({ length: 20 }, (_, j) => ({
          name: `Guest ${i}-${j}`,
          email: `guest${i}${j}@example.com`
        })))
      );

      const guestResults = await Promise.all(guestPromises);
      expect(guestResults.every(r => r.success && r.imported === 20)).toBe(true);

      // Send invitations concurrently
      const emailPromises = events.map(event =>
        emailService.sendInvitations(event.id, {
          subject: `Load Test: ${event.title}`,
          html: '<p>Load test invitation</p>'
        })
      );

      const emailResults = await Promise.all(emailPromises);
      expect(emailResults.every(r => r.success && r.sent === 20)).toBe(true);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (adjust based on system)
      expect(totalTime).toBeLessThan(30000); // 30 seconds

      // Verify data integrity after high load
      const totalGuests = await Promise.all(
        events.map(event => guestService.getEventGuests(event.id))
      );

      const flatGuests = totalGuests.flat();
      expect(flatGuests.length).toBe(200); // 10 events * 20 guests
      expect(new Set(flatGuests.map(g => g.email)).size).toBe(200); // All unique
    });

    it('should maintain consistency under concurrent modifications', async () => {
      const event = await eventService.createEvent({
        title: 'Concurrency Test',
        date: new Date('2024-12-01')
      });

      // Concurrent guest additions
      const concurrentGuestPromises = Array.from({ length: 5 }, (_, i) =>
        Promise.all(Array.from({ length: 10 }, (_, j) =>
          guestService.addGuest(event.id, {
            name: `Concurrent Guest ${i}-${j}`,
            email: `concurrent${i}${j}@example.com`
          })
        ))
      );

      const concurrentResults = await Promise.all(concurrentGuestPromises);
      const allConcurrentGuests = concurrentResults.flat();

      expect(allConcurrentGuests.length).toBe(50);
      expect(allConcurrentGuests.every(g => g.id)).toBe(true);

      // Verify no duplicate IDs or emails
      const guestIds = allConcurrentGuests.map(g => g.id);
      const guestEmails = allConcurrentGuests.map(g => g.email);

      expect(new Set(guestIds).size).toBe(50);
      expect(new Set(guestEmails).size).toBe(50);

      // Verify database consistency
      const finalGuests = await guestService.getEventGuests(event.id);
      expect(finalGuests.length).toBe(50);
    });
  });
});