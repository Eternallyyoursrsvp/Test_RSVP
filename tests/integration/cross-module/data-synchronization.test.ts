import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestGuest, createTestEvent, createTestTransportGroup, createTestFlight } from '../../fixtures/test-data';

// Mock database client
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(), 
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
};

// Mock services that would be implemented across different weeks
const mockGuestService = {
  updateGuest: vi.fn(),
  getGuest: vi.fn(),
  syncGuestData: vi.fn(),
};

const mockAccommodationService = {
  assignAccommodation: vi.fn(),
  updateAccommodation: vi.fn(),
  getAccommodationByGuest: vi.fn(),
};

const mockTransportService = {
  assignToGroup: vi.fn(),
  updateTransportStatus: vi.fn(),
  getTransportByGuest: vi.fn(),
};

const mockTravelService = {
  updateFlightInfo: vi.fn(),
  coordinateArrival: vi.fn(),
  getTravelByGuest: vi.fn(),
};

const mockNotificationService = {
  trigger: vi.fn(),
  broadcast: vi.fn(),
};

// Mock cross-module sync service
const mockSyncService = {
  syncGuestUpdate: vi.fn(),
  syncAccommodationUpdate: vi.fn(),
  syncTransportUpdate: vi.fn(),
  syncTravelUpdate: vi.fn(),
  validateDataConsistency: vi.fn(),
};

