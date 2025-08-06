# Wedding RSVP Application Data Dictionary

## Introduction
This data dictionary defines every data entity, field, relationship, format, and validation rule within the Wedding RSVP application. It serves as the definitive reference for both developers and stakeholders to ensure consistent data handling across the system.

## Table of Contents
1. [Entity Relationship Diagram](#entity-relationship-diagram)
2. [Core Entities](#core-entities)
3. [Supporting Entities](#supporting-entities)
4. [Relationship Entities](#relationship-entities)
5. [Enumeration Values](#enumeration-values)
6. [Data Validation Rules](#data-validation-rules)
7. [Implementation Status](#implementation-status)

## Entity Relationship Diagram
```
+------------+       +------------+      +--------------+
|   users    |------>|   events   |----->|  ceremonies  |
+------------+       +------------+      +--------------+
      |                    |                    |
      |                    |                    |
      v                    v                    v
+------------+       +------------+      +--------------+
|user_events |       |   guests   |----->|guest_ceremony|
+------------+       +------------+      +--------------+
                          |  |                  |
                          |  |                  |
                          |  v                  v
                          | +------------+    +--------------+
                          | |travel_info |    |meal_selection|
                          | +------------+    +--------------+
                          |
                          v
                    +------------+
                    |   hotels   |<---+
                    +------------+    |
                          |           |
                          v           |
                    +------------+    |
                    |guest_hotels|----+
                    +------------+
```

## Core Entities

### users
Represents system users who can log in to the application.

| Field             | Type         | Required | Default | Description                                   | Validation Rules                                |
|-------------------|--------------|----------|---------|-----------------------------------------------|------------------------------------------------|
| id                | INTEGER      | Yes      | Auto    | Primary key                                   | Auto-increment                                  |
| username          | VARCHAR(50)  | Yes      | -       | Unique username for login                     | Alphanumeric, 3-50 chars, unique               |
| password          | VARCHAR(255) | Yes      | -       | Hashed password                               | Min 8 chars (before hashing)                    |
| name              | VARCHAR(100) | Yes      | -       | Full name                                     | 2-100 chars                                     |
| email             | VARCHAR(100) | Yes      | -       | Email address                                 | Valid email format, unique                      |
| role              | VARCHAR(20)  | Yes      | 'user'  | User role (admin, planner, user)              | One of enum values                              |
| createdAt         | TIMESTAMP    | Yes      | Now     | Account creation timestamp                    | Valid timestamp                                 |
| lastLogin         | TIMESTAMP    | No       | NULL    | Last successful login                         | Valid timestamp                                 |
| resetToken        | VARCHAR(255) | No       | NULL    | Password reset token                          | NULL or valid token                             |
| resetTokenExpiry  | TIMESTAMP    | No       | NULL    | Expiration time for reset token               | NULL or valid future timestamp                  |
| active            | BOOLEAN      | Yes      | true    | Whether the user account is active            | true/false                                      |

### events
Represents wedding events managed in the system.

| Field             | Type         | Required | Default | Description                                   | Validation Rules                                |
|-------------------|--------------|----------|---------|-----------------------------------------------|------------------------------------------------|
| id                | INTEGER      | Yes      | Auto    | Primary key                                   | Auto-increment                                  |
| title             | VARCHAR(100) | Yes      | -       | Event title                                   | 2-100 chars                                     |
| coupleNames       | VARCHAR(200) | Yes      | -       | Names of the wedding couple                   | 2-200 chars                                     |
| startDate         | DATE         | Yes      | -       | Event start date                              | Valid date, not in past                         |
| endDate           | DATE         | Yes      | -       | Event end date                                | Valid date, after or equal to startDate         |
| location          | VARCHAR(200) | Yes      | -       | Primary event location                        | 2-200 chars                                     |
| description       | TEXT         | No       | NULL    | Event description                             | Max 5000 chars                                  |
| timezone          | VARCHAR(50)  | Yes      | 'UTC'   | Event timezone                                | Valid timezone identifier                       |
| status            | VARCHAR(20)  | Yes      | 'active'| Event status                                  | One of: 'draft', 'active', 'completed', 'cancelled' |
| rsvpDeadline      | DATE         | No       | NULL    | RSVP deadline date                            | NULL or valid date before startDate             |
| createdBy         | INTEGER      | Yes      | -       | User ID who created the event                 | Foreign key to users.id                         |
| createdAt         | TIMESTAMP    | Yes      | Now     | Creation timestamp                            | Valid timestamp                                 |
| updatedAt         | TIMESTAMP    | Yes      | Now     | Last update timestamp                         | Valid timestamp                                 |
| primaryColor      | VARCHAR(7)   | No       | '#D4AF37'| Primary theme color                          | Valid hex color code                            |
| secondaryColor    | VARCHAR(7)   | No       | '#800020'| Secondary theme color                        | Valid hex color code                            |
| bannerImage       | VARCHAR(255) | No       | NULL    | URL to event banner image                     | NULL or valid URL                               |
| logoImage         | VARCHAR(255) | No       | NULL    | URL to event logo image                       | NULL or valid URL                               |

### guests
Represents wedding guests.

| Field                | Type         | Required | Default | Description                                 | Validation Rules                               |
|----------------------|--------------|----------|---------|---------------------------------------------|-----------------------------------------------|
| id                   | INTEGER      | Yes      | Auto    | Primary key                                 | Auto-increment                                |
| eventId              | INTEGER      | Yes      | -       | Event this guest belongs to                 | Foreign key to events.id                      |
| firstName            | VARCHAR(50)  | Yes      | -       | Guest's first name                          | 1-50 chars                                    |
| lastName             | VARCHAR(50)  | Yes      | -       | Guest's last name                           | 1-50 chars                                    |
| email                | VARCHAR(100) | No       | NULL    | Guest's email address                       | NULL or valid email format                    |
| phone                | VARCHAR(20)  | No       | NULL    | Guest's phone number                        | NULL or valid phone format                    |
| address              | TEXT         | No       | NULL    | Guest's address                             | NULL or max 500 chars                         |
| side                 | VARCHAR(10)  | No       | NULL    | Which side guest belongs to (bride/groom)   | NULL or one of: 'bride', 'groom', 'both'     |
| relationship         | VARCHAR(50)  | No       | NULL    | Relationship to couple                      | NULL or 1-50 chars                           |
| groupName            | VARCHAR(50)  | No       | NULL    | Guest grouping                              | NULL or 1-50 chars                           |
| plusOneAllowed       | BOOLEAN      | Yes      | false   | Whether guest can bring a plus one          | true/false                                    |
| plusOneConfirmed     | BOOLEAN      | No       | NULL    | Whether plus one is confirmed               | NULL, true, or false                          |
| plusOneName          | VARCHAR(100) | No       | NULL    | Name of plus one                            | NULL or 1-100 chars                          |
| plusOneEmail         | VARCHAR(100) | No       | NULL    | Email of plus one                           | NULL or valid email format                    |
| plusOnePhone         | VARCHAR(20)  | No       | NULL    | Phone of plus one                           | NULL or valid phone format                    |
| plusOneGender        | VARCHAR(10)  | No       | NULL    | Gender of plus one                          | NULL or one of: 'male', 'female', 'other'    |
| rsvpStatus           | VARCHAR(20)  | Yes      | 'pending'| RSVP status                                | One of: 'pending', 'confirmed', 'declined'   |
| rsvpDate             | DATE         | No       | NULL    | Date RSVP was submitted                     | NULL or valid date                            |
| isLocalGuest         | BOOLEAN      | No       | NULL    | Whether guest is local to venue             | NULL, true, or false                          |
| dietaryRestrictions  | TEXT         | No       | NULL    | Dietary restrictions                        | NULL or max 500 chars                         |
| allergies            | TEXT         | No       | NULL    | Food allergies                              | NULL or max 500 chars                         |
| isVIP                | BOOLEAN      | Yes      | false   | Whether guest is VIP                        | true/false                                    |
| numberOfChildren     | INTEGER      | No       | 0       | Number of children                          | Non-negative integer                          |
| childrenDetails      | TEXT         | No       | NULL    | JSON with children details                  | NULL or valid JSON                            |
| needsAccommodation   | BOOLEAN      | No       | NULL    | Whether guest needs accommodation           | NULL, true, or false                          |
| accommodationPreference | VARCHAR(50) | No     | NULL    | Preferred accommodation type                | NULL or 1-50 chars                           |
| notes                | TEXT         | No       | NULL    | Additional notes about guest                | NULL or max 1000 chars                        |
| createdAt            | TIMESTAMP    | Yes      | Now     | Creation timestamp                          | Valid timestamp                               |
| updatedAt            | TIMESTAMP    | Yes      | Now     | Last update timestamp                       | Valid timestamp                               |

### ceremonies
Represents individual ceremonies within a wedding event.

| Field             | Type         | Required | Default | Description                                   | Validation Rules                               |
|-------------------|--------------|----------|---------|-----------------------------------------------|-----------------------------------------------|
| id                | INTEGER      | Yes      | Auto    | Primary key                                   | Auto-increment                                |
| eventId           | INTEGER      | Yes      | -       | Event this ceremony belongs to                | Foreign key to events.id                      |
| name              | VARCHAR(100) | Yes      | -       | Ceremony name                                 | 1-100 chars                                   |
| date              | DATE         | Yes      | -       | Ceremony date                                 | Valid date                                    |
| startTime         | TIME         | Yes      | -       | Start time                                    | Valid time                                    |
| endTime           | TIME         | Yes      | -       | End time                                      | Valid time, after startTime                   |
| location          | VARCHAR(200) | Yes      | -       | Ceremony location                             | 1-200 chars                                   |
| description       | TEXT         | No       | NULL    | Ceremony description                          | NULL or max 5000 chars                        |
| attireCode        | VARCHAR(50)  | No       | NULL    | Dress code                                    | NULL or 1-50 chars                           |
| maxCapacity       | INTEGER      | No       | NULL    | Maximum guest capacity                        | NULL or positive integer                      |
| ceremonyType      | VARCHAR(50)  | No       | NULL    | Type of ceremony                              | NULL or one of predefined types               |
| hasMealService    | BOOLEAN      | Yes      | false   | Whether ceremony includes meal                | true/false                                    |
| createdAt         | TIMESTAMP    | Yes      | Now     | Creation timestamp                            | Valid timestamp                               |
| updatedAt         | TIMESTAMP    | Yes      | Now     | Last update timestamp                         | Valid timestamp                               |

## Supporting Entities

### hotels
Represents hotels available for guest accommodation.

| Field                   | Type         | Required | Default | Description                               | Validation Rules                              |
|-------------------------|--------------|----------|---------|-------------------------------------------|----------------------------------------------|
| id                      | INTEGER      | Yes      | Auto    | Primary key                               | Auto-increment                               |
| eventId                 | INTEGER      | Yes      | -       | Event this hotel is associated with       | Foreign key to events.id                     |
| name                    | VARCHAR(100) | Yes      | -       | Hotel name                                | 1-100 chars                                  |
| address                 | VARCHAR(200) | Yes      | -       | Hotel address                             | 1-200 chars                                  |
| phone                   | VARCHAR(20)  | No       | NULL    | Hotel contact number                      | NULL or valid phone format                   |
| website                 | VARCHAR(200) | No       | NULL    | Hotel website URL                         | NULL or valid URL                            |
| contactPerson           | VARCHAR(100) | No       | NULL    | Contact person at hotel                   | NULL or 1-100 chars                          |
| checkInTime             | TIME         | No       | NULL    | Standard check-in time                    | NULL or valid time                           |
| checkOutTime            | TIME         | No       | NULL    | Standard check-out time                   | NULL or valid time                           |
| distanceFromVenue       | DECIMAL(5,2) | No       | NULL    | Distance from main venue (km)             | NULL or positive number                      |
| specialRate             | DECIMAL(10,2)| No       | NULL    | Negotiated room rate                      | NULL or positive number                      |
| currency                | VARCHAR(3)   | No       | 'INR'   | Currency for rates                        | Valid 3-letter currency code                 |
| bookingInstructions     | TEXT         | No       | NULL    | Instructions for booking                  | NULL or max 1000 chars                       |
| amenities               | TEXT         | No       | NULL    | JSON array of available amenities         | NULL or valid JSON                           |
| starRating              | INTEGER      | No       | NULL    | Hotel star rating (1-5)                   | NULL or integer between 1-5                  |
| totalRoomsAvailable     | INTEGER      | No       | NULL    | Total rooms blocked for event             | NULL or non-negative integer                 |
| roomsBooked             | INTEGER      | No       | 0       | Number of rooms already booked            | Non-negative integer                         |
| specialNotes            | TEXT         | No       | NULL    | Special notes about hotel                 | NULL or max 1000 chars                       |
| createdAt               | TIMESTAMP    | Yes      | Now     | Creation timestamp                        | Valid timestamp                              |
| updatedAt               | TIMESTAMP    | Yes      | Now     | Last update timestamp                     | Valid timestamp                              |

### meal_options
Represents meal options available at ceremonies.

| Field             | Type         | Required | Default | Description                                   | Validation Rules                                |
|-------------------|--------------|----------|---------|-----------------------------------------------|------------------------------------------------|
| id                | INTEGER      | Yes      | Auto    | Primary key                                   | Auto-increment                                  |
| ceremonyId        | INTEGER      | Yes      | -       | Ceremony this meal is for                     | Foreign key to ceremonies.id                    |
| name              | VARCHAR(100) | Yes      | -       | Meal option name                              | 1-100 chars                                     |
| description       | TEXT         | No       | NULL    | Meal description                              | NULL or max 500 chars                           |
| type              | VARCHAR(20)  | Yes      | -       | Meal type                                     | One of: 'vegetarian', 'non-vegetarian', 'vegan', 'gluten-free', etc. |
| allergens         | TEXT         | No       | NULL    | JSON array of allergens                       | NULL or valid JSON                              |
| imageUrl          | VARCHAR(255) | No       | NULL    | URL to meal image                             | NULL or valid URL                               |
| maxServings       | INTEGER      | No       | NULL    | Maximum available servings                    | NULL or positive integer                        |
| specialNotes      | TEXT         | No       | NULL    | Special notes about meal option               | NULL or max 500 chars                           |
| createdAt         | TIMESTAMP    | Yes      | Now     | Creation timestamp                            | Valid timestamp                                 |
| updatedAt         | TIMESTAMP    | Yes      | Now     | Last update timestamp                         | Valid timestamp                                 |

### travel_info
Stores guest travel information for transportation planning.

| Field                | Type         | Required | Default | Description                                 | Validation Rules                               |
|----------------------|--------------|----------|---------|---------------------------------------------|-----------------------------------------------|
| id                   | INTEGER      | Yes      | Auto    | Primary key                                 | Auto-increment                                |
| guestId              | INTEGER      | Yes      | -       | Guest this travel info belongs to           | Foreign key to guests.id                      |
| needsTransportation  | BOOLEAN      | Yes      | false   | Whether guest needs transportation          | true/false                                    |
| transportationType   | VARCHAR(50)  | No       | NULL    | Type of transportation needed               | NULL or one of predefined types               |
| travelMode           | VARCHAR(20)  | No       | NULL    | Mode of travel to venue city                | NULL or one of: 'air', 'train', 'car', 'other'|
| arrivalDate          | DATE         | No       | NULL    | Arrival date                                | NULL or valid date                            |
| arrivalTime          | TIME         | No       | NULL    | Arrival time                                | NULL or valid time                            |
| arrivalLocation      | VARCHAR(200) | No       | NULL    | Arrival location (airport, station)         | NULL or 1-200 chars                          |
| departureDate        | DATE         | No       | NULL    | Departure date                              | NULL or valid date                            |
| departureTime        | TIME         | No       | NULL    | Departure time                              | NULL or valid time                            |
| departureLocation    | VARCHAR(200) | No       | NULL    | Departure location                          | NULL or 1-200 chars                          |
| flightNumber         | VARCHAR(20)  | No       | NULL    | Flight number                               | NULL or valid flight number format            |
| trainNumber          | VARCHAR(20)  | No       | NULL    | Train number                                | NULL or 1-20 chars                           |
| transportationStatus | VARCHAR(20)  | Yes      | 'pending'| Status of transportation arrangement       | One of: 'pending', 'confirmed', 'cancelled'  |
| notes                | TEXT         | No       | NULL    | Additional notes                            | NULL or max 1000 chars                        |
| createdAt            | TIMESTAMP    | Yes      | Now     | Creation timestamp                          | Valid timestamp                               |
| updatedAt            | TIMESTAMP    | Yes      | Now     | Last update timestamp                       | Valid timestamp                               |

### messages
Stores messages sent to guests.

| Field             | Type         | Required | Default | Description                                   | Validation Rules                                |
|-------------------|--------------|----------|---------|-----------------------------------------------|------------------------------------------------|
| id                | INTEGER      | Yes      | Auto    | Primary key                                   | Auto-increment                                  |
| eventId           | INTEGER      | Yes      | -       | Event this message is for                     | Foreign key to events.id                        |
| messageType       | VARCHAR(20)  | Yes      | -       | Type of message                               | One of: 'email', 'whatsapp', 'sms'             |
| subject           | VARCHAR(200) | No       | NULL    | Message subject (for email)                   | NULL or 1-200 chars                            |
| content           | TEXT         | Yes      | -       | Message content                               | 1-5000 chars                                    |
| templateId        | VARCHAR(50)  | No       | NULL    | Template ID for platform messages             | NULL or valid template ID                       |
| sentBy            | INTEGER      | Yes      | -       | User who sent the message                     | Foreign key to users.id                         |
| sentAt            | TIMESTAMP    | Yes      | Now     | When message was sent                         | Valid timestamp                                 |
| targetSegment     | VARCHAR(50)  | No       | 'all'   | Target guest segment                          | One of: 'all', 'confirmed', 'declined', 'pending', 'custom' |
| includeRsvpLink   | BOOLEAN      | Yes      | false   | Whether RSVP links were included              | true/false                                      |
| includeEventDetails| BOOLEAN     | Yes      | false   | Whether event details were included           | true/false                                      |
| customFilter      | TEXT         | No       | NULL    | JSON of custom filter criteria                | NULL or valid JSON                              |
| status            | VARCHAR(20)  | Yes      | 'draft' | Message status                                | One of: 'draft', 'sent', 'scheduled', 'failed'  |
| scheduledFor      | TIMESTAMP    | No       | NULL    | When message is scheduled to send             | NULL or valid future timestamp                  |
| deliveryStats     | TEXT         | No       | NULL    | JSON with delivery statistics                 | NULL or valid JSON                              |

## Relationship Entities

### user_events
Links users to events they have access to with specific roles.

| Field             | Type         | Required | Default | Description                                   | Validation Rules                                |
|-------------------|--------------|----------|---------|-----------------------------------------------|------------------------------------------------|
| id                | INTEGER      | Yes      | Auto    | Primary key                                   | Auto-increment                                  |
| userId            | INTEGER      | Yes      | -       | User ID                                       | Foreign key to users.id                         |
| eventId           | INTEGER      | Yes      | -       | Event ID                                      | Foreign key to events.id                        |
| role              | VARCHAR(20)  | Yes      | 'viewer'| User's role for this event                    | One of: 'owner', 'admin', 'planner', 'viewer'   |
| createdAt         | TIMESTAMP    | Yes      | Now     | Assignment timestamp                          | Valid timestamp                                 |
| updatedAt         | TIMESTAMP    | Yes      | Now     | Last update timestamp                         | Valid timestamp                                 |

### guest_ceremony
Links guests to ceremonies they're attending.

| Field             | Type         | Required | Default | Description                                   | Validation Rules                                |
|-------------------|--------------|----------|---------|-----------------------------------------------|------------------------------------------------|
| id                | INTEGER      | Yes      | Auto    | Primary key                                   | Auto-increment                                  |
| guestId           | INTEGER      | Yes      | -       | Guest ID                                      | Foreign key to guests.id                        |
| ceremonyId        | INTEGER      | Yes      | -       | Ceremony ID                                   | Foreign key to ceremonies.id                    |
| attending         | BOOLEAN      | Yes      | false   | Whether guest is attending this ceremony      | true/false                                      |
| invitationSent    | BOOLEAN      | Yes      | false   | Whether invitation was sent                   | true/false                                      |
| invitationSentDate| DATE         | No       | NULL    | Date invitation was sent                      | NULL or valid date                              |
| notes             | TEXT         | No       | NULL    | Ceremony-specific notes for this guest        | NULL or max 500 chars                           |
| createdAt         | TIMESTAMP    | Yes      | Now     | Creation timestamp                            | Valid timestamp                                 |
| updatedAt         | TIMESTAMP    | Yes      | Now     | Last update timestamp                         | Valid timestamp                                 |

### guest_meal_selection
Stores meal selections made by guests for ceremonies.

| Field             | Type         | Required | Default | Description                                   | Validation Rules                                |
|-------------------|--------------|----------|---------|-----------------------------------------------|------------------------------------------------|
| id                | INTEGER      | Yes      | Auto    | Primary key                                   | Auto-increment                                  |
| guestId           | INTEGER      | Yes      | -       | Guest ID                                      | Foreign key to guests.id                        |
| ceremonyId        | INTEGER      | Yes      | -       | Ceremony ID                                   | Foreign key to ceremonies.id                    |
| mealOptionId      | INTEGER      | Yes      | -       | Selected meal option                          | Foreign key to meal_options.id                  |
| notes             | TEXT         | No       | NULL    | Special preparation notes                     | NULL or max 500 chars                           |
| specialRequest    | BOOLEAN      | Yes      | false   | Whether special request was made              | true/false                                      |
| createdAt         | TIMESTAMP    | Yes      | Now     | Creation timestamp                            | Valid timestamp                                 |
| updatedAt         | TIMESTAMP    | Yes      | Now     | Last update timestamp                         | Valid timestamp                                 |

### guest_hotels
Links guests to their hotel accommodations.

| Field             | Type         | Required | Default | Description                                   | Validation Rules                                |
|-------------------|--------------|----------|---------|-----------------------------------------------|------------------------------------------------|
| id                | INTEGER      | Yes      | Auto    | Primary key                                   | Auto-increment                                  |
| guestId           | INTEGER      | Yes      | -       | Guest ID                                      | Foreign key to guests.id                        |
| hotelId           | INTEGER      | Yes      | -       | Hotel ID                                      | Foreign key to hotels.id                        |
| roomType          | VARCHAR(50)  | No       | NULL    | Type of room                                  | NULL or 1-50 chars                             |
| roomNumber        | VARCHAR(20)  | No       | NULL    | Room number assigned                          | NULL or 1-20 chars                             |
| checkInDate       | DATE         | Yes      | -       | Check-in date                                 | Valid date                                      |
| checkOutDate      | DATE         | Yes      | -       | Check-out date                                | Valid date, after checkInDate                   |
| confirmationNumber| VARCHAR(50)  | No       | NULL    | Booking confirmation number                   | NULL or 1-50 chars                             |
| specialRequests   | TEXT         | No       | NULL    | Special room requests                         | NULL or max 500 chars                           |
| status            | VARCHAR(20)  | Yes      | 'pending'| Booking status                               | One of: 'pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled' |
| billingType       | VARCHAR(20)  | Yes      | 'guest' | Who pays for the room                         | One of: 'guest', 'host', 'split'               |
| notes             | TEXT         | No       | NULL    | Additional notes                              | NULL or max 1000 chars                          |
| createdAt         | TIMESTAMP    | Yes      | Now     | Creation timestamp                            | Valid timestamp                                 |
| updatedAt         | TIMESTAMP    | Yes      | Now     | Last update timestamp                         | Valid timestamp                                 |

### couple_messages
Stores messages from guests to the couple.

| Field             | Type         | Required | Default | Description                                   | Validation Rules                                |
|-------------------|--------------|----------|---------|-----------------------------------------------|------------------------------------------------|
| id                | INTEGER      | Yes      | Auto    | Primary key                                   | Auto-increment                                  |
| guestId           | INTEGER      | Yes      | -       | Guest who sent the message                    | Foreign key to guests.id                        |
| eventId           | INTEGER      | Yes      | -       | Event ID                                      | Foreign key to events.id                        |
| message           | TEXT         | Yes      | -       | Message content                               | 1-1000 chars                                    |
| sentAt            | TIMESTAMP    | Yes      | Now     | When message was sent                         | Valid timestamp                                 |
| isRead            | BOOLEAN      | Yes      | false   | Whether message has been read                 | true/false                                      |
| readAt            | TIMESTAMP    | No       | NULL    | When message was read                         | NULL or valid timestamp                         |
| createdAt         | TIMESTAMP    | Yes      | Now     | Creation timestamp                            | Valid timestamp                                 |

## Enumeration Values

### User Roles
- `admin`: System administrator with full access
- `planner`: Wedding planner with event management access
- `user`: Standard user with limited access

### Event Status
- `draft`: Event is in draft mode, not yet published
- `active`: Event is active and published
- `completed`: Event has already taken place
- `cancelled`: Event has been cancelled

### Guest Side
- `bride`: Guest from bride's side
- `groom`: Guest from groom's side
- `both`: Guest connected to both bride and groom

### RSVP Status
- `pending`: No response received yet
- `confirmed`: Guest has confirmed attendance
- `declined`: Guest has declined invitation

### Meal Types
- `vegetarian`: Vegetarian meal
- `non-vegetarian`: Non-vegetarian meal
- `vegan`: Vegan meal
- `gluten-free`: Gluten-free meal
- `dairy-free`: Dairy-free meal
- `nut-free`: Nut-free meal
- `kosher`: Kosher meal
- `halal`: Halal meal

### Travel Mode
- `air`: Arriving by airplane
- `train`: Arriving by train
- `car`: Arriving by car
- `bus`: Arriving by bus
- `other`: Other transportation method

### Transportation Type
- `airport-pickup`: Needs airport pickup
- `airport-dropoff`: Needs airport dropoff
- `venue-shuttle`: Needs transportation to/from venue
- `ceremony-shuttle`: Needs transportation between ceremonies
- `special`: Special transportation needs

### Message Types
- `email`: Email message
- `whatsapp`: WhatsApp message
- `sms`: SMS message

### Message Status
- `draft`: Message is in draft mode
- `scheduled`: Message is scheduled to be sent
- `sent`: Message has been sent
- `failed`: Message sending failed

### Billing Type
- `guest`: Guest pays for their accommodation
- `host`: Wedding couple/hosts pay for accommodation
- `split`: Cost is split between guest and hosts

## Data Validation Rules

### Validation Implementation

All validation rules are implemented using Zod schemas located in `shared/validation-schemas.ts`. This provides:

- Consistent validation between frontend and backend
- Type-safe schema definitions with TypeScript
- Reusable validation logic across the application
- Clear validation error messages

### Email Validation
- Must conform to RFC 5322 standard
- Maximum length: 100 characters
- Required format: `local-part@domain`
- Implemented with `z.string().email().max(100)`

### Phone Validation
- Accepts international formats with country code
- Allows for spaces, hyphens, and parentheses
- Minimum length: 7 characters
- Maximum length: 20 characters
- Implemented with custom regex validation

### Date Validation
- All dates validated using standardized date utilities
- Support for various input formats
- Consistent display format across the application
- Range validation for event dates, RSVP deadlines
- Implemented with date-fns and custom validators

### Password Requirements
- Minimum length: 8 characters
- Must include at least one uppercase letter
- Must include at least one lowercase letter
- Must include at least one number
- Must include at least one special character

### URL Validation
- Must be a valid URL format (RFC 3986)
- Must start with http:// or https://
- Maximum length: 255 characters

### Date Range Validations
- Event end date must be on or after event start date
- RSVP deadline must be before event start date
- Guest arrival date must be on or before first ceremony date
- Guest departure date must be on or after last ceremony date

### Text Length Constraints
- Short text fields (names, titles): 1-100 characters
- Medium text fields (descriptions): 1-500 characters
- Long text fields (notes): 1-1000 characters
- Very long text fields (content): 1-5000 characters

### Numeric Constraints
- Currency values must have max 2 decimal places
- Quantities must be non-negative integers
- Percentages must be between 0 and 100

## Implementation Status

### Current State (May 19, 2025)

The database implementation has progressed significantly, with the following status for each entity:

#### Core Entities
1. **users** - ✅ Fully Implemented
   - Complete authentication system with role-based access control
   - Session persistence improvements added May 19, 2025
   - Password reset functionality implemented

2. **events** - ✅ Fully Implemented
   - Complete CRUD operations
   - Multi-tenant isolation
   - OAuth credentials integration
   - Setup wizard progress tracking

3. **guests** - ✅ Fully Implemented
   - Complete guest management
   - RSVP functionality
   - Plus-one handling
   - Event context validation for security

4. **ceremonies** - ✅ Fully Implemented
   - Multiple ceremonies per event
   - Attendance tracking
   - Meal service configuration

#### Supporting Entities
1. **hotels** - 🔄 Partially Implemented
   - Basic hotel properties
   - Room type definitions
   - Need to implement room allocation algorithm

2. **transport_groups** - 🔄 Partially Implemented
   - Basic transport groups
   - Need to implement transport fleet model

3. **meals** - 🔄 Partially Implemented
   - Meal options definition
   - Dietary restriction tracking
   - Need to implement meal reporting

#### Relationship Entities
1. **guest_ceremonies** - ✅ Fully Implemented
   - Complete attendance tracking
   - Cross-validation with event context

2. **guest_hotels** - 🔄 Partially Implemented
   - Basic room assignment
   - Need to implement booking confirmation

3. **user_events** - ⏳ Pending Implementation
   - Currently using direct user-to-event relationships
   - Need to implement proper event assignment system for planners

### Recent Schema Updates (May 19, 2025)
1. Added session persistence improvements
2. Enhanced cookie settings for authentication
3. Updated events table with setup wizard progress fields
4. Prepared for event_assignments table (planned)
- Ratings must be between 1 and 5