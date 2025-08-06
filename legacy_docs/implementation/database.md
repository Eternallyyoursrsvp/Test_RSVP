# Database Schema & Implementation

## Overview

The Wedding RSVP Platform uses PostgreSQL with Drizzle ORM for type-safe database operations. The database implements a multi-tenant architecture with complete event isolation and comprehensive relationship modeling.

## 🗄️ Core Schema Architecture

### Multi-Tenant Design Pattern
All event-scoped tables follow a consistent pattern:

```typescript
// Base pattern for event-scoped tables
export const createEventTable = <T extends Record<string, any>>(
  tableName: string, 
  columns: T
) => pgTable(tableName, {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => weddingEvents.id, {
    onDelete: 'cascade',
  }),
  ...columns,
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Primary Tables

#### Wedding Events (Master Table)
```sql
CREATE TABLE wedding_events (
  id SERIAL PRIMARY KEY,
  couple_name_1 VARCHAR(255) NOT NULL,
  couple_name_2 VARCHAR(255) NOT NULL,
  wedding_date DATE NOT NULL,
  event_style VARCHAR(50) DEFAULT 'traditional',
  estimated_guests INTEGER DEFAULT 100,
  privacy_level VARCHAR(20) DEFAULT 'private',
  status VARCHAR(20) DEFAULT 'draft',
  wizard_step INTEGER DEFAULT 1,
  wizard_completed BOOLEAN DEFAULT FALSE,
  
  -- Transport Configuration
  transport_mode VARCHAR(20) DEFAULT 'none',
  flight_assistance_mode VARCHAR(30) DEFAULT 'none',
  flight_buffer_hours_before TIME DEFAULT '02:00:00',
  flight_buffer_hours_after TIME DEFAULT '01:00:00',
  collect_flight_info BOOLEAN DEFAULT FALSE,
  flight_email_confirmations BOOLEAN DEFAULT FALSE,
  guest_travel_instructions TEXT,
  
  -- Communication Settings
  email_provider VARCHAR(20),
  smtp_host VARCHAR(255),
  smtp_port INTEGER,
  smtp_username VARCHAR(255),
  smtp_password VARCHAR(255),
  sendgrid_api_key VARCHAR(255),
  
  -- OAuth Credentials (encrypted)
  gmail_client_id VARCHAR(255),
  gmail_client_secret VARCHAR(255),
  gmail_refresh_token TEXT,
  gmail_access_token TEXT,
  gmail_token_expiry TIMESTAMP,
  
  outlook_client_id VARCHAR(255),
  outlook_client_secret VARCHAR(255),
  outlook_refresh_token TEXT,
  outlook_access_token TEXT,
  outlook_token_expiry TIMESTAMP,
  
  -- WhatsApp Integration
  whatsapp_business_api_key VARCHAR(255),
  whatsapp_phone_number VARCHAR(20),
  whatsapp_web_session TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Guests (Core Entity)
```sql
CREATE TABLE guests (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES wedding_events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  category VARCHAR(50) DEFAULT 'friends', -- family, friends, colleagues
  relationship_to_couple VARCHAR(100),
  
  -- RSVP Status
  rsvp_status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, declined
  rsvp_token VARCHAR(255) UNIQUE,
  rsvp_submitted_at TIMESTAMP,
  rsvp_stage INTEGER DEFAULT 0, -- 0: not started, 1: basic info, 2: complete
  
  -- Plus One Information
  plus_one BOOLEAN DEFAULT FALSE,
  plus_one_name VARCHAR(255),
  plus_one_email VARCHAR(255),
  plus_one_phone VARCHAR(20),
  
  -- Ceremony Attendance
  invited_ceremonies JSONB DEFAULT '[]',
  attending_ceremonies JSONB DEFAULT '[]',
  
  -- Accommodation Preferences
  accommodation_mode VARCHAR(20) DEFAULT 'not-decided', -- provided, self, not-needed
  accommodation_preference VARCHAR(50), -- single, double, suite, family
  accommodation_special_requests TEXT,
  
  -- Travel Information
  travel_mode VARCHAR(20), -- flight, train, car, bus, other
  travel_arrival_date DATE,
  travel_departure_date DATE,
  travel_arrival_airport VARCHAR(10),
  travel_departure_airport VARCHAR(10),
  travel_flight_number_arrival VARCHAR(20),
  travel_flight_number_departure VARCHAR(20),
  travel_special_requests TEXT,
  
  -- Dietary & Special Requirements
  dietary_restrictions JSONB DEFAULT '[]',
  accessibility_requirements TEXT,
  special_requests TEXT,
  
  -- Contact Preferences
  preferred_contact_method VARCHAR(20) DEFAULT 'email', -- email, phone, whatsapp
  language_preference VARCHAR(10) DEFAULT 'en',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_guests_event_id ON guests(event_id);
CREATE INDEX idx_guests_email ON guests(event_id, email);
CREATE INDEX idx_guests_rsvp_status ON guests(event_id, rsvp_status);
CREATE INDEX idx_guests_rsvp_token ON guests(rsvp_token);
```

#### Ceremonies & Venues
```sql
CREATE TABLE venues (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES wedding_events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  capacity INTEGER,
  contact_person VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  amenities JSONB DEFAULT '[]',
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ceremonies (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES wedding_events(id) ON DELETE CASCADE,
  venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- mehendi, sangam, wedding, reception, etc.
  ceremony_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  dress_code VARCHAR(100),
  special_instructions TEXT,
  max_capacity INTEGER,
  rsvp_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_venues_event_id ON venues(event_id);
CREATE INDEX idx_ceremonies_event_id ON ceremonies(event_id);
CREATE INDEX idx_ceremonies_date ON ceremonies(event_id, ceremony_date);
```

#### Hotels & Accommodations
```sql
CREATE TABLE hotels (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES wedding_events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  contact_person VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  booking_mode VARCHAR(20) DEFAULT 'block', -- block, direct
  booking_deadline DATE,
  special_rates BOOLEAN DEFAULT FALSE,
  amenities JSONB DEFAULT '[]',
  check_in_time TIME DEFAULT '15:00:00',
  check_out_time TIME DEFAULT '11:00:00',
  cancellation_policy TEXT,
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE room_types (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES wedding_events(id) ON DELETE CASCADE,
  hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  bed_type VARCHAR(50), -- single, double, king, queen, twin
  max_occupancy INTEGER NOT NULL DEFAULT 2,
  base_price DECIMAL(10,2),
  total_rooms INTEGER NOT NULL DEFAULT 0,
  rooms_blocked INTEGER DEFAULT 0,
  amenities JSONB DEFAULT '[]',
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE accommodations (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES wedding_events(id) ON DELETE CASCADE,
  guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  hotel_id INTEGER REFERENCES hotels(id) ON DELETE SET NULL,
  room_type_id INTEGER REFERENCES room_types(id) ON DELETE SET NULL,
  room_number VARCHAR(20),
  check_in_date DATE,
  check_out_date DATE,
  occupants JSONB DEFAULT '[]', -- guest names for the room
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled
  special_requests TEXT,
  auto_allocated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(event_id, guest_id)
);

-- Indexes
CREATE INDEX idx_hotels_event_id ON hotels(event_id);
CREATE INDEX idx_room_types_event_hotel ON room_types(event_id, hotel_id);
CREATE INDEX idx_accommodations_event_guest ON accommodations(event_id, guest_id);
CREATE INDEX idx_accommodations_hotel_room ON accommodations(hotel_id, room_type_id);
```

#### Transport & Travel Coordination
```sql
CREATE TABLE transport_vendors (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES wedding_events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- bus, car, taxi, shuttle, other
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  capacity INTEGER,
  price_per_trip DECIMAL(10,2),
  price_per_km DECIMAL(10,2),
  availability_notes TEXT,
  special_requirements TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE location_representatives (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES wedding_events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL, -- airport code or city name
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  languages JSONB DEFAULT '["English"]',
  availability_hours VARCHAR(100),
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE guest_travel_info (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES wedding_events(id) ON DELETE CASCADE,
  guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  
  -- Flight Information
  arrival_flight VARCHAR(20),
  arrival_date DATE,
  arrival_time TIME,
  arrival_airport VARCHAR(10),
  departure_flight VARCHAR(20),
  departure_date DATE,
  departure_time TIME,
  departure_airport VARCHAR(10),
  
  -- Transport Assignment
  transport_vendor_id INTEGER REFERENCES transport_vendors(id),
  transport_group VARCHAR(50),
  pickup_location VARCHAR(255),
  pickup_time TIME,
  
  -- Coordination
  representative_id INTEGER REFERENCES location_representatives(id),
  coordination_status VARCHAR(20) DEFAULT 'pending',
  special_assistance BOOLEAN DEFAULT FALSE,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(event_id, guest_id)
);

-- Indexes
CREATE INDEX idx_transport_vendors_event_id ON transport_vendors(event_id);
CREATE INDEX idx_location_reps_event_id ON location_representatives(event_id);
CREATE INDEX idx_guest_travel_event_guest ON guest_travel_info(event_id, guest_id);
CREATE INDEX idx_guest_travel_arrival ON guest_travel_info(arrival_date, arrival_airport);
```

#### Communication & Templates
```sql
CREATE TABLE email_templates (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES wedding_events(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- invitation, reminder, confirmation, etc.
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '{}', -- available template variables
  is_active BOOLEAN DEFAULT TRUE,
  template_type VARCHAR(20) DEFAULT 'email', -- email, whatsapp, sms
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE communication_logs (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES wedding_events(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,
  template_id INTEGER REFERENCES email_templates(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL, -- email, whatsapp, sms
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  content TEXT,
  status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, failed, bounced
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  error_message TEXT,
  external_id VARCHAR(255), -- provider-specific message ID
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_templates_event_category ON email_templates(event_id, category);
CREATE INDEX idx_comm_logs_event_guest ON communication_logs(event_id, guest_id);
CREATE INDEX idx_comm_logs_status ON communication_logs(status, sent_at);
```

## 🔧 Drizzle Schema Implementation

### Type-Safe Schema Definition
```typescript
// shared/schema.ts
import { 
  pgTable, serial, text, integer, timestamp, boolean, 
  date, time, decimal, jsonb, varchar, primaryKey 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Events table (master)
export const weddingEvents = pgTable('wedding_events', {
  id: serial('id').primaryKey(),
  coupleName1: varchar('couple_name_1', { length: 255 }).notNull(),
  coupleName2: varchar('couple_name_2', { length: 255 }).notNull(),
  weddingDate: date('wedding_date').notNull(),
  eventStyle: varchar('event_style', { length: 50 }).default('traditional'),
  estimatedGuests: integer('estimated_guests').default(100),
  status: varchar('status', { length: 20 }).default('draft'),
  wizardStep: integer('wizard_step').default(1),
  wizardCompleted: boolean('wizard_completed').default(false),
  
  // Transport settings
  transportMode: varchar('transport_mode', { length: 20 }).default('none'),
  flightAssistanceMode: varchar('flight_assistance_mode', { length: 30 }).default('none'),
  flightBufferHoursBefore: time('flight_buffer_hours_before').default('02:00:00'),
  flightBufferHoursAfter: time('flight_buffer_hours_after').default('01:00:00'),
  collectFlightInfo: boolean('collect_flight_info').default(false),
  flightEmailConfirmations: boolean('flight_email_confirmations').default(false),
  guestTravelInstructions: text('guest_travel_instructions'),
  
  // Communication settings
  emailProvider: varchar('email_provider', { length: 20 }),
  smtpHost: varchar('smtp_host', { length: 255 }),
  smtpPort: integer('smtp_port'),
  smtpUsername: varchar('smtp_username', { length: 255 }),
  smtpPassword: varchar('smtp_password', { length: 255 }),
  sendgridApiKey: varchar('sendgrid_api_key', { length: 255 }),
  
  // OAuth credentials
  gmailClientId: varchar('gmail_client_id', { length: 255 }),
  gmailClientSecret: varchar('gmail_client_secret', { length: 255 }),
  gmailRefreshToken: text('gmail_refresh_token'),
  gmailAccessToken: text('gmail_access_token'),
  gmailTokenExpiry: timestamp('gmail_token_expiry'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Guests table with comprehensive fields
export const guests = pgTable('guests', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => weddingEvents.id, {
    onDelete: 'cascade',
  }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  category: varchar('category', { length: 50 }).default('friends'),
  relationshipToCouple: varchar('relationship_to_couple', { length: 100 }),
  
  // RSVP fields
  rsvpStatus: varchar('rsvp_status', { length: 20 }).default('pending'),
  rsvpToken: varchar('rsvp_token', { length: 255 }),
  rsvpSubmittedAt: timestamp('rsvp_submitted_at'),
  rsvpStage: integer('rsvp_stage').default(0),
  
  // Plus one
  plusOne: boolean('plus_one').default(false),
  plusOneName: varchar('plus_one_name', { length: 255 }),
  plusOneEmail: varchar('plus_one_email', { length: 255 }),
  
  // Ceremonies
  invitedCeremonies: jsonb('invited_ceremonies').default([]),
  attendingCeremonies: jsonb('attending_ceremonies').default([]),
  
  // Accommodation
  accommodationMode: varchar('accommodation_mode', { length: 20 }).default('not-decided'),
  accommodationPreference: varchar('accommodation_preference', { length: 50 }),
  accommodationSpecialRequests: text('accommodation_special_requests'),
  
  // Travel
  travelMode: varchar('travel_mode', { length: 20 }),
  travelArrivalDate: date('travel_arrival_date'),
  travelDepartureDate: date('travel_departure_date'),
  travelArrivalAirport: varchar('travel_arrival_airport', { length: 10 }),
  travelDepartureAirport: varchar('travel_departure_airport', { length: 10 }),
  
  // Special requirements
  dietaryRestrictions: jsonb('dietary_restrictions').default([]),
  accessibilityRequirements: text('accessibility_requirements'),
  specialRequests: text('special_requests'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const eventsRelations = relations(weddingEvents, ({ many }) => ({
  guests: many(guests),
  venues: many(venues),
  ceremonies: many(ceremonies),
  hotels: many(hotels),
  accommodations: many(accommodations),
  transportVendors: many(transportVendors),
  emailTemplates: many(emailTemplates),
}));

export const guestsRelations = relations(guests, ({ one, many }) => ({
  event: one(weddingEvents, {
    fields: [guests.eventId],
    references: [weddingEvents.id],
  }),
  accommodation: one(accommodations),
  travelInfo: one(guestTravelInfo),
  communicationLogs: many(communicationLogs),
}));
```

### Type Generation
```typescript
// Auto-generated types from schema
export type WeddingEvent = typeof weddingEvents.$inferSelect;
export type NewWeddingEvent = typeof weddingEvents.$inferInsert;

export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;

// Zod schemas for validation
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const insertGuestSchema = createInsertSchema(guests, {
  email: z.string().email(),
  phone: z.string().optional(),
  name: z.string().min(1).max(255),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateGuestSchema = insertGuestSchema.partial();
export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type UpdateGuest = z.infer<typeof updateGuestSchema>;
```

## 🔄 Migration Management

### Schema Evolution
```bash
# Push changes to development database
npm run db:push

# Generate migration files for production
npm run db:generate

# Apply migrations
npm run db:migrate
```

### Migration Scripts
```typescript
// scripts/migrate-accommodation-schema.ts
import { db } from '../server/db';
import { accommodations, roomTypes } from '../shared/schema';

export async function migrateAccommodationSchema() {
  console.log('Starting accommodation schema migration...');
  
  // Add new columns
  await db.execute(sql`
    ALTER TABLE accommodations 
    ADD COLUMN IF NOT EXISTS auto_allocated BOOLEAN DEFAULT FALSE
  `);
  
  // Update existing data
  await db.update(accommodations)
    .set({ autoAllocated: false })
    .where(isNull(accommodations.autoAllocated));
  
  console.log('Accommodation schema migration completed.');
}
```

## 🔍 Query Patterns & Performance

### Common Query Patterns
```typescript
// Event-scoped guest queries
export const getEventGuests = async (eventId: number) => {
  return db.select()
    .from(guests)
    .where(eq(guests.eventId, eventId))
    .orderBy(guests.name);
};

// Complex joins with event scoping
export const getGuestAccommodationSummary = async (eventId: number) => {
  return db.select({
    guest: guests,
    accommodation: accommodations,
    hotel: hotels,
    roomType: roomTypes,
  })
  .from(guests)
  .leftJoin(accommodations, eq(guests.id, accommodations.guestId))
  .leftJoin(hotels, eq(accommodations.hotelId, hotels.id))
  .leftJoin(roomTypes, eq(accommodations.roomTypeId, roomTypes.id))
  .where(eq(guests.eventId, eventId));
};

// Aggregate queries
export const getEventStatistics = async (eventId: number) => {
  const [stats] = await db.select({
    totalGuests: count(guests.id),
    confirmedGuests: count(
      sql`CASE WHEN ${guests.rsvpStatus} = 'confirmed' THEN 1 END`
    ),
    pendingGuests: count(
      sql`CASE WHEN ${guests.rsvpStatus} = 'pending' THEN 1 END`
    ),
  })
  .from(guests)
  .where(eq(guests.eventId, eventId));
  
  return stats;
};
```

### Performance Optimization
```sql
-- Essential indexes for performance
CREATE INDEX CONCURRENTLY idx_guests_event_rsvp 
ON guests(event_id, rsvp_status) 
WHERE rsvp_status != 'declined';

CREATE INDEX CONCURRENTLY idx_accommodations_allocation 
ON accommodations(event_id, hotel_id, room_type_id) 
WHERE status = 'confirmed';

CREATE INDEX CONCURRENTLY idx_communication_logs_recent 
ON communication_logs(event_id, sent_at DESC) 
WHERE sent_at > NOW() - INTERVAL '30 days';

-- Partial indexes for common filters
CREATE INDEX CONCURRENTLY idx_guests_confirmed_travel 
ON guests(event_id, travel_mode) 
WHERE rsvp_status = 'confirmed' AND travel_mode IS NOT NULL;
```

## 🔒 Data Security & Constraints

### Referential Integrity
```sql
-- Ensure data consistency with foreign key constraints
ALTER TABLE guests 
ADD CONSTRAINT fk_guests_event 
FOREIGN KEY (event_id) REFERENCES wedding_events(id) 
ON DELETE CASCADE;

-- Prevent orphaned accommodations
ALTER TABLE accommodations 
ADD CONSTRAINT fk_accommodations_guest 
FOREIGN KEY (guest_id) REFERENCES guests(id) 
ON DELETE CASCADE;

-- Validate enum values
ALTER TABLE guests 
ADD CONSTRAINT chk_rsvp_status 
CHECK (rsvp_status IN ('pending', 'confirmed', 'declined'));

ALTER TABLE guests 
ADD CONSTRAINT chk_accommodation_mode 
CHECK (accommodation_mode IN ('provided', 'self', 'not-needed', 'not-decided'));
```

### Data Validation Rules
```sql
-- Email format validation
ALTER TABLE guests 
ADD CONSTRAINT chk_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Phone number validation (international format)
ALTER TABLE guests 
ADD CONSTRAINT chk_phone_format 
CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$');

-- Date logical constraints
ALTER TABLE guests 
ADD CONSTRAINT chk_travel_dates 
CHECK (travel_departure_date IS NULL OR travel_arrival_date IS NULL 
       OR travel_departure_date >= travel_arrival_date);

-- Positive capacity constraints
ALTER TABLE venues 
ADD CONSTRAINT chk_positive_capacity 
CHECK (capacity > 0);

ALTER TABLE room_types 
ADD CONSTRAINT chk_positive_occupancy 
CHECK (max_occupancy > 0 AND total_rooms >= 0);
```