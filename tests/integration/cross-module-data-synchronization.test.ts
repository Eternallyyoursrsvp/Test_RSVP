import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';

// Cross-module Data Synchronization Tests for Ver4 Implementation
describe('Cross-module Data Synchronization', () => {
  let startTime: number;
  let mockEventId: string;
  let mockGuestId: string;

  beforeEach(async () => {
    startTime = performance.now();
    mockEventId = 'test-event-123';
    mockGuestId = 'test-guest-456';
  });

  afterEach(async () => {
    const duration = performance.now() - startTime;
    console.log(`Test completed in ${duration.toFixed(2)}ms`);
  });

  test('RSVP submission triggers accommodation auto-assignment', async () => {
    // Mock RSVP data
    const rsvpData = {
      guestId: mockGuestId,
      eventId: mockEventId,
      status: 'confirmed',
      plusOne: true,
      plusOneName: 'Jane Doe',
      dietaryRestrictions: 'vegetarian',
      specialRequests: 'ground floor room'
    };

    // Simulate RSVP submission
    const rsvpResponse = await fetch('/api/rsvp/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rsvpData)
    });

    expect(rsvpResponse.status).toBe(200);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify accommodation was auto-assigned
    const accommodationResponse = await fetch(`/api/guests/${mockGuestId}/accommodation`);
    const accommodation = await accommodationResponse.json();

    expect(accommodation).toBeDefined();
    expect(accommodation.guestId).toBe(mockGuestId);
    expect(accommodation.status).toBe('assigned');
    
    // Verify special requests were considered
    if (rsvpData.specialRequests.includes('ground floor')) {
      expect(accommodation.roomType).toContain('ground');
    }
  });

  test('RSVP submission triggers transport group assignment', async () => {
    const rsvpData = {
      guestId: mockGuestId,
      eventId: mockEventId,
      status: 'confirmed',
      arrivalDate: '2024-06-15',
      departureDate: '2024-06-17',
      needsTransport: true
    };

    // Submit RSVP
    const rsvpResponse = await fetch('/api/rsvp/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rsvpData)
    });

    expect(rsvpResponse.status).toBe(200);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify transport assignment
    const transportResponse = await fetch(`/api/guests/${mockGuestId}/transport`);
    const transport = await transportResponse.json();

    expect(transport).toBeDefined();
    expect(transport.guestId).toBe(mockGuestId);
    expect(transport.status).toBe('assigned');
    expect(transport.pickupDate).toBe(rsvpData.arrivalDate);
  });

  test('Guest profile updates synchronize across all modules', async () => {
    // Update guest contact information
    const updateData = {
      email: 'updated@example.com',
      phone: '+1-555-0199',
      dietaryRestrictions: 'gluten-free',
      emergencyContact: {
        name: 'Emergency Contact',
        phone: '+1-555-0911'
      }
    };

    const updateResponse = await fetch(`/api/guests/${mockGuestId}/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    expect(updateResponse.status).toBe(200);

    // Wait for synchronization
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verify updates in RSVP module
    const rsvpResponse = await fetch(`/api/rsvp/${mockGuestId}/details`);
    const rsvpData = await rsvpResponse.json();
    expect(rsvpData.guest.email).toBe(updateData.email);
    expect(rsvpData.guest.dietaryRestrictions).toBe(updateData.dietaryRestrictions);

    // Verify updates in accommodation module
    const accommodationResponse = await fetch(`/api/guests/${mockGuestId}/accommodation`);
    const accommodationData = await accommodationResponse.json();
    expect(accommodationData.guest.phone).toBe(updateData.phone);
    expect(accommodationData.guest.emergencyContact.name).toBe(updateData.emergencyContact.name);

    // Verify updates in transport module
    const transportResponse = await fetch(`/api/guests/${mockGuestId}/transport`);
    const transportData = await transportResponse.json();
    expect(transportData.guest.email).toBe(updateData.email);
    expect(transportData.guest.phone).toBe(updateData.phone);
  });

  test('Accommodation changes trigger notification cascade', async () => {
    const accommodationUpdate = {
      roomNumber: '205',
      roomType: 'deluxe',
      checkInDate: '2024-06-15',
      checkOutDate: '2024-06-17',
      status: 'confirmed'
    };

    // Update accommodation
    const updateResponse = await fetch(`/api/guests/${mockGuestId}/accommodation/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accommodationUpdate)
    });

    expect(updateResponse.status).toBe(200);

    // Wait for notification processing
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Verify notifications were created
    const notificationsResponse = await fetch(`/api/notifications/guest/${mockGuestId}`);
    const notifications = await notificationsResponse.json();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('ACCOMMODATION_CONFIRMED');
    expect(notifications[0].data.roomNumber).toBe(accommodationUpdate.roomNumber);

    // Verify guest timeline was updated
    const timelineResponse = await fetch(`/api/guests/${mockGuestId}/timeline`);
    const timeline = await timelineResponse.json();

    const accommodationEvent = timeline.find((event: any) => 
      event.type === 'accommodation_update'
    );
    expect(accommodationEvent).toBeDefined();
    expect(accommodationEvent.data.roomNumber).toBe(accommodationUpdate.roomNumber);
  });

  test('Transport assignment updates coordination status', async () => {
    const transportAssignment = {
      vehicleId: 'bus-001',
      pickupTime: '14:30',
      pickupLocation: 'Airport Terminal 1',
      dropoffLocation: 'Wedding Venue',
      status: 'confirmed'
    };

    // Assign transport
    const assignResponse = await fetch(`/api/guests/${mockGuestId}/transport/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transportAssignment)
    });

    expect(assignResponse.status).toBe(200);

    // Wait for coordination updates
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify transport coordination was updated
    const coordinationResponse = await fetch(`/api/transport/operations/${mockEventId}`);
    const operations = await coordinationResponse.json();

    const vehicleData = operations.vehicles.find((v: any) => v.id === transportAssignment.vehicleId);
    expect(vehicleData).toBeDefined();
    expect(vehicleData.passengers).toContain(mockGuestId);
    expect(vehicleData.status).toBe('assigned');

    // Verify guest received confirmation
    const guestNotificationsResponse = await fetch(`/api/notifications/guest/${mockGuestId}`);
    const notifications = await guestNotificationsResponse.json();

    const transportNotification = notifications.find((n: any) => 
      n.type === 'TRANSPORT_ASSIGNED'
    );
    expect(transportNotification).toBeDefined();
    expect(transportNotification.data.vehicleId).toBe(transportAssignment.vehicleId);
  });

  test('Analytics data reflects cross-module changes in real-time', async () => {
    // Get initial analytics state
    const initialAnalyticsResponse = await fetch(`/api/analytics/dashboard/${mockEventId}`);
    const initialAnalytics = await initialAnalyticsResponse.json();

    // Submit new RSVP to trigger changes
    const newRsvpData = {
      guestId: 'new-guest-789',
      eventId: mockEventId,
      status: 'confirmed',
      plusOne: false,
      dietaryRestrictions: 'none'
    };

    const rsvpResponse = await fetch('/api/rsvp/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRsvpData)
    });

    expect(rsvpResponse.status).toBe(200);

    // Wait for analytics update
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get updated analytics
    const updatedAnalyticsResponse = await fetch(`/api/analytics/dashboard/${mockEventId}`);
    const updatedAnalytics = await updatedAnalyticsResponse.json();

    // Verify analytics were updated
    expect(updatedAnalytics.totalGuests).toBe(initialAnalytics.totalGuests + 1);
    expect(updatedAnalytics.confirmedGuests).toBe(initialAnalytics.confirmedGuests + 1);
    expect(updatedAnalytics.lastUpdated).not.toBe(initialAnalytics.lastUpdated);

    // Verify cache was invalidated and refreshed
    expect(updatedAnalytics.cacheHit).toBe(false); // First request after update should miss cache
    
    // Second request should hit cache
    const cachedAnalyticsResponse = await fetch(`/api/analytics/dashboard/${mockEventId}`);
    const cachedAnalytics = await cachedAnalyticsResponse.json();
    expect(cachedAnalytics.cacheHit).toBe(true);
  });

  test('Master guest profile aggregates data from all modules', async () => {
    // Create guest data across multiple modules
    const guestData = {
      guestId: mockGuestId,
      eventId: mockEventId,
      personalInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-0123'
      }
    };

    // Create RSVP
    await fetch('/api/rsvp/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...guestData,
        status: 'confirmed',
        dietaryRestrictions: 'vegetarian'
      })
    });

    // Assign accommodation
    await fetch(`/api/guests/${mockGuestId}/accommodation/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomNumber: '301',
        roomType: 'standard',
        checkInDate: '2024-06-15'
      })
    });

    // Assign transport
    await fetch(`/api/guests/${mockGuestId}/transport/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: 'van-002',
        pickupTime: '16:00'
      })
    });

    // Wait for data aggregation
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Get master guest profile
    const masterProfileResponse = await fetch(`/api/guests/${mockGuestId}/master-profile`);
    const masterProfile = await masterProfileResponse.json();

    // Verify all data is aggregated
    expect(masterProfile.guest.name).toBe(guestData.personalInfo.name);
    expect(masterProfile.guest.email).toBe(guestData.personalInfo.email);

    expect(masterProfile.rsvp).toBeDefined();
    expect(masterProfile.rsvp.status).toBe('confirmed');
    expect(masterProfile.rsvp.dietaryRestrictions).toBe('vegetarian');

    expect(masterProfile.accommodation).toBeDefined();
    expect(masterProfile.accommodation.roomNumber).toBe('301');

    expect(masterProfile.transport).toBeDefined();
    expect(masterProfile.transport.vehicleId).toBe('van-002');

    // Verify timeline includes all events
    expect(masterProfile.timeline).toBeDefined();
    expect(masterProfile.timeline.length).toBeGreaterThan(2);
    
    const timelineTypes = masterProfile.timeline.map((event: any) => event.type);
    expect(timelineTypes).toContain('rsvp_submitted');
    expect(timelineTypes).toContain('accommodation_assigned');
    expect(timelineTypes).toContain('transport_assigned');
  });

  test('Data consistency maintained during concurrent updates', async () => {
    // Simulate concurrent updates to the same guest
    const updatePromises = [
      // Update personal info
      fetch(`/api/guests/${mockGuestId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'concurrent1@example.com',
          phone: '+1-555-1111'
        })
      }),

      // Update RSVP status
      fetch(`/api/rsvp/${mockGuestId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'maybe',
          dietaryRestrictions: 'gluten-free'
        })
      }),

      // Update accommodation
      fetch(`/api/guests/${mockGuestId}/accommodation/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomType: 'suite',
          specialRequests: 'high floor'
        })
      })
    ];

    // Execute all updates concurrently
    const responses = await Promise.all(updatePromises);
    
    // Verify all updates succeeded
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // Wait for all synchronization to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify data consistency across modules
    const masterProfileResponse = await fetch(`/api/guests/${mockGuestId}/master-profile`);
    const masterProfile = await masterProfileResponse.json();

    // Verify latest updates are reflected consistently
    expect(masterProfile.guest.email).toBe('concurrent1@example.com');
    expect(masterProfile.guest.phone).toBe('+1-555-1111');
    expect(masterProfile.rsvp.status).toBe('maybe');
    expect(masterProfile.rsvp.dietaryRestrictions).toBe('gluten-free');
    expect(masterProfile.accommodation.roomType).toBe('suite');
    expect(masterProfile.accommodation.specialRequests).toBe('high floor');

    // Verify no data corruption occurred
    expect(masterProfile.guest.name).toBeDefined();
    expect(masterProfile.accommodation.roomNumber).toBeDefined();
  });
});