# Wedding RSVP Application Integration Specifications

## Overview
This document outlines the detailed specifications for all third-party integrations within the Wedding RSVP application. It serves as a reference for implementation, testing, and maintenance of external service connections.

## Table of Contents
1. [Email Integrations](#email-integrations)
   - [Gmail OAuth](#gmail-oauth)
   - [Outlook OAuth](#outlook-oauth)
   - [SMTP Direct](#smtp-direct)
2. [Messaging Integrations](#messaging-integrations)
   - [WhatsApp Business API](#whatsapp-business-api)
   - [SMS Gateway (Future)](#sms-gateway-future)
3. [File Storage and Processing](#file-storage-and-processing)
   - [File Upload and Storage](#file-upload-and-storage)
   - [Excel Processing](#excel-processing)
4. [Authentication Providers](#authentication-providers)
   - [OAuth 2.0 Authentication](#oauth-20-authentication)
5. [Integration Security Requirements](#integration-security-requirements)
6. [Error Handling and Fallback Strategies](#error-handling-and-fallback-strategies)
7. [Testing and Validation Procedures](#testing-and-validation-procedures)

## Email Integrations

### Gmail OAuth

#### Overview
The application integrates with Gmail using OAuth 2.0 for secure email sending without storing user passwords.

#### Integration Requirements
- **API Scope**: `https://mail.google.com/`
- **Required Permissions**: Full access to Gmail
- **Authentication Flow**: OAuth 2.0 with refresh tokens
- **Rate Limits**: 
  - 500 recipients per day (free Gmail)
  - 2000 recipients per day (Google Workspace accounts)

#### Implementation Details

##### Configuration Setup
1. **Google Cloud Console Setup**:
   - Create project in Google Cloud Console
   - Enable Gmail API
   - Create OAuth 2.0 Client ID (Web Application type)
   - Configure authorized redirect URIs:
     - `https://{your-domain}/api/oauth/gmail/callback`
   - Note Client ID and Client Secret

2. **Application Configuration**:
   ```typescript
   interface GmailOAuthConfig {
     clientId: string;        // Google Cloud OAuth Client ID
     clientSecret: string;    // Google Cloud OAuth Client Secret
     redirectUri: string;     // Must match console configuration
     scopes: string[];        // Must include "https://mail.google.com/"
     accessToken?: string;    // Stored after OAuth
     refreshToken?: string;   // Stored after OAuth
     expiry?: number;         // Token expiration timestamp
   }
   ```

##### Authentication Flow
1. Redirect user to Google's OAuth consent screen:
   ```typescript
   const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?
     client_id=${config.clientId}&
     redirect_uri=${encodeURIComponent(config.redirectUri)}&
     response_type=code&
     scope=${encodeURIComponent(config.scopes.join(' '))}&
     access_type=offline&
     prompt=consent`;
   
   // Redirect user to authUrl
   ```

2. Handle callback and token exchange:
   ```typescript
   async function handleGmailOAuthCallback(code: string): Promise<OAuthTokens> {
     const response = await fetch('https://oauth2.googleapis.com/token', {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: new URLSearchParams({
         code,
         client_id: config.clientId,
         client_secret: config.clientSecret,
         redirect_uri: config.redirectUri,
         grant_type: 'authorization_code'
       })
     });
     
     const tokens = await response.json();
     return {
       accessToken: tokens.access_token,
       refreshToken: tokens.refresh_token,
       expiry: Date.now() + tokens.expires_in * 1000
     };
   }
   ```

3. Token refresh handling:
   ```typescript
   async function refreshGmailToken(refreshToken: string): Promise<string> {
     const response = await fetch('https://oauth2.googleapis.com/token', {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: new URLSearchParams({
         refresh_token: refreshToken,
         client_id: config.clientId,
         client_secret: config.clientSecret,
         grant_type: 'refresh_token'
       })
     });
     
     const tokens = await response.json();
     return tokens.access_token;
   }
   ```

##### Email Sending
1. Using Nodemailer with Gmail OAuth:
   ```typescript
   import nodemailer from 'nodemailer';

   async function createGmailTransport(oauthConfig: GmailOAuthConfig) {
     // Refresh token if expired
     if (oauthConfig.expiry && Date.now() > oauthConfig.expiry) {
       oauthConfig.accessToken = await refreshGmailToken(oauthConfig.refreshToken);
       oauthConfig.expiry = Date.now() + 3600 * 1000; // 1 hour
       // Save updated tokens to database
     }
     
     return nodemailer.createTransport({
       service: 'gmail',
       auth: {
         type: 'OAuth2',
         user: userEmail, // Email address used for OAuth
         clientId: oauthConfig.clientId,
         clientSecret: oauthConfig.clientSecret,
         refreshToken: oauthConfig.refreshToken,
         accessToken: oauthConfig.accessToken
       }
     });
   }
   ```

2. Sending an email:
   ```typescript
   async function sendEmail(
     to: string, 
     subject: string, 
     text: string, 
     html: string
   ): Promise<boolean> {
     try {
       const transport = await createGmailTransport(oauthConfig);
       await transport.sendMail({
         from: userEmail,
         to,
         subject,
         text,
         html
       });
       return true;
     } catch (error) {
       console.error('Gmail sending error:', error);
       return false;
     }
   }
   ```

#### Error Handling
- Handle token expiration and refresh failures
- Rate limit detection and appropriate messaging
- Retry logic for transient failures
- Fallback to alternative email provider if configured

#### Testing Procedures
1. OAuth flow testing (grant and revoke)
2. Token refresh testing
3. Email sending with various content types
4. Attachment handling
5. Error condition simulations

### Outlook OAuth

#### Overview
The application integrates with Microsoft Outlook/Office 365 using OAuth 2.0 for secure email sending.

#### Integration Requirements
- **API Scope**: `https://graph.microsoft.com/mail.send`
- **Required Permissions**: Send mail as user
- **Authentication Flow**: OAuth 2.0 with refresh tokens
- **Rate Limits**: Varies by subscription level, typically 10,000 per day

#### Implementation Details

##### Configuration Setup
1. **Microsoft Azure Portal Setup**:
   - Register application in Azure Active Directory
   - Configure API permissions (Microsoft Graph, Mail.Send)
   - Create client secret
   - Configure redirect URIs:
     - `https://{your-domain}/api/oauth/outlook/callback`
   - Note Application (client) ID and client secret

2. **Application Configuration**:
   ```typescript
   interface OutlookOAuthConfig {
     clientId: string;        // Azure AD Application ID
     clientSecret: string;    // Azure AD Client Secret
     redirectUri: string;     // Must match Azure configuration
     scopes: string[];        // Must include "https://graph.microsoft.com/mail.send"
     accessToken?: string;    // Stored after OAuth
     refreshToken?: string;   // Stored after OAuth
     expiry?: number;         // Token expiration timestamp
   }
   ```

##### Authentication Flow
1. Redirect user to Microsoft's OAuth consent screen:
   ```typescript
   const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?
     client_id=${config.clientId}&
     redirect_uri=${encodeURIComponent(config.redirectUri)}&
     response_type=code&
     scope=${encodeURIComponent(config.scopes.join(' '))}&
     response_mode=query`;
   
   // Redirect user to authUrl
   ```

2. Handle callback and token exchange:
   ```typescript
   async function handleOutlookOAuthCallback(code: string): Promise<OAuthTokens> {
     const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: new URLSearchParams({
         code,
         client_id: config.clientId,
         client_secret: config.clientSecret,
         redirect_uri: config.redirectUri,
         grant_type: 'authorization_code'
       })
     });
     
     const tokens = await response.json();
     return {
       accessToken: tokens.access_token,
       refreshToken: tokens.refresh_token,
       expiry: Date.now() + tokens.expires_in * 1000
     };
   }
   ```

3. Token refresh handling:
   ```typescript
   async function refreshOutlookToken(refreshToken: string): Promise<string> {
     const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: new URLSearchParams({
         refresh_token: refreshToken,
         client_id: config.clientId,
         client_secret: config.clientSecret,
         grant_type: 'refresh_token',
         scope: config.scopes.join(' ')
       })
     });
     
     const tokens = await response.json();
     return tokens.access_token;
   }
   ```

##### Email Sending
1. Using Microsoft Graph API to send email:
   ```typescript
   async function sendOutlookEmail(
     oauthConfig: OutlookOAuthConfig,
     to: string, 
     subject: string, 
     text: string, 
     html: string
   ): Promise<boolean> {
     try {
       // Refresh token if expired
       if (oauthConfig.expiry && Date.now() > oauthConfig.expiry) {
         oauthConfig.accessToken = await refreshOutlookToken(oauthConfig.refreshToken);
         oauthConfig.expiry = Date.now() + 3600 * 1000; // 1 hour
         // Save updated tokens to database
       }
       
       const message = {
         message: {
           subject,
           body: {
             contentType: 'HTML',
             content: html || text
           },
           toRecipients: [
             {
               emailAddress: {
                 address: to
               }
             }
           ]
         },
         saveToSentItems: true
       };
       
       const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${oauthConfig.accessToken}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify(message)
       });
       
       return response.ok;
     } catch (error) {
       console.error('Outlook sending error:', error);
       return false;
     }
   }
   ```

#### Error Handling
- Handle token expiration and refresh failures
- Appropriate error messages for permission issues
- Retry logic for transient failures
- Fallback to alternative email provider if configured

#### Testing Procedures
1. OAuth flow testing (grant and revoke)
2. Token refresh testing
3. Email sending with various content types
4. HTML email rendering verification
5. Error condition simulations

### SMTP Direct

#### Overview
The application supports direct SMTP configuration for users who prefer to use their own SMTP servers.

#### Integration Requirements
- **Connection Details**: SMTP server, port, credentials
- **Security Options**: TLS/SSL support
- **Authentication**: Username/password

#### Implementation Details

##### Configuration Setup
```typescript
interface SMTPConfig {
  host: string;           // SMTP server hostname
  port: number;           // SMTP server port
  secure: boolean;        // Whether to use TLS (typically true for port 465)
  auth: {
    user: string;         // SMTP username
    pass: string;         // SMTP password
  }
  from: string;           // Default "From" email address
  replyTo?: string;       // Optional reply-to address
}
```

##### Email Sending
```typescript
import nodemailer from 'nodemailer';

async function createSMTPTransport(config: SMTPConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass
    }
  });
}

async function sendEmail(
  config: SMTPConfig,
  to: string, 
  subject: string, 
  text: string, 
  html: string
): Promise<boolean> {
  try {
    const transport = await createSMTPTransport(config);
    await transport.sendMail({
      from: config.from,
      replyTo: config.replyTo || config.from,
      to,
      subject,
      text,
      html
    });
    return true;
  } catch (error) {
    console.error('SMTP sending error:', error);
    return false;
  }
}
```

#### Error Handling
- Connection failures (server unreachable)
- Authentication failures
- Message rejection scenarios
- SSL/TLS certificate issues

#### Testing Procedures
1. Connection testing with provided credentials
2. Email delivery testing
3. Various SMTP providers (Gmail SMTP, Office365, etc.)
4. SSL/TLS configuration testing
5. Different port configurations (25, 587, 465)

## Messaging Integrations

### WhatsApp Business API

#### Overview
The application integrates with WhatsApp Business API to send notifications, reminders, and RSVP invitations.

#### Integration Requirements
- **API Provider**: An approved WhatsApp Business Solution Provider
- **Required Credentials**: API Key, Business Phone Number
- **Message Templates**: Pre-approved templates for structured messages
- **Rate Limits**: Varies by provider, typically 500-1000 messages per day

#### Implementation Details

##### Configuration Setup
```typescript
interface WhatsAppConfig {
  apiKey: string;             // Provider-specific API key
  businessPhoneNumber: string; // Your WhatsApp business number
  webhookSecret?: string;     // For receiving delivery status updates
  defaultTemplate: string;    // Default template name to use
  templates: {
    [key: string]: {
      name: string;           // Template name as registered with WhatsApp
      language: string;       // Language code (e.g., "en_US")
      components: {           // Components structure matching template
        type: string;         // "header" | "body" | "button"
        parameters: {
          type: string;       // "text" | "image" | "document" | "video"
          text?: string;      // For text parameters
          image_url?: string; // For image parameters
          // ...other parameter types
        }[];
      }[];
    }
  }
}
```

##### Authentication and Setup
```typescript
import axios from 'axios';

// This example uses a generic WhatsApp API provider
// The actual implementation depends on your chosen provider
class WhatsAppClient {
  private config: WhatsAppConfig;
  private apiBaseUrl: string;
  
  constructor(config: WhatsAppConfig) {
    this.config = config;
    this.apiBaseUrl = 'https://api.whatsapp-provider.com/v1'; // Provider-specific
  }
  
  private getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json'
    };
  }
  
  async validateConfig(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/businesses/${this.config.businessPhoneNumber}`,
        { headers: this.getAuthHeaders() }
      );
      return response.status === 200;
    } catch (error) {
      console.error('WhatsApp configuration validation error:', error);
      return false;
    }
  }
}
```

##### Sending Messages
```typescript
async function sendTemplateMessage(
  phoneNumber: string,
  templateName: string,
  parameters: Record<string, string | number | boolean>
): Promise<boolean> {
  try {
    // Find template configuration
    const template = this.config.templates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found in configuration`);
    }
    
    // Map parameters to template components
    const components = template.components.map(component => {
      return {
        type: component.type,
        parameters: component.parameters.map(param => {
          if (param.type === 'text') {
            // Replace placeholders in text parameters with actual values
            return {
              type: 'text',
              text: param.text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                return String(parameters[key] || match);
              })
            };
          }
          return param;
        })
      };
    });
    
    // Send the message
    const response = await axios.post(
      `${this.apiBaseUrl}/messages`,
      {
        to: phoneNumber,
        type: 'template',
        template: {
          name: template.name,
          language: {
            code: template.language
          },
          components
        }
      },
      { headers: this.getAuthHeaders() }
    );
    
    return response.status === 201;
  } catch (error) {
    console.error('WhatsApp message sending error:', error);
    return false;
  }
}

