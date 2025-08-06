# Transport & Travel API Documentation
*Updated July 15, 2025*

## Overview

Complete API reference for the Transport and Travel coordination modules, covering vendor management, group coordination, flight assistance, and airport representative systems.

## Authentication

All endpoints require authentication via session-based auth. Include session cookie in requests.

```http
Cookie: connect.sid=<session-id>
```

## Transport Module APIs

### Transport Vendors

#### Get All Transport Vendors
```http
GET /api/events/{eventId}/transport-vendors
```

**Response:**
```json
{
  "vendors": [
    {
      "id": 1,
      "eventId": 11,
      "companyName": "Royal Transport Services",
      "contactPerson": "Rajesh Kumar",
      "phone": "+91-9876543210",
      "email": "rajesh@royaltransport.com",
      "serviceTypes": ["bus", "car", "luxury"],
      "vehicleCapacities": "12, 25, 45 seater buses",
      "coverage": "Mumbai, Pune, Delhi",
      "specialServices": "AC vehicles, GPS tracking",
      "contractTerms": "Advance payment required",
      "emergencyContact": "+91-9876543211",
      "status": "active",
      "createdAt": "2025-07-15T10:00:00Z"
    }
  ]
}
```

#### Create Transport Vendor
```http
POST /api/events/{eventId}/transport-vendors
Content-Type: application/json

{
  "companyName": "Elite Transport Co",
  "contactPerson": "Priya Sharma",
  "phone": "+91-9123456789",
  "email": "priya@elitetransport.com",
  "serviceTypes": ["car", "luxury"],
  "vehicleCapacities": "4, 7 seater cars",
  "coverage": "Delhi NCR",
  "specialServices": "Premium vehicles, chauffeur service",
  "contractTerms": "50% advance, 50% on completion"
}
```

### Transport Groups

#### Get All Transport Groups
```http
GET /api/events/{eventId}/transport-groups
```

**Response:**
```json
{
  "groups": [
    {
      "id": 1,
      "eventId": 11,
      "groupName": "Group A - Airport to Hotel",
      "vehicleType": "bus",
      "capacity": 45,
      "assignedPassengers": 42,
      "departureTime": "14:00",
      "departureLocation": "Delhi Airport T3",
      "arrivalLocation": "Grand Palace Hotel",
      "driverInfo": {
        "name": "Suresh Singh",
        "phone": "+91-9876543212",
        "licenseNumber": "DL-1420110012345"
      },
      "vehicleInfo": {
        "registrationNumber": "DL-01-AB-1234",
        "model": "Volvo B7R",
        "features": ["AC", "GPS", "USB Charging"]
      },
      "passengers": [
        {
          "guestId": 123,
          "name": "Amit Patel",
          "phone": "+91-9876543213",
          "seatNumber": "A1"
        }
      ],
      "status": "scheduled",
      "notes": "Airport pickup - Terminal 3 arrival gate"
    }
  ]
}
```

#### Create Transport Group
```http
POST /api/events/{eventId}/transport-groups
Content-Type: application/json

{
  "groupName": "Group B - Hotel to Venue",
  "vehicleType": "car",
  "capacity": 7,
  "departureTime": "16:30",
  "departureLocation": "Grand Palace Hotel",
  "arrivalLocation": "Wedding Venue - Lotus Garden",
  "vendorId": 1,
  "specialRequirements": "Child seats required"
}
```

### Vehicle Management

#### Get Event Vehicles
```http
GET /api/events/{eventId}/vehicles
```

**Response:**
```json
{
  "vehicles": [
    {
      "id": 1,
      "eventId": 11,
      "vendorId": 1,
      "vehicleType": "bus",
      "registrationNumber": "DL-01-AB-1234",
      "model": "Volvo B7R",
      "capacity": 45,
      "features": ["AC", "GPS", "USB Charging", "WiFi"],
      "status": "available",
      "currentLocation": "Vendor Depot",
      "fuelLevel": 85,
      "maintenanceStatus": "good",
      "insuranceExpiry": "2025-12-31",
      "lastServiceDate": "2025-07-01"
    }
  ]
}
```