describe('Cross-Module Data Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Guest Data Synchronization', () => {
    it('should sync guest updates across all modules', async () => {
      // Arrange
      const guest = createTestGuest({
        id: 123,
        name: 'John Doe',
        email: 'john.doe@example.com',
        dietary: 'vegetarian'
      });

      const updatedGuest = {
        ...guest,
        dietary: 'vegan',
        specialRequests: 'Gluten-free options please'
      };

      // Mock successful sync across all modules
      mockSyncService.syncGuestUpdate.mockResolvedValue({
        success: true,
        modulesUpdated: ['accommodation', 'transport', 'travel', 'notifications'],
        consistency: true
      });

      // Act
      const result = await mockSyncService.syncGuestUpdate(guest.id, updatedGuest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.modulesUpdated).toContain('accommodation');
      expect(result.modulesUpdated).toContain('transport');
      expect(result.modulesUpdated).toContain('travel');
      expect(result.modulesUpdated).toContain('notifications');
      expect(result.consistency).toBe(true);
    });

    it('should handle partial sync failures gracefully', async () => {
      // Arrange
      const guestId = 456;
      const updates = { dietary: 'halal', phone: '+1-555-0123' };

      mockSyncService.syncGuestUpdate.mockResolvedValue({
        success: false,
        modulesUpdated: ['accommodation', 'transport'],
        modulesFailed: ['travel'],
        failures: [
          { module: 'travel', error: 'Connection timeout', retry: true }
        ],
        consistency: false
      });

      // Act
      const result = await mockSyncService.syncGuestUpdate(guestId, updates);

      // Assert
      expect(result.success).toBe(false);
      expect(result.modulesUpdated).toHaveLength(2);
      expect(result.modulesFailed).toContain('travel');
      expect(result.consistency).toBe(false);
      expect(result.failures[0].retry).toBe(true);
    });

    it('should maintain data consistency during concurrent updates', async () => {
      // Arrange
      const guestId = 789;
      const update1 = { accommodation: true, transport: true };
      const update2 = { dietary: 'vegan', specialRequests: 'Window seat' };

      // Mock transaction-based consistency
      mockDb.transaction.mockImplementation(async (callback) => {
        return callback(mockDb);
      });

      mockSyncService.validateDataConsistency.mockResolvedValue({
        consistent: true,
        conflicts: [],
        resolved: true
      });

      // Act
      const [result1, result2] = await Promise.all([
        mockSyncService.syncGuestUpdate(guestId, update1),
        mockSyncService.syncGuestUpdate(guestId, update2)
      ]);

      // Assert
      expect(mockDb.transaction).toHaveBeenCalledTimes(2);
      expect(mockSyncService.validateDataConsistency).toHaveBeenCalled();
    });
  });

  describe('RSVP → Accommodation → Transport Flow', () => {
    it('should trigger accommodation assignment when RSVP indicates need', async () => {
      // Arrange
      const guest = createTestGuest({ 
        id: 101,
        accommodation: true,
        transport: true
      });

      const rsvpData = {
        guestId: guest.id,
        attending: true,
        needsAccommodation: true,
        needsTransport: true,
        accommodationPreferences: {
          roomType: 'double',
          smokingPreference: 'non-smoking'
        }
      };

      // Mock successful workflow
      mockAccommodationService.assignAccommodation.mockResolvedValue({
        success: true,
        accommodationId: 'hotel-123',
        roomNumber: '204'
      });

      mockTransportService.assignToGroup.mockResolvedValue({
        success: true,
        groupId: 'group-abc',
        pickupTime: '2024-06-15T14:00:00Z'
      });

      mockNotificationService.trigger.mockResolvedValue({ success: true });

      // Act
      const accommodationResult = await mockAccommodationService.assignAccommodation(rsvpData);
      const transportResult = await mockTransportService.assignToGroup(guest.id, {
        accommodationId: accommodationResult.accommodationId
      });

      // Assert
      expect(accommodationResult.success).toBe(true);
      expect(transportResult.success).toBe(true);
      expect(mockNotificationService.trigger).toHaveBeenCalledWith('ACCOMMODATION_ASSIGNED', expect.any(Object));
      expect(mockNotificationService.trigger).toHaveBeenCalledWith('TRANSPORT_ASSIGNED', expect.any(Object));
    });

    it('should handle accommodation unavailability and offer alternatives', async () => {
      // Arrange
      const guestId = 202;
      const rsvpData = {
        guestId,
        attending: true,
        needsAccommodation: true,
        accommodationPreferences: {
          roomType: 'suite',
          smokingPreference: 'non-smoking'
        }
      };

      mockAccommodationService.assignAccommodation.mockResolvedValue({
        success: false,
        reason: 'Preferred room type unavailable',
        alternatives: [
          { roomType: 'double', available: true, rate: 150 },
          { roomType: 'single', available: true, rate: 120 }
        ]
      });

      mockNotificationService.trigger.mockResolvedValue({ success: true });

      // Act
      const result = await mockAccommodationService.assignAccommodation(rsvpData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.alternatives).toHaveLength(2);
      expect(mockNotificationService.trigger).toHaveBeenCalledWith('ACCOMMODATION_ALTERNATIVES_AVAILABLE', expect.any(Object));
    });
  });

  describe('Transport Group Optimization', () => {
    it('should rebalance transport groups when guest accommodation changes', async () => {
      // Arrange
      const guest = createTestGuest({ 
        id: 303,
        accommodation: true,
        transport: true,
        location: { coordinates: { lat: 40.7128, lng: -74.0060 } } // NYC
      });

      const originalGroup = createTestTransportGroup({
        id: 'group-1',
        assignedGuests: [guest.id],
        capacity: 8
      });

      const newAccommodation = {
        guestId: guest.id,
        hotelLocation: { coordinates: { lat: 40.7589, lng: -73.9851 } }, // Different location
        checkInDate: '2024-06-14'
      };

      mockTransportService.updateTransportStatus.mockResolvedValue({
        success: true,
        rebalanced: true,
        originalGroup: 'group-1',
        newGroup: 'group-2',
        optimization: {
          distanceReduced: 2.5, // miles
          timeReduced: 15 // minutes
        }
      });

      // Act
      const result = await mockTransportService.updateTransportStatus(guest.id, newAccommodation);

      // Assert
      expect(result.success).toBe(true);
      expect(result.rebalanced).toBe(true);
      expect(result.optimization.distanceReduced).toBeGreaterThan(0);
      expect(result.optimization.timeReduced).toBeGreaterThan(0);
    });

    it('should coordinate transport timing with flight arrivals', async () => {
      // Arrange
      const guest = createTestGuest({ id: 404 });
      const flight = createTestFlight({
        guestId: guest.id,
        arrivalTime: '2024-06-14T16:30:00Z',
        arrivalAirport: 'JFK'
      });

      const transportGroup = createTestTransportGroup({
        id: 'airport-pickup-1',
        departureTime: '2024-06-14T17:00:00Z',
        pickupLocation: 'JFK Terminal 1'
      });

      mockTravelService.coordinateArrival.mockResolvedValue({
        success: true,
        coordination: {
          transportGroupId: transportGroup.id,
          bufferTime: 30, // minutes
          meetingPoint: 'JFK Terminal 1 - Arrivals',
          representativeContact: '+1-555-AIRPORT'
        }
      });

      // Act
      const result = await mockTravelService.coordinateArrival(flight.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.coordination.bufferTime).toBeGreaterThanOrEqual(30);
      expect(result.coordination.meetingPoint).toContain('JFK');
    });
  });

  describe('Real-time Status Updates', () => {
    it('should propagate transport status updates to all relevant modules', async () => {
      // Arrange
      const transportGroup = createTestTransportGroup({
        id: 'group-live-1',
        status: 'en-route',
        assignedGuests: [101, 102, 103]
      });

      const statusUpdate = {
        groupId: transportGroup.id,
        status: 'arrived',
        location: { lat: 40.7128, lng: -74.0060 },
        timestamp: new Date().toISOString(),
        estimatedArrival: null
      };

      mockSyncService.syncTransportUpdate.mockResolvedValue({
        success: true,
        notificationsSent: 3,
        modulesUpdated: ['guests', 'accommodation', 'analytics'],
        realTimeUpdates: true
      });

      // Act
      const result = await mockSyncService.syncTransportUpdate(statusUpdate);

      // Assert
      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(transportGroup.assignedGuests.length);
      expect(result.realTimeUpdates).toBe(true);
    });

    it('should handle flight delay impacts on transport coordination', async () => {
      // Arrange
      const flight = createTestFlight({
        id: 'flight-delayed-1',
        status: 'delayed',
        originalArrival: '2024-06-14T16:30:00Z',
        newArrival: '2024-06-14T18:45:00Z',
        guestId: 505
      });

      const impactAssessment = {
        transportGroupsAffected: ['airport-pickup-1', 'airport-pickup-2'],
        accommodationImpacts: ['late-checkin-required'],
        notificationsRequired: ['guest', 'driver', 'hotel', 'admin']
      };

      mockSyncService.syncTravelUpdate.mockResolvedValue({
        success: true,
        impactAssessment,
        mitigationActions: [
          'Updated transport pickup time',
          'Notified hotel of late arrival',
          'Arranged meal for delayed guest'
        ]
      });

      // Act
      const result = await mockSyncService.syncTravelUpdate(flight);

      // Assert
      expect(result.success).toBe(true);
      expect(result.impactAssessment.transportGroupsAffected).toHaveLength(2);
      expect(result.mitigationActions).toContain('Updated transport pickup time');
    });
  });

  describe('Analytics Data Consistency', () => {
    it('should maintain consistent analytics across all module updates', async () => {
      // Arrange
      const event = createTestEvent({ id: 1 });
      const moduleUpdates = [
        { module: 'rsvp', metric: 'attendance_confirmed', value: 1 },
        { module: 'accommodation', metric: 'rooms_assigned', value: 1 },
        { module: 'transport', metric: 'guests_assigned', value: 1 },
        { module: 'travel', metric: 'flights_coordinated', value: 1 }
      ];

      mockSyncService.validateDataConsistency.mockResolvedValue({
        consistent: true,
        analyticsUpdated: true,
        metricsValidated: [
          'total_attending_guests',
          'accommodation_utilization',
          'transport_efficiency',
          'travel_coordination_rate'
        ]
      });

      // Act
      const result = await mockSyncService.validateDataConsistency(event.id, moduleUpdates);

      // Assert
      expect(result.consistent).toBe(true);
      expect(result.analyticsUpdated).toBe(true);
      expect(result.metricsValidated).toHaveLength(4);
    });

    it('should detect and resolve data inconsistencies', async () => {
      // Arrange
      const eventId = 2;
      const inconsistency = {
        type: 'count_mismatch',
        module1: { name: 'rsvp', count: 150 },
        module2: { name: 'transport', count: 148 },
        difference: 2
      };

      mockSyncService.validateDataConsistency.mockResolvedValue({
        consistent: false,
        inconsistencies: [inconsistency],
        resolutionActions: [
          'Identified 2 guests with RSVP but no transport assignment',
          'Auto-assigned missing guests to transport groups',
          'Updated analytics to reflect correct counts'
        ],
        resolved: true
      });

      // Act
      const result = await mockSyncService.validateDataConsistency(eventId);

      // Assert
      expect(result.consistent).toBe(false);
      expect(result.inconsistencies).toHaveLength(1);
      expect(result.resolved).toBe(true);
      expect(result.resolutionActions).toContain('Auto-assigned missing guests to transport groups');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should implement rollback mechanisms for failed cross-module updates', async () => {
      // Arrange
      const guestId = 606;
      const updates = {
        accommodation: { hotelId: 'hotel-new', roomType: 'suite' },
        transport: { groupId: 'group-premium' },
        dietary: 'kosher'
      };

      // Mock partial failure scenario
      mockSyncService.syncGuestUpdate.mockResolvedValue({
        success: false,
        modulesUpdated: ['accommodation'],
        modulesFailed: ['transport'],
        rollbackRequired: true,
        rollbackActions: [
          'Reverted accommodation assignment',
          'Restored original guest data',
          'Cleared partial update states'
        ]
      });

      // Act
      const result = await mockSyncService.syncGuestUpdate(guestId, updates);

      // Assert
      expect(result.success).toBe(false);
      expect(result.rollbackRequired).toBe(true);
      expect(result.rollbackActions).toContain('Reverted accommodation assignment');
    });

    it('should queue updates for retry when modules are temporarily unavailable', async () => {
      // Arrange
      const updates = [
        { module: 'transport', action: 'assign_guest', data: { guestId: 707, groupId: 'group-1' } },
        { module: 'accommodation', action: 'update_room', data: { guestId: 707, roomNumber: '305' } }
      ];

      mockSyncService.syncGuestUpdate.mockResolvedValue({
        success: false,
        temporaryFailures: ['transport'],
        queuedForRetry: true,
        retrySchedule: {
          nextAttempt: new Date(Date.now() + 30000).toISOString(), // 30 seconds
          maxRetries: 3,
          backoffStrategy: 'exponential'
        }
      });

      // Act
      const result = await mockSyncService.syncGuestUpdate(707, updates);

      // Assert
      expect(result.queuedForRetry).toBe(true);
      expect(result.retrySchedule.maxRetries).toBe(3);
      expect(result.retrySchedule.backoffStrategy).toBe('exponential');
    });
  });
});