# API Documentation

## Overview

The Wedding RSVP Platform provides a comprehensive RESTful API built with Express.js and TypeScript. All endpoints follow modern API conventions with proper authentication, validation, and error handling.

## 🔐 Authentication

### Session-Based Authentication
All API endpoints require authentication except public RSVP endpoints. Authentication is handled through secure sessions stored in PostgreSQL.

**Login Endpoint**:
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Response**:
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrator",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Logout Endpoint**:
```http
POST /api/auth/logout
```

**Authentication Check**:
```http
GET /api/auth/user
```

## 🔄 Multi-Tenant Context

### Current Event Management
All API operations are scoped to the current event in the user's session.

**Get Current Event**:
```http
GET /api/current-event
```

**Set Current Event**:
```http
POST /api/current-event
Content-Type: application/json

{
  "eventId": 1
}
```

## 📊 Core API Endpoints

### Events Management

#### List Events
```http
GET /api/events
```

**Response**:
```json
[
  {
    "id": 1,
    "coupleName1": "Priya",
    "coupleName2": "Rahul",
    "weddingDate": "2025-12-15",
    "eventStyle": "traditional",
    "estimatedGuests": 250,
    "status": "active",
    "wizardCompleted": true
  }
]
```

#### Create Event
```http
POST /api/events
Content-Type: application/json

{
  "coupleName1": "string",
  "coupleName2": "string", 
  "weddingDate": "YYYY-MM-DD",
  "eventStyle": "traditional|modern|fusion",
  "estimatedGuests": 250
}
```

#### Update Event
```http
PUT /api/events/:id
Content-Type: application/json

{
  "coupleName1": "string",
  "coupleName2": "string",
  "weddingDate": "YYYY-MM-DD"
}
```

#### Delete Event
```http
DELETE /api/events/:id
```

### Guest Management

#### List Guests
```http
GET /api/events/:eventId/guests
```

**Query Parameters**:
- `search` - Filter by name or email
- `status` - Filter by RSVP status
- `ceremony` - Filter by ceremony attendance

**Response**:
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "rsvpStatus": "confirmed",
    "accommodationStatus": "provided",
    "travelMode": "flight",
    "dietaryRestrictions": ["vegetarian"],
    "plusOneDetails": {
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
]
```

#### Create Guest
```http
POST /api/events/:eventId/guests
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "phone": "string",
  "category": "family|friends|colleagues",
  "invitedCeremonies": ["mehendi", "wedding", "reception"]
}
```

#### Update Guest
```http
PUT /api/events/:eventId/guests/:guestId
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "phone": "string",
  "rsvpStatus": "pending|confirmed|declined"
}
```

#### Bulk Import Guests
```http
POST /api/events/:eventId/guests/import
Content-Type: multipart/form-data

file: guests.xlsx
```

### RSVP System

#### Get RSVP Form
```http
GET /api/rsvp/:token
```

**Response**:
```json
{
  "guest": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "event": {
    "coupleName1": "Priya",
    "coupleName2": "Rahul",
    "weddingDate": "2025-12-15"
  },
  "ceremonies": [
    {
      "id": 1,
      "name": "Mehendi",
      "date": "2025-12-13",
      "venue": "Garden Palace"
    }
  ]
}
```

#### Submit RSVP (Stage 1)
```http
POST /api/rsvp/:token/stage1
Content-Type: application/json