## Travel Module APIs

### Flight Coordination

#### Get Guest Travel Information
```http
GET /api/events/{eventId}/guest-travel
```

**Query Parameters:**
- `flightAssistance`: `true` | `false` - Filter by flight assistance requests
- `coordinationStatus`: `pending` | `confirmed` | `completed`

**Response:**
```json
{
  "guestTravel": [
    {
      "guestId": 123,
      "guest": {
        "name": "Amit Patel",
        "email": "amit@example.com",
        "phone": "+91-9876543213"
      },
      "travelMode": "air",
      "flightAssistanceNeeded": true,
      "arrivalDetails": {
        "date": "2025-12-13",
        "time": "14:30",
        "flightNumber": "AI-401",
        "airline": "Air India",
        "from": "Mumbai",
        "terminal": "T3"
      },
      "departureDetails": {
        "date": "2025-12-16",
        "time": "18:45",
        "flightNumber": "AI-404",
        "airline": "Air India",
        "to": "Mumbai",
        "terminal": "T3"
      },
      "coordinationStatus": "pending",
      "airportRepId": null,
      "pickupArrangements": null,
      "specialRequirements": "Wheelchair assistance required"
    }
  ]
}
```

#### Update Flight Coordination
```http
PUT /api/events/{eventId}/guest-travel/{guestId}/coordination
Content-Type: application/json

{
  "coordinationStatus": "confirmed",
  "airportRepId": 1,
  "pickupArrangements": "Terminal 3 arrival gate, Contact: +91-9876543220",
  "confirmationSent": true,
  "notes": "Confirmed pickup with airport representative"
}
```

### Airport Representatives

#### Get Airport Representatives
```http
GET /api/events/{eventId}/airport-representatives
```

**Response:**
```json
{
  "representatives": [
    {
      "id": 1,
      "eventId": 11,
      "name": "Vikram Khanna",
      "phone": "+91-9876543220",
      "email": "vikram@airportservices.com",
      "airport": "Delhi Airport (DEL)",
      "terminal": "T3",
      "languages": ["Hindi", "English", "Punjabi"],
      "serviceHours": "24/7",
      "specializations": ["VIP services", "Group coordination"],
      "maxGuestsPerDay": 20,
      "currentAssignments": 8,
      "status": "active",
      "emergencyContact": "+91-9876543221"
    }
  ]
}
```

#### Assign Representative to Guest
```http
POST /api/events/{eventId}/airport-representatives/{repId}/assign
Content-Type: application/json

{
  "guestId": 123,
  "arrivalDate": "2025-12-13",
  "arrivalTime": "14:30",
  "flightNumber": "AI-401",
  "specialRequirements": "Wheelchair assistance",
  "meetingPoint": "Terminal 3 arrival gate"
}
```

### Flight List Management

#### Export Guest Flight List
```http
GET /api/events/{eventId}/flight-list/export
```

**Query Parameters:**
- `format`: `csv` | `excel`
- `dateRange`: `all` | `specific` (with `startDate` and `endDate`)

**Response:**
```json
{
  "downloadUrl": "/api/events/11/downloads/flight-list-20250715.csv",
  "filename": "flight-list-20250715.csv",
  "recordCount": 85,
  "generatedAt": "2025-07-15T10:30:00Z"
}
```

#### Import Flight Details
```http
POST /api/events/{eventId}/flight-list/import
Content-Type: multipart/form-data

file: [Excel/CSV file with flight confirmations]
```

**Expected File Format:**
```csv
Guest Email,Flight Number,Airline,Arrival Date,Arrival Time,Terminal,Departure Date,Departure Time,Confirmation Number
amit@example.com,AI-401,Air India,2025-12-13,14:30,T3,2025-12-16,18:45,ABC123
```

## Transport Configuration APIs

### Event Transport Settings

