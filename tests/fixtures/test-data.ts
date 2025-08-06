import { faker } from '@faker-js/faker';

// Test user data factory
export const createTestUser = (overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  username: faker.internet.userName(),
  password: faker.internet.password(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: faker.helpers.arrayElement(['admin', 'staff', 'couple']),
  createdAt: faker.date.recent(),
  ...overrides,
});

// Test guest data factory
export const createTestGuest = (overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  accommodation: faker.datatype.boolean(),
  transport: faker.datatype.boolean(),
  dietary: faker.helpers.arrayElement(['none', 'vegetarian', 'vegan', 'gluten-free', 'halal']),
  rsvpStatus: faker.helpers.arrayElement(['pending', 'attending', 'not-attending', 'maybe']),
  plusOneCount: faker.number.int({ min: 0, max: 2 }),
  specialRequests: faker.lorem.sentence(),
  location: {
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    country: faker.location.country(),
    coordinates: {
      lat: parseFloat(faker.location.latitude()),
      lng: parseFloat(faker.location.longitude()),
    },
  },
  ...overrides,
});

// Test event data factory
export const createTestEvent = (overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 100 }),
  title: `${faker.person.firstName()} & ${faker.person.firstName()}'s Wedding`,
  coupleNames: `${faker.person.fullName()} & ${faker.person.fullName()}`,
  brideName: faker.person.firstName('female'),
  groomName: faker.person.firstName('male'),
  startDate: faker.date.future(),
  endDate: faker.date.future(),
  location: faker.location.city(),
  description: faker.lorem.paragraph(),
  rsvpDeadline: faker.date.future(),
  allowPlusOnes: faker.datatype.boolean(),
  allowChildrenDetails: faker.datatype.boolean(),
  emailConfigured: faker.datatype.boolean(),
  whatsappConfigured: faker.datatype.boolean(),
  ...overrides,
});

// Test notification data factory
export const createTestNotification = (overrides = {}) => ({
  id: faker.string.uuid(),
  type: faker.helpers.arrayElement([
    'RSVP_RECEIVED',
    'TRANSPORT_UPDATE',
    'ACCOMMODATION_ASSIGNED',
    'FLIGHT_UPDATE',
    'SYSTEM_ALERT',
  ]),
  title: faker.lorem.words(3),
  message: faker.lorem.sentence(),
  recipients: [faker.string.uuid()],
  channels: faker.helpers.arrayElements(['in-app', 'email', 'sms'], { min: 1, max: 3 }),
  priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
  scheduledAt: faker.date.future(),
  sentAt: faker.date.recent(),
  readAt: faker.datatype.boolean() ? faker.date.recent() : null,
  ...overrides,
});

// Test transport group data factory
export const createTestTransportGroup = (overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 100 }),
  name: `Group ${faker.string.alpha(3).toUpperCase()}`,
  capacity: faker.number.int({ min: 4, max: 50 }),
  vehicleType: faker.helpers.arrayElement(['bus', 'van', 'car', 'limousine']),
  driverId: faker.number.int({ min: 1, max: 20 }),
  driverName: faker.person.fullName(),
  driverPhone: faker.phone.number(),
  assignedGuests: [],
  departureTime: faker.date.future(),
  pickupLocation: faker.location.streetAddress(),
  status: faker.helpers.arrayElement(['planned', 'en-route', 'completed', 'cancelled']),
  ...overrides,
});

// Test flight data factory
export const createTestFlight = (overrides = {}) => ({
  id: faker.string.uuid(),
  flightNumber: `${faker.string.alpha(2).toUpperCase()}${faker.number.int({ min: 100, max: 9999 })}`,
  airline: faker.company.name(),
  departureAirport: faker.string.alpha(3).toUpperCase(),
  arrivalAirport: faker.string.alpha(3).toUpperCase(),
  departureTime: faker.date.future(),
  arrivalTime: faker.date.future(),
  status: faker.helpers.arrayElement(['scheduled', 'delayed', 'boarding', 'departed', 'arrived']),
  guestId: faker.number.int({ min: 1, max: 10000 }),
  guestName: faker.person.fullName(),
  representativeId: faker.number.int({ min: 1, max: 10 }),
  ...overrides,
});

// Test analytics data factory
export const createTestAnalytics = (overrides = {}) => ({
  eventId: faker.number.int({ min: 1, max: 100 }),
  totalGuests: faker.number.int({ min: 50, max: 500 }),
  rsvpStats: {
    attending: faker.number.int({ min: 40, max: 400 }),
    notAttending: faker.number.int({ min: 5, max: 50 }),
    pending: faker.number.int({ min: 5, max: 50 }),
    maybe: faker.number.int({ min: 0, max: 20 }),
  },
  accommodationStats: {
    needed: faker.number.int({ min: 20, max: 200 }),
    assigned: faker.number.int({ min: 15, max: 180 }),
    pending: faker.number.int({ min: 5, max: 20 }),
  },
  transportStats: {
    needed: faker.number.int({ min: 30, max: 300 }),
    assigned: faker.number.int({ min: 25, max: 280 }),
    groups: faker.number.int({ min: 3, max: 15 }),
  },
  communicationStats: {
    emailsSent: faker.number.int({ min: 100, max: 1000 }),
    smssSent: faker.number.int({ min: 50, max: 500 }),
    whatsappSent: faker.number.int({ min: 20, max: 200 }),
    openRate: faker.number.float({ min: 0.2, max: 0.8 }),
    clickRate: faker.number.float({ min: 0.1, max: 0.4 }),
  },
  ...overrides,
});

// Mock API responses
export const mockApiResponses = {
  success: (data: any) => ({
    success: true,
    data,
    message: 'Operation completed successfully',
  }),
  error: (message: string, code = 400) => ({
    success: false,
    error: message,
    code,
  }),
  paginated: (data: any[], page = 1, limit = 10) => ({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total: data.length,
      totalPages: Math.ceil(data.length / limit),
    },
  }),
};

// Test scenarios for different user roles
export const userRoleScenarios = {
  admin: {
    user: createTestUser({ role: 'admin' }),
    permissions: ['read:all', 'write:all', 'delete:all', 'admin:manage'],
  },
  staff: {
    user: createTestUser({ role: 'staff' }),
    permissions: ['read:events', 'write:guests', 'read:reports'],
  },
  couple: {
    user: createTestUser({ role: 'couple' }),
    permissions: ['read:own-event', 'write:own-event'],
  },
};

// Complex test scenarios
export const testScenarios = {
  largeEvent: {
    event: createTestEvent({ title: 'Large Wedding Event' }),
    guests: Array.from({ length: 500 }, () => createTestGuest()),
    transportGroups: Array.from({ length: 15 }, () => createTestTransportGroup()),
    flights: Array.from({ length: 100 }, () => createTestFlight()),
  },
  smallEvent: {
    event: createTestEvent({ title: 'Intimate Wedding' }),
    guests: Array.from({ length: 50 }, () => createTestGuest()),
    transportGroups: Array.from({ length: 3 }, () => createTestTransportGroup()),
    flights: Array.from({ length: 10 }, () => createTestFlight()),
  },
  internationalEvent: {
    event: createTestEvent({ title: 'Destination Wedding' }),
    guests: Array.from({ length: 200 }, () => 
      createTestGuest({ 
        accommodation: true, 
        transport: true,
        location: { 
          country: faker.helpers.arrayElement(['USA', 'Canada', 'UK', 'Australia', 'India']) 
        } 
      })
    ),
    transportGroups: Array.from({ length: 8 }, () => createTestTransportGroup()),
    flights: Array.from({ length: 50 }, () => createTestFlight()),
  },
};