{
  "attending": true,
  "ceremonies": [1, 2, 3],
  "plusOne": true,
  "plusOneDetails": {
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

#### Submit RSVP (Stage 2)
```http
POST /api/rsvp/:token/stage2
Content-Type: application/json

{
  "accommodationMode": "provided|self|not-needed",
  "accommodationPreferences": {
    "roomType": "single|double|suite",
    "specialRequests": "string"
  },
  "travelMode": "flight|train|car|other",
  "travelDetails": {
    "arrivalDate": "YYYY-MM-DD",
    "departureDate": "YYYY-MM-DD",
    "airport": "string"
  },
  "dietaryRestrictions": ["vegetarian", "vegan", "gluten-free"],
  "specialRequests": "string"
}
```

### Accommodation Management

#### List Hotels
```http
GET /api/events/:eventId/hotels
```

**Response**:
```json
[
  {
    "id": 1,
    "name": "Grand Palace Hotel",
    "address": "123 Wedding Street",
    "contactInfo": "+1234567890",
    "amenities": ["wifi", "parking", "gym"],
    "roomTypes": [
      {
        "id": 1,
        "name": "Deluxe Room",
        "capacity": 2,
        "pricePerNight": 150,
        "totalRooms": 20,
        "availableRooms": 15
      }
    ]
  }
]
```

#### Create Hotel
```http
POST /api/events/:eventId/hotels
Content-Type: application/json

{
  "name": "string",
  "address": "string",
  "contactInfo": "string",
  "amenities": ["string"]
}
```

#### Add Room Type
```http
POST /api/events/:eventId/hotels/:hotelId/room-types
Content-Type: application/json

{
  "name": "string",
  "capacity": 2,
  "pricePerNight": 150,
  "totalRooms": 20
}
```

#### Get Accommodations
```http
GET /api/events/:eventId/accommodations
```

### Transport Management

#### Get Transport Configuration
```http
GET /api/events/:eventId/transport
```

**Response**:
```json
{
  "transportMode": "selected|guest-managed|hybrid",
  "flightAssistanceMode": "none|guidance|list-collection|full-coordination",
  "providers": [
    {
      "id": 1,
      "name": "City Transport Services",
      "type": "bus|car|taxi",
      "contactInfo": "+1234567890"
    }
  ],
  "flightSettings": {
    "bufferHoursBefore": "02:00",
    "bufferHoursAfter": "01:00",
    "collectFlightInfo": true,
    "emailConfirmations": true
  }
}
```

#### Update Transport Settings
```http
PUT /api/events/:eventId/transport
Content-Type: application/json

{
  "transportMode": "selected",
  "flightAssistanceMode": "list-collection",
  "flightSettings": {
    "bufferHoursBefore": "02:00",
    "bufferHoursAfter": "01:00"
  }
}
```

#### Manage Transport Vendors
```http
POST /api/events/:eventId/transport/vendors
Content-Type: application/json

{
  "name": "string",
  "type": "bus|car|taxi|other",
  "contactPerson": "string",
  "phone": "string",
  "email": "string",
  "capacity": 50,
  "pricePerTrip": 500
}
```

### Communication System

#### Get Communication Settings
```http
GET /api/events/:eventId/communication
```

**Response**:
```json
{
  "emailProvider": "gmail|outlook|smtp|sendgrid",
  "emailSettings": {
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "username": "event@example.com"
  },
  "whatsappEnabled": true,
  "whatsappSettings": {
    "businessApiKey": "string",
    "phoneNumber": "+1234567890"
  },
  "templates": [
    {
      "id": 1,
      "category": "rsvp-invitation",
      "name": "Formal RSVP Invitation",
      "subject": "Your presence is requested",
      "content": "Dear {{guest_name}}..."
    }
  ]
}
```

#### Update Communication Settings
```http
PUT /api/events/:eventId/communication
Content-Type: application/json

{
  "emailProvider": "gmail",
  "emailSettings": {
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587
  }
}
```

#### Send Communications
```http
POST /api/events/:eventId/communication/send
Content-Type: application/json

{
  "templateId": 1,
  "recipients": [1, 2, 3],
  "channels": ["email", "whatsapp"],
  "variables": {
    "couple_names": "Priya & Rahul",
    "wedding_date": "December 15, 2025"
  }
}
```

## 📋 Data Schemas

### Event Schema
```typescript
interface WeddingEvent {
  id: number;
  coupleName1: string;
  coupleName2: string;
  weddingDate: string;
  eventStyle: 'traditional' | 'modern' | 'fusion';
  estimatedGuests: number;
  status: 'draft' | 'active' | 'completed';
  wizardStep: number;
  wizardCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Guest Schema
```typescript
interface Guest {
  id: number;
  eventId: number;
  name: string;
  email: string;
  phone?: string;
  category: 'family' | 'friends' | 'colleagues';
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
  rsvpToken?: string;
  accommodationStatus: 'provided' | 'self' | 'not-needed';
  travelMode?: 'flight' | 'train' | 'car' | 'other';
  dietaryRestrictions: string[];
  specialRequests?: string;
  plusOne: boolean;
  plusOneDetails?: {
    name: string;
    email: string;
  };
}
```

## ⚠️ Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

### Common Error Codes
- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_REQUIRED` - User not authenticated
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `DUPLICATE_RESOURCE` - Resource already exists
- `EVENT_CONTEXT_REQUIRED` - No current event selected

## 🔒 Security Considerations

### Request Validation
- All inputs validated using Zod schemas
- SQL injection prevention through ORM parameter binding
- XSS protection with input sanitization
- CSRF protection for state-changing operations

### Authentication & Authorization
- Session-based authentication with secure cookies
- Role-based access control (admin, staff, couple)
- Event-scoped data access with automatic filtering
- Token-based RSVP access with HMAC verification

### Rate Limiting
- API endpoints protected against abuse
- Progressive rate limiting based on user role
- Special handling for public RSVP endpoints
- Monitoring and alerting for suspicious activity