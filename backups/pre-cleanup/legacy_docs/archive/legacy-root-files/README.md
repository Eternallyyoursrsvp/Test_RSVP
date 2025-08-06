# Indian Wedding RSVP Platform

![Platform Banner](https://img.shields.io/badge/Wedding%20RSVP-Platform-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-18.2-blue)
![Express](https://img.shields.io/badge/Express-4.18-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)

A comprehensive wedding RSVP platform tailored for Indian weddings, providing robust event-specific management with isolated data storage, dynamic RSVP tracking, and integrated communication tools.

## 🎯 Project Purpose

The Indian Wedding RSVP Platform is designed to help wedding agencies and planners manage complex Indian wedding events efficiently. Indian weddings often involve multiple ceremonies, large guest lists, and intricate logistics spanning several days. This platform provides a centralized system for managing:

- Guest lists with multi-stage RSVP tracking
- Multiple ceremony scheduling
- Accommodation and travel logistics
- Multi-channel communication (Email, WhatsApp)
- Reporting and analytics

The platform supports both client-facing (couple) and backend (agency staff) interfaces, ensuring all stakeholders can access the information they need.

## 🏗️ System Architecture

### Backend
- **TypeScript/Node.js**: Strong typing with Express framework
- **PostgreSQL Database**: Relational database with tenant-based isolation
- **Drizzle ORM**: Type-safe database queries and schema management
- **RESTful API**: Clean API architecture for frontend communication
- **Multi-Provider Email Integration**: Gmail, Outlook, and SendGrid support

### Frontend
- **React**: Component-based UI library
- **TanStack Query (React Query)**: Data fetching and cache management
- **shadcn/ui & Tailwind CSS**: Component library and utility-first CSS
- **TypeScript**: Type-safe client-side code
- **Multi-step Wizard Forms**: Intuitive user experience for complex data entry

### Security & Authentication
- **Session-based Authentication**: Secure session management
- **Event-level Data Isolation**: Multi-tenant architecture with strict data boundaries
- **OAuth Token Management**: Secure integration with third-party email providers

## 🚀 Key Features & Implementation Status

### Multi-Event Management ✅
- Support for multiple concurrent wedding projects
- Complete data isolation between different wedding events
- Event context switching with proper cache invalidation
- Multi-step event creation wizard

### Comprehensive Guest Management ✅
- Excel import/export functionality
- RSVP tracking and reporting
- Relationship management (plus-ones, children)
- Guest categorization ("Bride's Side" or "Groom's Side")
- Enhanced child tracking with detailed information

### Hotel & Accommodation Management ✅
- Multiple hotel support for venues with limited inventory
- Room type and capacity tracking
- Guest accommodation assignment
- Check-in/check-out tracking

### Travel & Transportation 🔄
- Travel detail collection in RSVP forms
- Transportation arrangements tracking
- Airport pickup coordination
- Guest arrival and departure management

### Communication System 🔄
- OAuth integration with Gmail and Outlook
- SendGrid API support
- Template-based messaging
- Dynamic follow-up communication based on RSVP responses
- WhatsApp Business API integration (in progress)

### Ceremony & Scheduling 🔄
- Multi-ceremony support within events
- Ceremony-specific guest invitations
- Automated ceremony calendar management
- Meal selection and dietary requirements tracking

## 🛠️ Project Setup

### Prerequisites
- Node.js (v16+)
- PostgreSQL database
- npm or yarn package manager

### Installation
1. Clone the repository
```bash
git clone https://github.com/yourusername/indian-wedding-management.git
cd indian-wedding-management
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```
DATABASE_URL=postgresql://username:password@localhost:5432/wedding_management
SESSION_SECRET=your_session_secret
```

4. Run database migrations
```bash
npm run db:push
```

5. Start development server
```bash
npm run dev
```

## 💾 Data Model

The platform uses a multi-tenant data architecture with the following key models:

- **Users**: Agency staff and system administrators
- **Events**: Wedding events with metadata
- **Guests**: Comprehensive guest information with event association
- **Ceremonies**: Individual ceremonies within a wedding event
- **Accommodations**: Lodging options for guests
- **Travel**: Transportation details for guests
- **WhatsApp Templates**: Message templates for guest communication

### Data Isolation Strategy

All data is isolated at the event level using an event ID as a tenant identifier. This approach ensures complete data separation between different wedding projects while maintaining a single database.

## 🛣️ Development Roadmap

### Phase 1: Core Functionality ✅
- Authentication and user management
- Multi-event management with data isolation
- Guest list management and import/export
- Basic email integration
- Hotel and accommodation management

### Phase 2: Enhanced Features 🔄
- Ceremony management and scheduling
- Travel logistics and transportation
- Dynamic RSVP follow-up communication
- WhatsApp Business API integration
- Event-specific email provider configuration

### Phase 3: Advanced Features 📅
- Reporting and analytics dashboard
- Guest self-service RSVP portal
- Mobile optimization
- Performance enhancements for large guest lists
- Template customization and personalization

## 🔧 Technical Implementation

### Query Caching Strategy
The application implements a sophisticated caching strategy using TanStack Query to ensure proper data isolation between events:

- Cache is completely cleared when switching between events
- Reduced staleTime to ensure fresh data when switching contexts
- Comprehensive query invalidation for related data
- Event context included in query keys for proper isolation

### Event Context Management
The platform uses session-based event context tracking with validation at both client and server:

- Server-side verification of event context on all API requests
- Client-side hooks for consistent access to the current event
- Defensive programming to prevent cross-event data leakage

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

© 2025 Indian Wedding Management Platform. All rights reserved.