// Example of sending RSVP invitation
async function sendRSVPInvitation(
  guest: Guest,
  event: Event,
  rsvpLink: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const phoneNumber = guest.phone;
    if (!phoneNumber) {
      return { success: false, message: 'Guest has no phone number' };
    }
    
    const success = await this.sendTemplateMessage('rsvp_invitation', {
      guest_name: `${guest.firstName} ${guest.lastName}`,
      event_name: event.title,
      couple_names: event.coupleNames,
      rsvp_link: rsvpLink
    });
    
    return { 
      success, 
      message: success ? 'Invitation sent' : 'Failed to send invitation'
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Error sending invitation: ${error.message}`
    };
  }
}
```

##### Webhook Handling for Delivery Status
```typescript
function handleWhatsAppWebhook(req, res) {
  // Verify webhook signature
  const signature = req.headers['x-whatsapp-signature'];
  const expectedSignature = crypto
    .createHmac('sha256', config.webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');
    
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process message status updates
  const { statuses } = req.body;
  if (statuses && Array.isArray(statuses)) {
    for (const status of statuses) {
      // Update message status in database
      updateMessageStatus(status.id, status.status);
    }
  }
  
  res.status(200).send('OK');
}
```

#### Template Examples

1. **RSVP Invitation Template**:
   ```
   Template Name: rsvp_invitation
   Language: en_US
   Components:
   - Header (Text): "Wedding Invitation"
   - Body:
     "Hello {{guest_name}},
     
     You're invited to the wedding of {{couple_names}}!
     
     Please RSVP by clicking the link below:
     {{rsvp_link}}
     
     We look forward to your response."
   - Footer: "Reply with 'STOP' to unsubscribe"
   ```

2. **RSVP Confirmation Template**:
   ```
   Template Name: rsvp_confirmation
   Language: en_US
   Components:
   - Header (Text): "RSVP Confirmation"
   - Body:
     "Thank you, {{guest_name}}!
     
     We've received your RSVP for {{event_name}}.
     
     Status: {{rsvp_status}}
     
     We'll send you more details as the date approaches."
   - Footer: "Reply with 'STOP' to unsubscribe"
   ```

3. **Event Reminder Template**:
   ```
   Template Name: event_reminder
   Language: en_US
   Components:
   - Header (Text): "Event Reminder"
   - Body:
     "Hello {{guest_name}},
     
     This is a reminder about {{event_name}} on {{event_date}} at {{event_time}}.
     
     Location: {{event_location}}
     
     We look forward to seeing you!"
   - Footer: "Reply with 'STOP' to unsubscribe"
   ```

#### Error Handling
- Phone number validation
- Message template parameter validation
- Rate limit handling
- Message sending failures
- Delivery status tracking

#### Testing Procedures
1. Configuration validation
2. Template parameter mapping
3. Message sending to test numbers
4. Delivery status webhooks
5. Error condition simulations

### SMS Gateway (Future)

#### Overview
SMS integration will provide a fallback communication channel for guests without WhatsApp.

#### Key Requirements
- **API Integration**: Integration with SMS gateway provider
- **Authentication**: API key or other authentication method
- **Templates**: Predefined message templates
- **Internationalization**: Support for international phone numbers

#### Implementation Considerations
- Select SMS gateway provider with good coverage in target regions
- Implement phone number validation and formatting
- Create optimal message templates that fit within SMS character limits
- Track delivery status and provide retry mechanisms

## File Storage and Processing

### File Upload and Storage

#### Overview
The application handles file uploads for guest lists, images, and other documents.

#### Integration Requirements
- **Storage Location**: Local file system (for Replit deployment)
- **File Types**: Excel, CSV, images (JPEG, PNG)
- **Size Limits**: Max 10MB per file
- **Security**: File type validation, virus scanning (future)

#### Implementation Details

##### File Upload Configuration
```typescript
interface FileUploadConfig {
  uploadDir: string;        // Directory for uploaded files
  maxFileSize: number;      // Maximum file size in bytes
  allowedTypes: string[];   // Allowed MIME types
  maxFilesPerRequest: number; // Maximum number of files per request
}
```

##### File Upload Handler
```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs';

function configureFileUpload(config: FileUploadConfig) {
  // Ensure upload directory exists
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }
  
  // Configure storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, config.uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });
  
  // Configure file filter
  const fileFilter = (req, file, cb) => {
    if (config.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${config.allowedTypes.join(', ')}`));
    }
  };
  
  // Create upload middleware
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: config.maxFileSize,
      files: config.maxFilesPerRequest
    }
  });
}
```

##### API Endpoint for File Upload
```typescript
// Excel file upload endpoint
app.post('/api/admin/guests/import', 
  isAuthenticated,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      
      const filePath = req.file.path;
      const eventId = parseInt(req.body.eventId);
      
      // Process the Excel file
      const result = await processGuestExcel(filePath, eventId);
      
      // Clean up the file after processing
      fs.unlinkSync(filePath);
      
      res.json({
        success: true,
        message: `Successfully imported ${result.imported} guests`,
        imported: result.imported,
        errors: result.errors
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error importing guests: ${error.message}`
      });
    }
  }
);
```

##### File Serving
```typescript
// Serve uploaded files (if needed for public access)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

#### Error Handling
- File size limit exceeded
- Invalid file type
- Upload directory access issues
- File processing errors
- Cleanup of temporary files

#### Testing Procedures
1. File upload with valid files
2. File upload with oversized files
3. File upload with invalid file types
4. Concurrent file uploads
5. File access after upload

### Excel Processing

#### Overview
The application processes Excel files for guest imports and exports.

#### Integration Requirements
- **Library**: XLSX.js for Excel parsing
- **Format Support**: XLSX, XLS, CSV
- **Column Mapping**: Flexible mapping of columns to data fields
- **Validation**: Data validation during import

#### Implementation Details

##### Excel Processing Configuration
```typescript
interface ExcelProcessingConfig {
  requiredColumns: string[];        // Columns that must be present
  optionalColumns: string[];        // Optional columns
  defaultValues: Record<string, any>; // Default values for missing fields
  maxRows: number;                  // Maximum rows to process
}
```

##### Excel Import Processing
```typescript
import xlsx from 'xlsx';

async function processGuestExcel(
  filePath: string,
  eventId: number
): Promise<{ imported: number; errors: any[] }> {
  try {
    // Read Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      throw new Error('Excel file contains no data');
    }
    
    if (data.length > config.maxRows) {
      throw new Error(`Excel file contains too many rows (max: ${config.maxRows})`);
    }
    
    // Validate required columns
    const firstRow = data[0];
    const missingColumns = config.requiredColumns.filter(
      col => !Object.keys(firstRow).includes(col)
    );
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }
    
    // Process each row
    const results = {
      imported: 0,
      errors: []
    };
    
    for (const row of data) {
      try {
        // Map Excel row to guest data model
        const guestData = {
          eventId,
          firstName: row.FirstName,
          lastName: row.LastName,
          email: row.Email || null,
          phone: row.Phone || null,
          address: row.Address || null,
          side: row.Side || null,
          relationship: row.Relationship || null,
          groupName: row.Group || null,
          plusOneAllowed: row.PlusOneAllowed === 'Yes' || row.PlusOneAllowed === true,
          isVIP: row.VIP === 'Yes' || row.VIP === true,
          // Add default values for missing fields
          ...config.defaultValues
        };
        
        // Validate guest data
        const validationResult = validateGuestData(guestData);
        if (!validationResult.valid) {
          throw new Error(validationResult.error);
        }
        
        // Save guest to database
        await storage.createGuest(guestData);
        results.imported++;
      } catch (error) {
        results.errors.push({
          row: row.__rowNum__ + 1,
          error: error.message,
          data: row
        });
      }
    }
    
    return results;
  } catch (error) {
    throw new Error(`Excel processing error: ${error.message}`);
  }
}
```

##### Excel Export Generation
```typescript
async function generateGuestExcel(
  eventId: number,
  filters: any = {}
): Promise<string> {
  try {
    // Get guests from database
    const guests = await storage.getGuestsByEvent(eventId, filters);
    
    // Map guest data to Excel format
    const data = guests.map(guest => ({
      'First Name': guest.firstName,
      'Last Name': guest.lastName,
      'Email': guest.email || '',
      'Phone': guest.phone || '',
      'Address': guest.address || '',
      'Side': guest.side || '',
      'Relationship': guest.relationship || '',
      'Group': guest.groupName || '',
      'Plus One Allowed': guest.plusOneAllowed ? 'Yes' : 'No',
      'Plus One Name': guest.plusOneName || '',
      'RSVP Status': guest.rsvpStatus || 'Pending',
      'RSVP Date': guest.rsvpDate || '',
      'Dietary Restrictions': guest.dietaryRestrictions || '',
      'VIP': guest.isVIP ? 'Yes' : 'No'
    }));
    
    // Create a new workbook
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(data);
    
    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Guests');
    
    // Generate Excel file
    const outputPath = path.join(os.tmpdir(), `guests-${eventId}-${Date.now()}.xlsx`);
    xlsx.writeFile(workbook, outputPath);
    
    return outputPath;
  } catch (error) {
    throw new Error(`Excel generation error: ${error.message}`);
  }
}
```

#### Error Handling
- File format errors
- Data validation issues
- Memory constraints for large files
- Missing required columns
- Formatting inconsistencies

#### Testing Procedures
1. Import with valid Excel file
2. Import with missing required columns
3. Import with invalid data
4. Import with large number of rows
5. Export with various filters

## Authentication Providers

### OAuth 2.0 Authentication

#### Overview
The application uses OAuth 2.0 for authentication with third-party providers.

#### Integration Requirements
- **Provider Support**: Google, Microsoft
- **Authentication Flow**: Authorization Code flow with PKCE
- **Token Storage**: Secure storage of refresh tokens
- **Session Management**: Session-based authentication after OAuth

#### Implementation Details

##### OAuth Configuration
```typescript
interface OAuthConfig {
  provider: 'google' | 'microsoft';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  logoutUrl?: string;
}
```

##### OAuth Flow Implementation
```typescript
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

class OAuthHandler {
  private config: OAuthConfig;
  
  constructor(config: OAuthConfig) {
    this.config = config;
  }
  
  // Generate authorization URL with PKCE
  generateAuthUrl(): { url: string; codeVerifier: string; state: string } {
    // Generate code verifier and challenge for PKCE
    const codeVerifier = crypto.randomBytes(64).toString('hex');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
      
    // Generate state parameter for CSRF protection
    const state = uuidv4();
    
    // Construct authorization URL
    const authUrlParams = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge
    });
    
    return {
      url: `${this.config.authorizationUrl}?${authUrlParams.toString()}`,
      codeVerifier,
      state
    };
  }
  
  // Exchange authorization code for tokens
  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier
    });
    
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }
    
    const tokens = await response.json();
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      expiry: Date.now() + tokens.expires_in * 1000,
      tokenType: tokens.token_type
    };
  }
  
  // Get user information from OAuth provider
  async getUserInfo(accessToken: string): Promise<UserProfile> {
    const response = await fetch(this.config.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user information');
    }
    
    const data = await response.json();
    
    // Map provider-specific response to common user profile format
    if (this.config.provider === 'google') {
      return {
        providerId: 'google',
        providerUserId: data.sub,
        email: data.email,
        name: data.name,
        firstName: data.given_name,
        lastName: data.family_name,
        picture: data.picture
      };
    } else if (this.config.provider === 'microsoft') {
      return {
        providerId: 'microsoft',
        providerUserId: data.id,
        email: data.mail || data.userPrincipalName,
        name: data.displayName,
        firstName: data.givenName,
        lastName: data.surname,
        picture: null // Microsoft Graph doesn't directly provide a picture URL
      };
    }
    
    throw new Error(`Unsupported OAuth provider: ${this.config.provider}`);
  }
  
  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<Partial<OAuthTokens>> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken
    });
    
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }
    
    const tokens = await response.json();
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token, // Some providers issue a new refresh token
      expiry: Date.now() + tokens.expires_in * 1000
    };
  }
}
```

##### Express Authentication Routes
```typescript
// OAuth login initiation
app.get('/api/auth/:provider', (req, res) => {
  const { provider } = req.params;
  
  // Get OAuth configuration for provider
  const config = getOAuthConfig(provider);
  if (!config) {
    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  }
  
  const oauthHandler = new OAuthHandler(config);
  const { url, codeVerifier, state } = oauthHandler.generateAuthUrl();
  
  // Store codeVerifier and state in session for later verification
  req.session.oauthState = {
    provider,
    codeVerifier,
    state,
    redirectUrl: req.query.redirectUrl || '/'
  };
  
  res.redirect(url);
});

