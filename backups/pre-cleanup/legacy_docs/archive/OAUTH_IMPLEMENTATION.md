# OAuth Implementation for Email Services

## Overview

This document outlines the OAuth implementation for Gmail and Outlook email services in the Wedding RSVP application. The system supports both global OAuth credentials (environment variables) and event-specific OAuth credentials stored in the database, allowing for customized email configurations per wedding event.

## Architecture

### 1. Event-Specific Credentials Storage

OAuth credentials are stored in the events table with the following fields:

- `gmailClientId` - Client ID for Gmail OAuth
- `gmailClientSecret` - Client secret for Gmail OAuth
- `gmailRefreshToken` - Refresh token for Gmail OAuth
- `gmailAccessToken` - Access token for Gmail OAuth (short-lived)
- `gmailTokenExpiry` - Expiration time for Gmail access token
- `outlookClientId` - Client ID for Outlook OAuth
- `outlookClientSecret` - Client secret for Outlook OAuth
- `outlookRefreshToken` - Refresh token for Outlook OAuth
- `outlookAccessToken` - Access token for Outlook OAuth (short-lived)
- `outlookTokenExpiry` - Expiration time for Outlook access token

### 2. Fallback Mechanism

The system implements a fallback mechanism:
1. First attempts to use event-specific credentials from the database
2. If not available, falls back to environment variables:
   - `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`
   - `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`, `OUTLOOK_REDIRECT_URI`

### 3. OAuth Flow Implementation

The OAuth implementation follows standard OAuth 2.0 authorization code flow:

1. **Authorization Request**: Redirect user to provider's authorization endpoint
2. **Authorization Grant**: Provider redirects back with an authorization code
3. **Token Exchange**: Exchange authorization code for access and refresh tokens
4. **Token Storage**: Store tokens in the database for the specific event
5. **Token Refresh**: Use refresh tokens to obtain new access tokens when expired

## API Routes

### Authorization Endpoints

- `GET /api/oauth/gmail/auth`: Initiates Gmail OAuth flow
- `GET /api/oauth/outlook/auth`: Initiates Outlook OAuth flow
- `GET /api/oauth/gmail/callback`: Handles Gmail OAuth callback
- `GET /api/oauth/outlook/callback`: Handles Outlook OAuth callback
- `GET /api/oauth/gmail/status`: Checks Gmail OAuth connection status
- `GET /api/oauth/outlook/status`: Checks Outlook OAuth connection status

## Frontend Implementation

### OAuth Configuration Component

The system includes two main components for OAuth configuration:

1. **OAuthConfiguration**: General OAuth settings in the event settings section
2. **RsvpFollowupConfiguration**: OAuth settings specifically for RSVP follow-up communications

#### RsvpFollowupConfiguration Features

- Step-by-step instructions for connecting Gmail and Outlook accounts
- Visual indicators for connection status
- Properly styled buttons for initiating OAuth flow
- Clear error messaging when configuration fails

## Error Handling

The OAuth implementation includes comprehensive error handling:

1. **Client-Side Validation**: Validates required fields before initiating OAuth flow
2. **Server-Side Validation**: Validates all OAuth parameters and credentials
3. **Detailed Logging**: Logs OAuth-related events for troubleshooting
4. **User-Friendly Messaging**: Provides clear error messages for common issues

## Security Considerations

1. **Token Storage**: All tokens and secrets are stored securely in the database
2. **Scope Limitation**: OAuth scopes are limited to only what's necessary for email sending
3. **Token Refresh**: Implements proper token refresh logic to avoid using expired tokens
4. **Error Isolation**: OAuth errors are isolated and don't affect other system functionality

## Best Practices

When working with the OAuth implementation:

1. **Always validate event context** before accessing or modifying OAuth credentials
2. **Use the provided utility functions** for OAuth operations rather than direct database access
3. **Handle token expiration gracefully** by checking token validity before using
4. **Implement proper error handling** in both frontend and backend OAuth operations

## Recent Improvements

As of May 19, 2025, the following improvements have been made:

1. Enhanced the OAuth configuration UI with clear instructions
2. Added step-by-step guidance for both Gmail and Outlook
3. Improved visual indicators for connection status
4. Updated button styling for better visibility
5. Implemented comprehensive error handling and logging
6. Added event-specific credential storage with environment variable fallback
7. Fixed session persistence issues affecting OAuth authentication flow
8. Implemented proper role-based access control for OAuth configuration
9. Enhanced error reporting when OAuth tokens expire or are invalid

## Pending Improvements

The following improvements are planned:

1. Automated testing for OAuth-related functions
2. Enhanced error handling for token expiration and refresh
3. More comprehensive documentation with screenshots and examples
4. Performance optimization for token refresh operations
5. Integration with event assignment system for wedding planners