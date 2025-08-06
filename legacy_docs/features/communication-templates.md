# Communication Templates System

## Overview

The communication templates system provides a comprehensive collection of professionally designed message templates covering the entire wedding workflow. Templates are globally available to all events but can be customized per event while maintaining the global library.

## Template Architecture

### Global vs Event-Specific Templates

- **Global Templates**: Base templates available to all events (event_id = null)
- **Event Customizations**: When a template is customized for a specific event, a copy is created with that event's ID
- **Inheritance**: Events automatically have access to all global templates plus their custom versions

### Database Structure

```sql
communication_templates (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES wedding_events(id) ON DELETE CASCADE, -- NULL for global templates
  category_id VARCHAR NOT NULL,
  template_id VARCHAR NOT NULL,
  channel VARCHAR NOT NULL, -- 'email', 'whatsapp', 'sms'
  name VARCHAR NOT NULL,
  description TEXT,
  subject VARCHAR, -- For email templates
  content TEXT NOT NULL,
  variables TEXT[], -- Array of variable placeholders
  tags TEXT[], -- Template tags for filtering
  enabled BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

## Template Categories

### 1. Initial Wedding Invitations (`initial_invitations`)
**Purpose**: First announcements and save-the-date communications
**Module Integration**: RSVP Management Module
**Templates**:
- Save the Date - Email (formal announcement with timeline)
- Save the Date - WhatsApp (quick mobile-friendly message)
- Wedding Announcement - Email (formal family announcement)
- Wedding Announcement - WhatsApp (traditional Indian family format)

### 2. Formal RSVP Invitations (`formal_invitations`)
**Purpose**: Official invitations with RSVP links and complete ceremony details
**Module Integration**: RSVP Management Module, Guest List Management
**Templates**:
- Formal Wedding Invitation - Email (complete invitation with RSVP link)
- Formal Wedding Invitation - WhatsApp (mobile-friendly with quick RSVP)
- Digital Invitation Card - Email (HTML/visual invitation design)
- Invitation Reminder - Email (follow-up for unopened invitations)

### 3. Ceremony Information (`ceremony_information`)
**Purpose**: Detailed ceremony schedules, venue information, and logistics
**Module Integration**: Event Management, Venue Coordination
**Templates**:
- Ceremony Schedule - Email (complete timeline with venue details)
- Ceremony Schedule - WhatsApp (quick reference format)
- Venue Details - Email (maps, parking, accessibility information)
- Last-minute Updates - WhatsApp (urgent announcements)

### 4. Accommodation Information (`accommodation_information`)
**Purpose**: Hotel booking instructions and accommodation coordination
**Module Integration**: Hotel Management Module, Accommodation Management
**Templates**:
- Hotel Booking Instructions - Email (room types, rates, booking process)

### 5. Travel & Transportation (`travel_transportation`)
**Purpose**: Flight coordination and transport arrangement communication
**Module Integration**: Transport Coordination, Flight Management
**Templates**:
- Flight Coordination - Email (flight detail collection and instructions)

### 6. RSVP Follow-ups & Reminders (`rsvp_followups`)
**Purpose**: Gentle reminders for pending RSVP responses
**Module Integration**: RSVP Management Module, Guest Communication
**Templates**:
- Gentle RSVP Reminder - Email (non-pushy follow-up message)

### 7. Stage 2 Details Collection (`stage2_collection`)
**Purpose**: Collecting detailed preferences after initial RSVP confirmation
**Module Integration**: RSVP Management (Stage 2), Guest Preferences
**Templates**:
- Stage 2 Invitation - Email (travel and accommodation preferences)

### 8. Confirmations & Thank You (`confirmations_thankyou`)
**Purpose**: RSVP confirmations and next steps communication
**Module Integration**: Guest List Management, RSVP Processing
**Templates**:
- RSVP Confirmation - Email (thank you with next steps)

### 9. Pre-wedding Updates & Logistics (`prewedding_updates`)
**Purpose**: Final details and complete guest preparation guides
**Module Integration**: Event Management, Guest Communication Hub
**Templates**:
- Final Details - Email (complete guest guide with all information)

### 10. Post-wedding Communications (`postwedding_thankyou`)
**Purpose**: Post-celebration gratitude and memory sharing
**Module Integration**: Guest Communication Hub, Photo Sharing
**Templates**:
- Thank You Message - Email (post-wedding gratitude and photo links)

## Variable Substitution System

### Available Variables
- `{{guest_name}}` - Individual guest name
- `{{couple_names}}` - Bride and groom names combined
- `{{bride_name}}` - Bride's name
- `{{groom_name}}` - Groom's name
- `{{wedding_date}}` - Primary wedding date
- `{{wedding_location}}` - Primary venue location
- `{{venue_details}}` - Formatted venue information
- `{{ceremony_schedule}}` - Complete ceremony timeline
- `{{rsvp_link}}` - Personalized RSVP URL
- `{{rsvp_deadline}}` - RSVP response deadline
- `{{hotel_details}}` - Accommodation information
- `{{transport_details}}` - Travel arrangements
- `{{contact_information}}` - Wedding coordinator contacts

### Variable Processing
Variables are processed at send-time using event data and guest information, ensuring personalized messages for each recipient.

## Multi-Channel Support

### Email Templates
- Full HTML support with styling
- Subject line customization
- Responsive design for mobile
- Rich formatting and embedded links

### WhatsApp Templates
- Mobile-optimized formatting
- Emoji integration
- Concise messaging
- Quick action buttons

### SMS Templates
- Character limit optimization
- Essential information only
- Link shortening
- Direct call-to-action

## Template Management

### API Endpoints
- `GET /api/events/:eventId/communication-templates` - Fetch templates for event
- `POST /api/events/:eventId/communication-templates` - Create custom template
- `PUT /api/events/:eventId/communication-templates/:id` - Update template
- `DELETE /api/events/:eventId/communication-templates/:id` - Delete custom template

### UI Features
- Category-based organization with numbered headers
- Channel-specific color coding (blue: email, green: WhatsApp, purple: SMS)
- Template preview functionality
- Enable/disable toggles
- Global statistics dashboard
- Custom template creation (planned)

## Integration Points

### RSVP Management Module
- Initial and formal invitation templates
- Follow-up and reminder templates
- Stage 2 detail collection templates
- Confirmation templates

### Hotel Management Module
- Accommodation information templates
- Booking instruction templates
- Room assignment communications

### Transport Coordination Module
- Flight coordination templates
- Transport arrangement templates
- Travel instruction templates

### Guest Communication Hub
- Pre-wedding update templates
- Post-wedding thank you templates
- General guest communication templates

### Event Management System
- Ceremony information templates
- Venue detail templates
- Schedule communication templates

## Best Practices

### Template Customization
1. Always test templates with sample data before sending
2. Ensure variable substitution works correctly for all placeholders
3. Maintain consistent branding across all templates
4. Consider cultural sensitivity for Indian wedding traditions
5. Test mobile rendering for all channels

### Content Guidelines
1. Use clear, concise language
2. Include all necessary information without overwhelming
3. Maintain professional yet warm tone
4. Ensure accessibility compliance
5. Test across different email clients and devices

### Variable Usage
1. Always provide fallback values for optional variables
2. Validate variable data before template processing
3. Use consistent formatting for dates and times
4. Ensure URLs are properly formatted and accessible
5. Test variable substitution with edge cases