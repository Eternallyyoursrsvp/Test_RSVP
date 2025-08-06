# Event Setup Wizard Implementation Plan

## Current State Analysis

The Wedding RSVP system currently has these setup areas spread across different pages:

1. **Event Settings** - Basic event information, dates, couple details
2. **Hotels & Accommodations** - Hotel properties and room inventory management
3. **Transport Groups** - Vehicle types and transportation arrangements
4. **RSVP Configuration** - RSVP form settings and guest preference options
5. **Email Templates** - Communication templates and design
6. **Email Configuration** - Email providers (Gmail/Outlook/SMTP) including OAuth settings

## Detailed Configuration Mapping

### Event Settings Page Tabs
1. **Email & OAuth**
   - Email provider selection (Gmail, Outlook, SendGrid)
   - OAuth credentials configuration
   - Direct SMTP settings
   - Email sender and reply-to addresses

2. **RSVP Settings**
   - Plus-one allowance options
   - Children details collection options
   - Custom RSVP URL settings
   - RSVP deadline management

3. **Travel & Accommodation**
   - Accommodation provision mode (none, all guests, special deals, selected guests)
   - Transport provision mode (none, all guests, special deals, selected guests)
   - Flight assistance mode (none, all guests, special deals, selected guests)
   - Hotel details (name, address, phone, website, special rates)
   - Transport provider details (name, contact, website)
   - Default arrival/departure locations
   - Special deals and discount information
   - Instructions for guests

## Centralized Wizard Concept

The proposed Event Setup Wizard will unify these areas into a guided, step-by-step process while maintaining the ability to:
- Skip any section and return later
- Save progress at any point
- Complete setup sections out of sequence if needed

## Wizard Flow & Sections

### 1. Basic Event Information
- Event title
- Couple names (bride/groom/partners)
- Event type
- Start/end dates
- Main event location
- Description
- Banner images
- Contact information for organizers

### 2. Venues & Ceremonies 
- Add multiple venues
- Ceremony details and times
- Map links and directions
- Venue photos
- Parking information
- Attire code per ceremony
- Ceremony-specific notes

### 3. RSVP Configuration
- RSVP form customization
- Response deadline settings
- Plus-one allowance configuration
- Children attendance options
- Custom questions for guests
- Travel information requirements
- Food preference collection options
- Special needs accommodation questions

### 4. Hotels & Accommodation
- Accommodation provision mode
- Hotel properties creation
- Room types and inventory per hotel
- Room capacities and bed configurations
- Pricing options and special rates
- Booking instructions
- Amenities and special features
- Hotel images and contact information
- Custom accommodation notes for guests

### 5. Transportation Options
- Transport provision mode
- Flight assistance configuration
- Available transportation fleet definition:
  - Vehicle types (car, bus, shuttle)
  - Vehicle capacities and counts
  - Provider details and contact information
- Default pickup/dropoff locations
- Special transport instructions
- Recommended airlines and discount codes
- Transport booking deadlines

### 6. Communication Setup
- Email configuration:
  - Provider selection (Gmail, Outlook, SendGrid)
  - OAuth configuration (Client IDs, secrets, redirect URIs)
  - SMTP settings (host, port, security options, credentials)
  - Default sender name and email
  - Reply-to address configuration
- WhatsApp integration (placeholder for future implementation):
  - WhatsApp Business API integration settings
  - Message templates approval management
  - Default country code settings
  - Messaging quota configuration
  - Automated message scheduling options
- Email template selection
- Communication testing functionality

### 7. AI Assistant Configuration (placeholder for future implementation)
- AI chatbot integration options:
  - Chatbot personality customization
  - Response style settings
  - Custom knowledge base inputs
  - Guest FAQs management
  - Automated guest interaction rules
  - Fallback response configuration
- Integration points:
  - RSVP form assistance
  - Guest information collection
  - Accommodation/travel guidance
  - Venue directions and information
  - Schedule clarifications
- Monitoring and reporting settings

