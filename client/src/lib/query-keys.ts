/**
 * Centralized Query Key Registry
 * Standardizes React Query key patterns for consistency and cache management
 */

export const queryKeys = {
  // Event-related queries
  events: {
    all: ['events'] as const,
    current: ['current-event'] as const,
    byId: (id: number) => ['events', id] as const,
    statistics: (eventId: number) => ['events', eventId, 'statistics'] as const,
    wizardData: (eventId: number) => ['events', eventId, 'wizard-data'] as const,
    dashboardData: (eventId: number) => ['events', eventId, 'dashboard-data'] as const,
  },

  // Guest-related queries
  guests: {
    all: (eventId: number) => ['events', eventId, 'guests'] as const,
    byId: (guestId: number) => ['guests', guestId] as const,
    masterData: (eventId: number) => ['events', eventId, 'master-guest-data'] as const,
    rsvpStatus: (eventId: number, status: string) => ['events', eventId, 'guests', 'rsvp-status', status] as const,
  },

  // RSVP-related queries
  rsvp: {
    templates: (eventId: number) => ['events', eventId, 'rsvp-followup-templates'] as const,
    followupLogs: (guestId: number) => ['guests', guestId, 'followup-logs'] as const,
    configuration: (eventId: number) => ['events', eventId, 'rsvp-configuration'] as const,
  },

  // Communication-related queries
  communication: {
    templates: (eventId: number) => ['events', eventId, 'communication-templates'] as const,
    providers: (eventId: number) => ['events', eventId, 'communication-providers'] as const,
    whatsappTemplates: (eventId: number) => ['events', eventId, 'whatsapp-templates'] as const,
  },

  // Accommodation-related queries
  accommodation: {
    all: (eventId: number) => ['events', eventId, 'accommodations'] as const,
    hotels: (eventId: number) => ['events', eventId, 'hotels'] as const,
    roomAllocations: (eventId: number) => ['events', eventId, 'room-allocations'] as const,
  },

  // Transport-related queries
  transport: {
    groups: (eventId: number) => ['events', eventId, 'transport-groups'] as const,
    allocations: (eventId: number) => ['events', eventId, 'transport-allocations'] as const,
    vehicles: (eventId: number) => ['events', eventId, 'vehicles'] as const,
  },

  // Ceremony-related queries
  ceremonies: {
    all: (eventId: number) => ['events', eventId, 'ceremonies'] as const,
    byId: (ceremonyId: number) => ['ceremonies', ceremonyId] as const,
    attendance: (guestId: number) => ['guests', guestId, 'ceremony-attendance'] as const,
  },

  // Travel-related queries
  travel: {
    all: (eventId: number) => ['events', eventId, 'travel'] as const,
    coordination: (eventId: number) => ['events', eventId, 'flight-coordination'] as const,
    batchData: (eventId: number) => ['events', eventId, 'travel-batch'] as const,
  }
};

/**
 * Helper function to invalidate related queries
 */
export const invalidateRelatedQueries = {
  afterGuestUpdate: (eventId: number) => [
    queryKeys.guests.all(eventId),
    queryKeys.guests.masterData(eventId),
    queryKeys.events.statistics(eventId),
    queryKeys.events.dashboardData(eventId)
  ],
  
  afterEventUpdate: (eventId: number) => [
    queryKeys.events.byId(eventId),
    queryKeys.events.current,
    queryKeys.events.wizardData(eventId),
    queryKeys.events.dashboardData(eventId)
  ],
  
  afterRsvpUpdate: (eventId: number, guestId: number) => [
    queryKeys.guests.all(eventId),
    queryKeys.guests.byId(guestId),
    queryKeys.events.statistics(eventId),
    queryKeys.rsvp.followupLogs(guestId)
  ]
};