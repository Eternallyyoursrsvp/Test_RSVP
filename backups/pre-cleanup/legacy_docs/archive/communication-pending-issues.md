# Communication Module - Pending Issues

## 1. Transport Communication Template System

### Issue Description
Replace current scattered transport notification settings with a unified drag-and-drop template system for customizable guest communications.

### Current Problem
- Transport step has separate "Travel Updates" and "Guest Notifications" which are essentially the same thing
- Guests only need: contact details + pickup time/location 
- Current system is overengineered with unnecessary complexity

### Proposed Solution
Implement customizable communication templates with drag-and-drop fields in Communication step.

### Required Fields for Transport Templates
- `{rep_contact}` - Transport coordinator phone number
- `{driver_number}` - Assigned driver contact (operational data)
- `{transport_vendor}` - Company name (from transport setup)
- `{vehicle_type}` - Car type (Sedan, SUV, etc.)
- `{pickup_time}` - When to be ready (operational data)
- `{pickup_location}` - Where pickup happens (operational data)
- `{venue_location}` - Destination details (from event setup)
- `{guest_name}` - Personalization
- `{event_name}` - Event title

### Data Sources & Linkages

#### Static Data (from Transport Setup - Step 5)
- `transportProviderName` → `{transport_vendor}`
- `transportProviderContact` → `{rep_contact}`
- Vehicle types from vehicles array → `{vehicle_type}`

#### Dynamic Data (from Transport Assignments Module)
- Guest transport assignments → `{driver_number}`, `{pickup_time}`, `{pickup_location}`
- Vehicle assignments → specific `{vehicle_type}` per guest

#### Event Data (from Basic Info - Step 1)
- Event title → `{event_name}`
- Event location → `{venue_location}`

#### Guest Data (from Guest Management)
- Guest names → `{guest_name}`

### Example Template Usage
```
"Hi {guest_name}! Your transport for {event_name} is arranged. 
Contact {transport_vendor} at {rep_contact} for pickup at {pickup_time} 
from {pickup_location}. Vehicle: {vehicle_type}."
```

### Implementation Requirements
1. Template builder with drag-and-drop field insertion
2. Preview functionality showing populated data
3. Integration with existing email/WhatsApp sending systems
4. Field validation to ensure required data is available
5. Template library with pre-built common templates

### Database Schema Changes
- Add `transport_message_templates` table
- Link templates to events
- Store field mappings and template content

### Files to Modify
- `client/src/components/wizard/communication-step.tsx` - Add template builder
- `server/routes/communication.ts` - Template CRUD operations
- `shared/schema.ts` - Add template schema
- `server/routes/transport.ts` - Integration with assignment data

### Priority
Medium - Implement when Communication step work begins

### Related Features
- This replaces the removed notifications tab from Transport step
- Centralizes all guest messaging in Communication module
- Provides foundation for other customizable templates (RSVP reminders, accommodation info, etc.)