# Wedding RSVP Application User Flow Document

## Table of Contents
1. [User Types](#user-types)
2. [Current User Flows](#current-user-flows)
3. [Ideal User Flows](#ideal-user-flows)
4. [Forms Inventory](#forms-inventory)
5. [Related Documentation](#related-documentation)

## User Types
The application serves several distinct user types with different needs:

1. **Wedding Agency Admin**: Manages multiple wedding events and has access to all features
2. **Wedding Planner**: Manages a specific wedding event and coordinates all aspects
3. **Couple (Bride/Groom)**: The wedding couple who can view and manage their event with limited admin rights
4. **Guest**: Attendees of the wedding who need to RSVP and provide information

## Current User Flows

### Wedding Agency Admin User Flow
1. **Login**
   - Enters credentials (username/password)
   - Navigates to dashboard overview
   
2. **Dashboard Navigation**
   - Views all active wedding events
   - Sees high-level stats: Total guests, RSVP status, etc.
   - Can select a specific event to manage

3. **Event Management**
   - Creates new wedding events
   - Assigns planners to events
   - Sets up event parameters
   - Configures ceremonies and locations

4. **Guest Management**
   - Imports guests from Excel
   - Manages guest relationships
   - Tracks RSVP status
   - Generates/sends RSVP links

5. **Communication**
   - Configures email settings (Gmail/Outlook OAuth)
   - Sets up WhatsApp integration
   - Creates templates for notifications
   - Manages follow-up messages

6. **Travel & Accommodation**
   - Manages hotel allocations
   - Tracks transportation needs
   - Assigns rooms based on preferences

7. **Reporting**
   - Generates comprehensive reports
   - Exports data for offline use
   - Views analytics on RSVPs and attendance

### Wedding Planner User Flow
1. **Login**
   - Enters credentials
   - Goes to their assigned event dashboard

2. **Dashboard**
   - Views status of assigned wedding event
   - Sees actionable tasks and notifications
   - Tracks RSVP progress

3. **Guest Management**
   - Manages guest list for their event
   - Tracks RSVPs and follows up with guests
   - Assigns seating and accommodation

4. **Ceremony Management**
   - Manages individual ceremonies
   - Tracks attendance by ceremony
   - Coordinates meal selections

5. **Communication**
   - Sends RSVP reminders
   - Communicates updates to guests
   - Coordinates with vendors

### Guest User Flow
1. **Receive Invitation**
   - Gets email or WhatsApp with RSVP link
   - Clicks on personalized link

2. **RSVP Stage 1 (Basic Attendance)**
   - Views event details
   - Confirms/declines attendance
   - Provides basic information
   - Submits dietary restrictions
   - Includes plus-one if applicable
   - Selects which ceremonies they'll attend

3. **RSVP Stage 2 (Travel & Accommodation - for confirmed attendees)**
   - Provides travel details (arrival/departure)
   - Indicates accommodation needs
   - Selects meal preferences
   - Provides additional details (children, etc.)

4. **Confirmation**
   - Receives confirmation of their RSVP
   - Can access their RSVP details later

5. **Updates**
   - Receives relevant updates about the event
   - Gets specific information about ceremonies they're attending

## Ideal User Flows

### Improved Wedding Agency Admin Flow
1. **Login & Dashboard**
   - Single sign-on options
   - Personalized dashboard with event timeline
   - Actionable notifications and alerts
   - Quick-access to common tasks
   - Event health metrics and status indicators

2. **Event Setup Wizard**
   - Step-by-step guide for new event creation
   - Templates for common event types
   - Automatic generation of ceremonies based on wedding type
   - Checklist of required configurations
   - One-click duplication of past events

3. **Guest Management**
   - Smart Excel import with field mapping
   - Automatic guest categorization (family, friends, etc.)
   - Bulk actions for common tasks
   - Interactive guest relationship mapping
   - Automated reminders for non-responders
   - Guest communication timeline view

4. **Communication Hub**
   - Centralized communications dashboard
   - Multi-channel messaging (Email, SMS, WhatsApp)
   - Message scheduling and automation
   - Template library with personalization
   - A/B testing for message effectiveness
   - Communication analytics

5. **Travel & Accommodation Manager**
   - Visual room allocation interface
   - Transportation scheduling tool
   - Interactive venue maps
   - Guest preference matching algorithm
   - Vendor coordination portal

6. **Settings & Configuration**
   - Role-based access control
   - White-label branding options
   - API integrations with other services
   - OAuth setup wizards
   - Backup and data export tools

7. **Analytics & Reporting**
   - Custom report builder
   - Real-time dashboard
   - Exportable visualizations
   - Predictive analytics for attendance
   - Cost tracking and budgeting tools

### Improved Wedding Planner Flow
1. **Task-Oriented Dashboard**
   - Daily task list
   - Calendar view of upcoming deadlines
   - Guest status and follow-up reminders
   - Quick-action buttons for common tasks
   - Event countdown timer

2. **Guest Relationship Management**
   - Guest profiles with complete history
   - Communication log
   - Preference tracking
   - Family/group management view
   - VIP guest highlighting

3. **Mobile-Optimized Tools**
   - On-the-go guest check-in
   - Real-time updates during event
   - Offline mode for venue areas with poor connectivity
   - Photo capture and sharing

4. **Vendor Coordination**
   - Vendor contact management
   - Schedule and timeline sharing
   - Requirements and specification sharing
   - Payment tracking

### Improved Guest Flow
1. **Invitation & RSVP**
   - Mobile-optimized responsive design
   - Personalized greeting with couple's photos
   - Interactive wedding details (map, timeline, etc.)
   - Frictionless RSVP process (minimal clicks)
   - Form-saving for multi-device completion
   - Digital save-the-date add to calendar

2. **Pre-Event Information Hub**
   - Personalized event portal
   - Weather updates for travel planning
   - Local information for out-of-town guests
   - FAQs and important information
   - Countdown to the big day
   - Photo sharing and social integration

3. **Post-RSVP Experience**
   - Confirmation with personalized message
   - Digital itinerary for their specific attendance
   - Updates and changes relevant to them
   - Ability to update their details if needed
   - Access to their accommodation and travel details
   - Option to coordinate with other guests

## Forms Inventory

All forms in the application use standardized components and utilities:
- Consistent validation using shared Zod schemas
- Standardized date formatting with date utilities
- Uniform error handling and notifications
- Responsive layouts with consistent styling

### Login Form
- **Fields:**
  - Username (required)
  - Password (required)
  - Remember me (checkbox)
- **Tooltips:**
  - Password: "Must be at least 8 characters with one uppercase letter, one number, and one special character"

### Event Creation Form
- **Fields:**
  - Event Title (required)
  - Couple Names (required)
  - Start Date (required)
  - End Date (required)
  - Location (required)
  - Description
  - RSVP Deadline
  - Primary Contact Email (required)
  - Primary Contact Phone
  - Event Type (dropdown)
  - Time Zone (dropdown)
  - Banner Image (file upload)
  - Logo (file upload)
- **Tooltips:**
  - Start/End Date: "The full duration of all wedding events"
  - RSVP Deadline: "Recommended at least 4 weeks before the event start date"
  - Banner Image: "Recommended size: 1920x500 pixels"

### Guest Import Form
- **Fields:**
  - Excel File (file upload, required)
  - Import Type (dropdown: new guests, update existing)
  - Default Guest Group (dropdown)
  - Default Side (dropdown: bride, groom, both)
- **Tooltips:**
  - Excel File: "Download our template first for the correct format"
  - Import Type: "Choose 'update existing' to match by email or phone"

### Guest Creation/Edit Form
- **Fields:**
  - First Name (required)
  - Last Name (required)
  - Email
  - Phone
  - Address
  - Side (dropdown: bride, groom, both)
  - Relationship (dropdown)
  - Guest Group (dropdown)
  - VIP Status (checkbox)
  - Plus One Allowed (checkbox)
  - Children Allowed (checkbox)
  - Number of Children Allowed (number)
  - Dietary Restrictions
  - Special Needs
- **Tooltips:**
  - Email/Phone: "At least one contact method is required for sending invitations"
  - Plus One: "Enables guest to bring a companion"

### Ceremony Creation Form
- **Fields:**
  - Ceremony Name (required)
  - Date (required)
  - Start Time (required)
  - End Time (required)
  - Location (required)
  - Description
  - Attire Code
  - Maximum Capacity
  - Ceremony Type (dropdown)
  - Meal Service (checkbox)
- **Tooltips:**
  - Ceremony Type: "Helps categorize and organize multiple ceremonies in an Indian wedding"
  - Meal Service: "Enable to add meal options for this ceremony"

### RSVP Stage 1 Form (Guest-facing)
- **Fields:**
  - First Name (pre-filled, editable)
  - Last Name (pre-filled, editable)
  - Email (pre-filled, editable)
  - Phone (editable)
  - Attendance (radio: attending, not attending)
  - Plus One (conditional, if allowed)
  - Plus One Name (conditional)
  - Plus One Email (conditional)
  - Plus One Phone (conditional)
  - Dietary Restrictions (dropdown with multi-select)
  - Allergies (text)
  - Message to Couple (textarea)
  - Ceremony Selection (checkboxes for each ceremony)
- **Tooltips:**
  - Attendance: "Please confirm if you'll be joining us for the celebration"
  - Dietary Restrictions: "Select all that apply to help us plan appropriate meals"
  - Ceremony Selection: "Select which events you'll be attending"

### RSVP Stage 2 Form (Guest-facing)
- **Fields:**
  - Accommodation Needs (radio: yes/no)
  - Accommodation Preference (conditional dropdown)
  - Transportation Needs (radio: yes/no)
  - Transportation Preference (conditional dropdown)
  - Travel Mode (dropdown: air, train, car, other)
  - Arrival Date (date picker)
  - Arrival Time (time picker)
  - Departure Date (date picker)
  - Departure Time (time picker)
  - Flight Details (conditional nested form)
  - Children Details (conditional repeatable nested form)
  - Meal Selections (dropdown for each ceremony with meal service)
- **Tooltips:**
  - Accommodation: "Let us know if you need help with stay arrangements"
  - Transportation: "We can arrange local transportation during your stay"
  - Travel Mode: "This helps us coordinate arrivals and departures"

### Email Configuration Form
- **Fields:**
  - Service Provider (dropdown: Gmail, Outlook, SMTP)
  - OAuth Configuration (conditional button for Gmail/Outlook)
  - SMTP Server (conditional for SMTP)
  - SMTP Port (conditional for SMTP)
  - Username (conditional for SMTP)
  - Password (conditional for SMTP)
  - From Name (required)
  - From Email (required)
  - Reply-To Email
  - Default Email Template (dropdown)
- **Tooltips:**
  - OAuth: "Click to connect your Gmail or Outlook account securely"
  - SMTP: "Use these settings if you have a custom email provider"

### WhatsApp Configuration Form
- **Fields:**
  - API Key (required)
  - Business Phone Number (required)
  - Business Name (required)
  - Default Template (dropdown)
  - Enable WhatsApp Communications (toggle)
- **Tooltips:**
  - API Key: "Get this from your WhatsApp Business API provider"
  - Business Phone Number: "Must be verified with WhatsApp Business"
  - Default Template: "Must be pre-approved by WhatsApp"

### Hotel Management Form
- **Fields:**
  - Hotel Name (required)
  - Address (required)
  - Phone Number
  - Website
  - Contact Person
  - Room Types (repeatable nested form)
  - Check-in Policy
  - Check-out Policy
  - Booking Instructions
  - Amenities (multi-select)
  - Event Proximity (dropdown)
  - Special Rates (text)
  - Special Notes
- **Tooltips:**
  - Room Types: "Add different room categories with capacity and rate information"
  - Event Proximity: "Distance or time from main venue"

### Guest Room Allocation Form
- **Fields:**
  - Guest (dropdown or search, required)
  - Hotel (dropdown, required)
  - Room Type (dropdown, required)
  - Room Number
  - Check-in Date (required)
  - Check-out Date (required)
  - Special Requests
  - Billing Type (dropdown: guest, couple, split)
  - Notes
- **Tooltips:**
  - Billing Type: "Determines who will be responsible for payment"
  - Special Requests: "Any specific requirements to communicate to the hotel"

### Transportation Management Form
- **Fields:**
  - Transportation Type (dropdown: shuttle, car, van, bus)
  - Provider Name
  - Contact Details
  - Capacity
  - Routes (repeatable nested form)
  - Schedule (repeatable nested form)
  - Special Instructions
- **Tooltips:**
  - Routes: "Define pickup and drop-off locations"
  - Schedule: "Set timings for each transportation service"

### Meal Options Form
- **Fields:**
  - Meal Name (required)
  - Description
  - Type (dropdown: vegetarian, non-vegetarian, vegan, etc.)
  - Allergens (multi-select)
  - Image (file upload)
  - Ceremony (dropdown, required)
  - Maximum Servings
  - Special Notes
- **Tooltips:**
  - Allergens: "Important for guest safety, select all that apply"
  - Maximum Servings: "Leave blank for unlimited"

### Guest Message Form
- **Fields:**
  - Message Type (dropdown: email, WhatsApp, both)
  - Message Subject (conditional for email)
  - Message Content (rich text editor)
  - Include Event Details (checkbox)
  - Include RSVP Link (checkbox)
  - Target Guests (dropdown: all, confirmed, declined, pending)
  - Schedule Send (checkbox and datetime picker)
- **Tooltips:**
  - Target Guests: "Select which guest segment should receive this message"
  - Schedule Send: "Plan your message for a future date and time"
  
## Related Documentation

For more detailed information on specific aspects of the application:

1. **RSVP Process Flow & Change Management** - [RSVPProcessFlow.md](RSVPProcessFlow.md)
   - Detailed breakdown of each stage in the RSVP process
   - Change management procedures for various scenarios
   - Communication templates and process flow diagrams
   - Emergency handling procedures

2. **System Architecture** - [SystemArchitecture.md](SystemArchitecture.md)
   - Technical architecture of the application
   - Component relationships and data flow
   - Integration specifications

3. **Data Dictionary** - [DataDictionary.md](DataDictionary.md)
   - Detailed definitions of all data entities and fields
   - Data validation rules and relationships
   - Enumeration values and constraints

4. **Testing Strategy** - [TestingStrategy.md](TestingStrategy.md)
   - Test cases for critical user flows
   - Acceptance criteria for features
   - Testing environments and procedures