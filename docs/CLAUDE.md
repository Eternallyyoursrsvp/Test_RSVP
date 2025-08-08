# Eternally Yours RSVP Platform

## Brand Identity
**Official Name**: Eternally Yours RSVP Platform
**CRITICAL**: All frontend text, communications, and branding MUST use "Eternally Yours RSVP Platform" consistently.

## Core Tech Stack
- **Frontend**: TypeScript + React + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: Radix UI + shadcn/ui components

## Key Architecture Documents

**📁 All documentation is now located in the `/docs` folder**

### Primary References
- **`docs/Architecture_Ver5_Comprehensive.md`** - Complete system architecture
  - *Access during*: Planning, system design, feature implementation, troubleshooting
  - *Contains*: Full technical specifications, data models, API structures

- **`docs/IMPLEMENTATION_SUMMARY.md`** - Implementation status and progress
  - *Access during*: Project status checks, planning next features, identifying completed work

### Testing & Quality
- **`docs/TESTING_GUIDE.md`** - Testing strategies and procedures
  - *Access during*: Writing tests, debugging, quality assurance, pre-deployment checks

### Development Workflow
- **`docs/Platform_Upgrade_Workflow.md`** - Development and deployment processes
  - *Access during*: Code changes, version updates, deployment planning

### Design System
- **`docs/DESIGN_SYSTEM_INTEGRATION.md`** - Design system integration guide
  - *Access during*: UI development, design system usage, token implementation

## Setup System Architecture

### Magic Link Setup Flow
1. **Bootstrap Detection**: Server detects missing .env → enters bootstrap mode
2. **Landing Page**: Shows "Eternally Yours RSVP Platform" with setup button when needed
3. **Token-Protected Wizard**: Visual setup accessible via magic link
4. **Zero Configuration**: Automated .env creation and server restart
5. **Setup Completion**: Setup button disappears permanently

### Multi-Tenant Email Strategy
- **Platform Level**: Admin email configuration (setup wizard)
- **Tenant Level**: Primary email settings per organization
- **Event Level**: Event-specific overrides (optional)
- **Hierarchy**: Platform → Tenant → Event (most specific wins)

### Storage & Backup Strategy
**Immediate Storage Needs**: File uploads, user assets, event media
**Current Options**: Local, AWS S3, Supabase
**Future Enhancement**: Google Drive backup integration
**Setup Priority**: Required during initial setup for immediate functionality

### Authentication Architecture ✅ **IMPLEMENTED AUGUST 2025**
**Production-Ready First-Time Setup**: Zero-configuration authentication with enterprise security
**Secure OTP Generation**: crypto.randomBytes(16) for one-time admin passwords  
**Enterprise Password Security**: bcrypt with 12 salt rounds, forced password changes
**JWT Session Management**: Local token generation with secure session handling
**Bootstrap Detection**: Automatic first-time setup detection via startup-manager.ts
**Database Schema**: Automatic user table creation with security fields
**File Locations**: 
- Authentication: `server/auth/production-auth.ts`
- Bootstrap: `server/src/bootstrap/startup-manager.ts`  
- Setup Flow: `server/index.ts:25-49`
**Security Compliance**: No hardcoded passwords, enterprise password policies, audit logging

## Development Guidelines
- **TypeScript Only**: Strict mode, no any types
- **Family-Centric Design**: All features prioritize keeping families together
- **Performance First**: Optimize for 500+ guest weddings
- **Zero Configuration**: Users never manually edit .env files
- **Visual Setup**: All configuration through intuitive UI wizards

## Key Features
- **Zero-Configuration Startup**: Visual setup wizard with magic link authentication
- **Multi-Tenant Architecture**: Support for multiple wedding planners/organizations
- **Guest Management**: RSVP tracking, dietary restrictions, plus-ones, family groupings
- **Event Management**: Multiple events per wedding (Mehendi, Sangam, Wedding, Reception)
- **WhatsApp Integration**: Automated messaging and RSVP collection
- **AI Chatbot**: 24/7 guest support and question answering
- **Multi-Language Support**: Hindi, English, and regional language support
- **Family-Centric Design**: Keep families together across all features
- **Real-time Updates**: Live guest count, dietary summaries, seating arrangements
- **Payment Integration**: Guest contributions and payment tracking
- **Mobile-First Design**: Optimized for Indian mobile usage patterns

## Document Maintenance Requirements
**CRITICAL**: Update these files whenever making significant changes:

### Always Update After Changes:
- **`docs/CLAUDE.md`** - This file, for new features, architecture changes, development guidelines
- **`docs/Architecture_Ver5_Comprehensive.md`** - For system architecture, data models, API changes
- **`docs/IMPLEMENTATION_SUMMARY.md`** - For feature completion status, implementation progress
- **`docs/TESTING_GUIDE.md`** - For new testing procedures, quality standards
- **`docs/Platform_Upgrade_Workflow.md`** - For deployment processes, version management
- **`docs/DESIGN_SYSTEM_INTEGRATION.md`** - For design system updates, token changes

### Version Sync Protocol:
1. **Before Major Changes**: Read current architecture docs to understand existing patterns
2. **During Development**: Note breaking changes and new features
3. **After Completion**: Update relevant documentation with new information
4. **Code Review**: Verify documentation matches implementation
5. **Deployment**: Ensure all docs reflect deployed features

## Visual Development Memories
Please use the Playwright MCP server when making visual changes to the front-end to check your work.
- Verify responsive design across device sizes
- Test user interactions and form submissions
- Validate accessibility compliance
- Check cross-browser compatibility
- Capture screenshots for documentation

## Guidance Memories
- Please ask for clarification upfront, upon the initial prompts, when you need more direction
- Confirm requirements before implementing major features
- Validate user experience assumptions with stakeholders
- Request feedback on design decisions that impact user workflow

## Linting and Code Quality
- Please run `npm run check` after completing large additions or refactors to ensure TypeScript compliance
- Focus on fixing TypeScript errors in modified files only (many legacy errors exist)
- Use consistent code formatting (currently no formatter configured)
- Address TypeScript warnings in new code before marking tasks complete

## Documentation Memories
- Please use Context7 MCP server to find the relevant, up-to-date documentation when working with 3rd party libraries
- Prioritize official documentation over Stack Overflow or outdated tutorials
- Verify library versions match project dependencies
- Update `docs/CLAUDE.md` when adding new dependencies or changing tech stack
- Reference `docs/DESIGN_SYSTEM_INTEGRATION.md` for design system token usage and implementation patterns

## Current Development Priority
1. **Setup Wizard Enhancement**: Add tooltips, email config, storage config ✅
2. **Brand Consistency**: Update all "RSVP Platform" references ✅
3. **Authentication System**: Production-ready first-time setup with OTP ✅
4. **Documentation Audit**: Enterprise-level documentation updates ✅ 
5. **Landing Page Migration**: New TypeScript + React implementation
6. **Multi-Tenant Email**: Implement hierarchy (Platform → Tenant → Event)

## Local Server
Set local sever port to 3001 only and no other ports