#### Get Transport Configuration
```http
GET /api/events/{eventId}/transport-settings
```

**Response:**
```json
{
  "transportMode": "selected",
  "providedTransport": true,
  "transportInstructions": "Airport shuttles available every 30 minutes",
  "flightCoordination": {
    "enabled": true,
    "mode": "full_coordination",
    "cutoffDate": "2025-11-15",
    "instructions": "Please provide flight details for pickup arrangement"
  },
  "providers": [
    {
      "type": "transport_vendor",
      "name": "Royal Transport Services",
      "contact": "+91-9876543210"
    }
  ]
}
```

#### Update Transport Configuration
```http
PUT /api/events/{eventId}/transport-settings
Content-Type: application/json

{
  "transportMode": "full",
  "providedTransport": true,
  "transportInstructions": "Complimentary airport transfers provided",
  "flightCoordination": {
    "enabled": true,
    "mode": "full_coordination",
    "cutoffDate": "2025-11-15",
    "bufferHours": {
      "arrival": "02:00",
      "departure": "03:00"
    }
  }
}
```

## Statistics and Analytics

### Transport Statistics
```http
GET /api/events/{eventId}/transport/statistics
```

**Response:**
```json
{
  "totalGroups": 8,
  "totalCapacity": 320,
  "assignedPassengers": 245,
  "utilizationRate": 76.6,
  "vehicleTypes": {
    "bus": 5,
    "car": 15,
    "luxury": 3
  },
  "coordinationStatus": {
    "pending": 12,
    "confirmed": 233,
    "completed": 0
  }
}
```

### Travel Statistics
```http
GET /api/events/{eventId}/travel/statistics
```

**Response:**
```json
{
  "flightAssistanceRequests": 89,
  "coordinationComplete": 67,
  "pendingCoordination": 22,
  "airportRepresentatives": 3,
  "avgCoordinationTime": "2.5 hours",
  "arrivalDates": {
    "2025-12-13": 45,
    "2025-12-14": 32,
    "2025-12-15": 12
  }
}
```

## Error Handling

### Common Error Responses

```json
{
  "error": "TRANSPORT_GROUP_FULL",
  "message": "Transport group has reached maximum capacity",
  "details": {
    "groupId": 1,
    "currentCapacity": 45,
    "maxCapacity": 45
  }
}
```

```json
{
  "error": "FLIGHT_COORDINATION_CUTOFF",
  "message": "Flight coordination requests are no longer accepted",
  "details": {
    "cutoffDate": "2025-11-15",
    "requestDate": "2025-11-20"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (capacity exceeded, duplicate assignment)
- `422` - Unprocessable Entity (business logic error)
- `500` - Internal Server Error

## Rate Limiting

- **Standard endpoints**: 100 requests per minute per user
- **File import/export**: 5 requests per minute per user
- **Statistics endpoints**: 20 requests per minute per user

## Webhooks (Future Implementation)

### Transport Events
- `transport.group.created`
- `transport.passenger.assigned`
- `transport.departure.scheduled`
- `transport.arrival.confirmed`

### Travel Events
- `travel.coordination.requested`
- `travel.flight.confirmed`
- `travel.representative.assigned`
- `travel.pickup.completed`

## SDK Usage Examples

### JavaScript/TypeScript
```typescript
// Transport group creation
const transportGroup = await api.post(`/events/${eventId}/transport-groups`, {
  groupName: "Airport Shuttle A",
  vehicleType: "bus",
  capacity: 45,
  departureTime: "14:00",
  departureLocation: "Delhi Airport T3",
  arrivalLocation: "Grand Palace Hotel"
});

// Flight coordination update
const coordination = await api.put(`/events/${eventId}/guest-travel/${guestId}/coordination`, {
  coordinationStatus: "confirmed",
  airportRepId: 1,
  pickupArrangements: "Terminal 3 arrival gate"
});
```

This API documentation covers all current and planned endpoints for the Transport and Travel modules, providing a comprehensive reference for frontend development and third-party integrations.