// OAuth callback handling
app.get('/api/auth/:provider/callback', async (req, res) => {
  const { provider } = req.params;
  const { code, state } = req.query;
  
  // Verify the state parameter matches what we set
  if (!req.session.oauthState || req.session.oauthState.state !== state) {
    return res.status(400).json({ error: 'Invalid OAuth state' });
  }
  
  const { codeVerifier, redirectUrl } = req.session.oauthState;
  delete req.session.oauthState; // Clean up
  
  try {
    // Get OAuth configuration for provider
    const config = getOAuthConfig(provider);
    if (!config) {
      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }
    
    const oauthHandler = new OAuthHandler(config);
    
    // Exchange code for tokens
    const tokens = await oauthHandler.exchangeCodeForTokens(code, codeVerifier);
    
    // Get user information
    const userProfile = await oauthHandler.getUserInfo(tokens.accessToken);
    
    // Find or create user in database
    const user = await findOrCreateUser(userProfile, provider, tokens.refreshToken);
    
    // Log user in
    req.session.userId = user.id;
    
    // Redirect to original destination
    res.redirect(redirectUrl);
  } catch (error) {
    res.status(500).json({ error: `Authentication failed: ${error.message}` });
  }
});
```

#### Error Handling
- OAuth flow interruptions
- Token exchange failures
- User info retrieval errors
- Account linking conflicts
- Refresh token failures

#### Testing Procedures
1. Complete OAuth flow testing
2. Token refresh testing
3. Session persistence testing
4. Multiple provider authentication
5. Error path testing

## Integration Security Requirements

### API Key Management
- **Storage**: All API keys must be stored in environment variables
- **Access Control**: Keys must not be exposed to clients
- **Rotation**: Keys should be rotatable without code changes
- **Monitoring**: Usage should be monitored for unusual patterns

### OAuth Token Security
- **Storage**: Refresh tokens must be encrypted before storage
- **Transport**: All token exchanges must use HTTPS
- **Access Control**: Access tokens must never be stored in client storage
- **Session Binding**: User sessions must be properly bound to authenticated identities

### Data Protection
- **PII**: All personally identifiable information must be protected
- **Encryption**: Sensitive data must be encrypted in transit and at rest
- **Minimization**: Only necessary data should be sent to third parties
- **Permissions**: Minimum required permissions should be requested from OAuth providers

### Integration Monitoring
- **Health Checks**: Regular automated checks of integration health
- **Error Tracking**: Aggregated error tracking and alerting
- **Usage Metrics**: Monitoring of API call volumes and limits
- **Performance**: Tracking of integration response times

## Error Handling and Fallback Strategies

### Error Classification
- **Transient Errors**: Temporary issues that can be retried (network issues, rate limits)
- **Permanent Errors**: Permanent failures requiring intervention (invalid credentials, permission issues)
- **Data Errors**: Issues with the data being processed (invalid format, missing fields)

### Retry Strategies
- **Exponential Backoff**: For transient errors, retry with increasing delays
- **Circuit Breaker**: After multiple failures, stop retrying to prevent cascading failures
- **Fallback Providers**: Switch to alternative providers when primary fails

### Error Reporting
- **User Messaging**: Clear, actionable error messages for end users
- **Admin Notifications**: Detailed error reports for administrators
- **Logging**: Comprehensive error logging for debugging

### Fallback Mechanisms
1. **Email Communication**:
   - Primary: OAuth-based providers (Gmail, Outlook)
   - Fallback: Direct SMTP if OAuth fails
   - Last Resort: Store messages for manual sending

2. **WhatsApp Messaging**:
   - Fallback: Email if WhatsApp delivery fails
   - Contingency: SMS for critical messages (future)

3. **File Processing**:
   - Alternative parsing methods for problematic files
   - Support for multiple file formats (XLSX, CSV)

## Testing and Validation Procedures

### Integration Testing Matrix

| Integration | Test Case | Expected Outcome | Validation Method |
|-------------|-----------|------------------|-------------------|
| Gmail OAuth | Initial setup | Successfully authenticate and store tokens | Manual verification |
| Gmail OAuth | Send test email | Email delivered successfully | Manual verification |
| Gmail OAuth | Token refresh | Automatic token refresh when expired | Automated test |
| Outlook OAuth | Initial setup | Successfully authenticate and store tokens | Manual verification |
| Outlook OAuth | Send test email | Email delivered successfully | Manual verification |
| Outlook OAuth | Token refresh | Automatic token refresh when expired | Automated test |
| SMTP | Configuration | Successfully connect to SMTP server | Automated test |
| SMTP | Send test email | Email delivered successfully | Manual verification |
| WhatsApp | Configuration | Successfully validate API credentials | Automated test |
| WhatsApp | Send template message | Message delivered successfully | Manual verification |
| WhatsApp | Receive delivery status | Webhook correctly processes status updates | Automated test |
| File Upload | Upload Excel | File uploaded and processed | Automated test |
| File Upload | Upload invalid file | Appropriate error message | Automated test |
| Excel Processing | Import valid file | Guests created in database | Automated test |
| Excel Processing | Export guests | File generated with correct data | Automated test |
| OAuth Auth | Login flow | User authenticated successfully | Manual verification |
| OAuth Auth | Session management | Session persists appropriately | Automated test |

### Integration Test Environments
- **Development**: Local testing of integrations with test accounts
- **Staging**: Integration testing with sandbox/test API credentials
- **Production**: Final validation with production credentials

### Validation Checklist
1. **Initial Configuration**:
   - Verify credentials are accepted
   - Confirm permissions are granted
   - Test connection establishment

2. **Basic Functionality**:
   - Send test messages/requests
   - Verify delivery/processing
   - Check response handling

3. **Error Handling**:
   - Test with invalid credentials
   - Simulate network failures
   - Test rate limit handling

4. **Performance**:
   - Measure response times
   - Test with batch operations
   - Verify resource utilization

5. **Security**:
   - Verify secure credential storage
   - Test permission boundaries
   - Validate data protection measures