### 8. Design & Styling
- Color scheme selection
- Typography choices
- Banner and hero images
- Logo uploads
- Custom theme settings
- Mobile display options
- Email design templates
- RSVP form styling options
- WhatsApp message styling (placeholder)
- AI chatbot appearance settings (placeholder)

## Implementation Approach

### Phase 1: Wizard Framework and Database Structure
- Create base UI components for the wizard (navigation, progress tracking)
- Implement database schema for storing wizard progress
- Build the navigation and state management system
- Create skeleton pages for all wizard sections
- Implement "save & continue" and "skip section" functionality

### Phase 2: Data Connections
- Connect existing data models to wizard sections
- Implement data validation for each step
- Create APIs for saving partial configuration
- Build progress tracking and completion indicators
- Implement data prefetching for wizard sections

### Phase 3: Feature Integration
- Migrate existing configuration screens to wizard format
- Ensure all current functionality is preserved
- Implement new features within wizard framework
- Add placeholders for WhatsApp and AI integration
- Create upgrade paths for future features

### Phase 4: Testing and Refinement
- Test wizard flow with various use cases
- Ensure data consistency across sections
- Optimize user experience and navigation
- Document wizard architecture for future expansion
- Create comprehensive onboarding guide

## Implementation Progress (Updated May 19, 2025)

### Completed Features
- Basic wizard framework with navigation and progress tracking
- Event settings data model integration
- RSVP configuration integration
- Session persistence for multi-step wizard completion
- "Save & Continue" functionality
- "Back to Dashboard" navigation
- Basic progress indicators
- Data validation for completed steps

### Current Work
- Improving authentication reliability throughout the wizard flow
- Enhancing role-based access control in the wizard
- Connecting accommodation management to the wizard
- Building transport options configuration UI
- Implementing proper event assignment for wedding planners

### Next Steps
- Complete integration with email provider configuration
- Add WhatsApp integration setup
- Enhance the UI with improved progress visualization
- Implement data consistency checks between wizard steps
- Add intelligent suggestions based on event size and location

## Required Changes to Transport Module

Current transport implementation requires significant changes:

1. **Transport Options Definition:**
   - Move from creating individual transport groups to defining available fleet
   - Predefine vehicle types, capacities, and counts during setup
   - Set default pickup/dropoff locations

2. **Guest Allocation Logic:**
   - Maintain family grouping logic
   - Match guests to appropriate predefined vehicles based on:
     - Family size
     - Arrival times
     - Special requirements
   - Present matches as drafts for approval

3. **UI Changes:**
   - Replace "Transport Groups" page with "Transport Assignments"
   - Show available fleet with allocation status
   - Allow manual adjustments to auto-generated assignments
   - Maintain family cohesion in UI presentation

## Data Model Updates

Several schema updates will be required:

1. **New Tables:**
   - `event_setup_progress` - Track completion status of wizard sections
   - `transport_fleet` - Define available vehicle types and counts
   - `transport_options` - Store predefined transport templates

2. **Modifications:**
   - Update `transport_groups` to reference fleet vehicles
   - Add progress tracking fields to `events` table
   - Link accommodation types to wizard-defined templates

## Migration Strategy

To preserve existing data while implementing the wizard:

1. Create migration scripts for each module
2. Populate wizard defaults from existing configurations
3. Update references in existing data to new wizard-defined options
4. Provide UI indicators for items needing review after migration

## Timeline Estimate

| Phase | Description | Estimated Time |
|-------|-------------|----------------|
| 1 | Wizard Framework | 1-2 weeks |
| 2 | Data Integration | 1-2 weeks |
| 3 | Feature Refactoring | 2-3 weeks |
| 4 | UI/UX Streamlining | 1 week |
| | **Total** | **5-8 weeks** |

## Success Criteria

The wizard implementation will be considered successful when:

1. All setup functions are accessible through the wizard
2. Existing data is preserved and properly connected
3. Users can navigate seamlessly between wizard and management interfaces
4. Setup process requires fewer clicks and less context switching
5. Management functions properly utilize wizard-defined parameters