import { Resend } from 'resend';
import { Guest, WeddingEvent } from '@shared/schema';
import * as SendGrid from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import axios from 'axios';
import { storage } from '../storage';

/**
 * Email service that supports multiple providers
 * Currently implemented: Gmail, Outlook, SendGrid, Resend
 */
export class EmailService {
  // Provider types we support
  private static readonly PROVIDER_RESEND = 'resend';
  private static readonly PROVIDER_SENDGRID = 'sendgrid';
  private static readonly PROVIDER_GMAIL = 'gmail';
  private static readonly PROVIDER_OUTLOOK = 'outlook';

  private provider: string;
  private apiKey: string | null;
  private resendClient: Resend | null = null;
  private sendGridClient: typeof SendGrid | null = null;
  private nodemailerTransport: nodemailer.Transporter | null = null;
  private eventId: number;
  private defaultFromEmail: string;
  private eventName: string;
  private event: WeddingEvent | null = null;

  constructor(eventId: number, provider: string, apiKey: string | null = null, defaultFromEmail: string = '', eventName: string = '', event: WeddingEvent | null = null) {
    this.eventId = eventId;
    this.provider = provider.toLowerCase();
    this.apiKey = apiKey;
    this.defaultFromEmail = defaultFromEmail;
    this.eventName = eventName;
    this.event = event;

    // Initialize the appropriate client based on provider
    try {
      if (this.provider === EmailService.PROVIDER_RESEND && this.apiKey) {
        this.resendClient = new Resend(this.apiKey);
        // Resend client initialized successfully
      } 
      else if (this.provider === EmailService.PROVIDER_SENDGRID && this.apiKey) {
        this.sendGridClient = SendGrid;
        this.sendGridClient.setApiKey(this.apiKey);
        // SendGrid client initialized successfully
      }
      else if (this.provider === EmailService.PROVIDER_GMAIL) {
        try {
          // Use the stored event data for OAuth2 configuration
          if (!this.event) {
            throw new Error('No event data available for Gmail OAuth2 configuration');
            return;
          }

          // Extract the email address from the formatted email if needed
          let userEmail = defaultFromEmail;
          if (userEmail.includes('<') && userEmail.includes('>')) {
            userEmail = userEmail.match(/<([^>]+)>/)?.[1] || userEmail;
          }
          
          let transport: any;
          
          // Check if we should use OAuth2 or direct SMTP
          if (this.event.useGmailDirectSMTP) {
            // Use direct SMTP with password (less secure, but more reliable in some cases)
            transport = {
              host: this.event.gmailSmtpHost || 'smtp.gmail.com', // Default Gmail SMTP server
              port: this.event.gmailSmtpPort || 587, // Default Gmail SMTP port
              secure: this.event.gmailSmtpSecure !== undefined ? this.event.gmailSmtpSecure : false, // Default to false which enables STARTTLS
              auth: {
                user: this.event.gmailAccount || userEmail, // Use configured account or extract from from email
                pass: this.event.gmailPassword
              },
              tls: {
                // Do not fail on invalid certs
                rejectUnauthorized: false
              }
            };

            
            // Extra debugging for SMTP configuration
            if (!transport.auth.user) {
              
            }
            if (!transport.auth.pass) {
              
            }
          } else {
            // Use OAuth2 (more secure but requires proper OAuth setup)
            const clientId = this.event.gmailClientId || process.env.GMAIL_CLIENT_ID;
            const clientSecret = this.event.gmailClientSecret || process.env.GMAIL_CLIENT_SECRET;
            
            if (!clientId || !clientSecret) {
              
              throw new Error("Gmail OAuth credentials not properly configured");
            }
            
            // Enhanced OAuth2 implementation based on Nodemailer best practices
            // Creates a proper OAuth2 implementation that can refresh tokens automatically
            const oauth2Client = {
              user: userEmail,
              clientId: clientId,
              clientSecret: clientSecret,
              refreshToken: this.event.gmailRefreshToken,
              // If we have an access token and expires timestamp, use them
              accessToken: this.apiKey || this.event.gmailAccessToken,
              expires: this.event.gmailTokenExpiry 
                ? new Date(this.event.gmailTokenExpiry).getTime() 
                : undefined
            };
            

            
            transport = {
              service: 'gmail',
              auth: {
                type: 'OAuth2',
                ...oauth2Client
              },
              debug: true // Enable debug output for troubleshooting
            };
            
            // Extra debugging for OAuth2 configuration
            if (!oauth2Client.user) {
              
            }
            if (!oauth2Client.refreshToken) {
              
            }
          }
          
          this.nodemailerTransport = nodemailer.createTransport(transport as any);

        } catch (err) {
          
        }
      }
      else if (this.provider === EmailService.PROVIDER_OUTLOOK && this.apiKey) {
        try {
          // Use the stored event data for Outlook OAuth2 configuration
          if (!this.event) {
            
            return;
          }
          
          // Extract the email address from the formatted email if needed
          let userEmail = defaultFromEmail;
          if (userEmail.includes('<') && userEmail.includes('>')) {
            userEmail = userEmail.match(/<([^>]+)>/)?.[1] || userEmail;
          }
          
          const transport = {
            service: 'Outlook365',
            auth: {
              type: 'OAuth2',
              user: userEmail,
              clientId: this.event.outlookClientId || process.env.OUTLOOK_CLIENT_ID,
              clientSecret: this.event.outlookClientSecret || process.env.OUTLOOK_CLIENT_SECRET,
              refreshToken: this.event.outlookRefreshToken,
              accessToken: this.apiKey
            }
          };
          
          this.nodemailerTransport = nodemailer.createTransport(transport as any);

        } catch (err) {
          
        }
      }
    } catch (error) {
      
    }
  }

  /**
   * Check if the email service is configured and ready to use
   */
  public isConfigured(): boolean {
    // Check if we have a from email address
    if (!this.defaultFromEmail) {
      
      return false;
    }

    // Check provider-specific configuration
    if (this.provider === EmailService.PROVIDER_RESEND) {
      return !!this.resendClient;
    }
    else if (this.provider === EmailService.PROVIDER_SENDGRID) {
      return !!this.sendGridClient;
    }
    else if (this.provider === EmailService.PROVIDER_GMAIL) {
      // The transport might be initialized but with incorrect credentials
      // Check if the event data is available
      if (!this.event) {
        
        return false;
      }
      
      // For Gmail, we need to check if either direct SMTP or OAuth is properly configured
      if (this.event.useGmailDirectSMTP) {
        // Direct SMTP requires a password and gmailAccount (email address)
        if (!this.event.gmailPassword) {
          
          return false;
        }
        
        // Extract the email address from the defaultFromEmail if no gmailAccount is configured
        const userEmail = this.event.gmailAccount || this.extractEmailAddress(this.defaultFromEmail);
        if (!userEmail) {
          
          return false;
        }
      } else {
        // OAuth requires client ID, client secret, and refresh token
        const hasClientId = !!(this.event.gmailClientId || process.env.GMAIL_CLIENT_ID);
        const hasClientSecret = !!(this.event.gmailClientSecret || process.env.GMAIL_CLIENT_SECRET);
        const hasRefreshToken = !!this.event.gmailRefreshToken;
        
        if (!hasClientId || !hasClientSecret || !hasRefreshToken) {
          
          return false;
        }
      }
      
      // Check if transport is initialized
      if (!this.nodemailerTransport) {
        
        return false;
      }
      
      return true;
    }
    else if (this.provider === EmailService.PROVIDER_OUTLOOK) {
      // Check similar configuration requirements for Outlook
      if (!this.event) {
        
        return false;
      }
      
      // OAuth requires client ID, client secret, and refresh token
      const hasClientId = !!(this.event.outlookClientId || process.env.OUTLOOK_CLIENT_ID);
      const hasClientSecret = !!(this.event.outlookClientSecret || process.env.OUTLOOK_CLIENT_SECRET);
      const hasRefreshToken = !!this.event.outlookRefreshToken;
      
      if (!hasClientId || !hasClientSecret || !hasRefreshToken) {
        
        return false;
      }
      
      // Check if transport is initialized
      if (!this.nodemailerTransport) {
        
        return false;
      }
      
      return true;
    }
    
    
    return false;
  }
  
  /**
   * Helper method to extract email address from a formatted email string
   * @param formattedEmail Email in the format "Name <email@example.com>" or just "email@example.com"
   * @returns Extracted email address or original string if no email format is detected
   */
  private extractEmailAddress(formattedEmail: string): string {
    if (!formattedEmail) return '';
    
    // Check if the email is in the format "Name <email@example.com>"
    if (formattedEmail.includes('<') && formattedEmail.includes('>')) {
      const match = formattedEmail.match(/<([^>]+)>/);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Simple validation to check if it looks like an email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(formattedEmail)) {
      return formattedEmail;
    }
    
    
    return '';
  }
  
  /**
   * Test the email configuration by verifying connection
   * @returns Promise resolving to an object containing success status and message
   */
  public async testConnection(): Promise<{ success: boolean, message: string }> {
    try {
      if (!this.isConfigured()) {
        return { 
          success: false, 
          message: `Email service (${this.provider}) is not properly configured` 
        };
      }
      
      if (this.provider === EmailService.PROVIDER_GMAIL || this.provider === EmailService.PROVIDER_OUTLOOK) {
        // First check if we have the transport
        if (!this.nodemailerTransport) {
          return { 
            success: false, 
            message: `${this.provider} transport is not initialized` 
          };
        }
        
        try {
          // Test connection using nodemailer's verify method with a timeout
          const verifyPromise = this.nodemailerTransport.verify();
          const timeoutPromise = new Promise((_, reject) => {
            const timeoutId = setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
            // No cleanup needed here as Promise.race will handle resolution
          });
          
          await Promise.race([verifyPromise, timeoutPromise]);
          
          return { 
            success: true, 
            message: `${this.provider} connection verified successfully` 
          };
        } catch (err: any) {
          
          return {
            success: false,
            message: `Connection test failed: ${err.message}`
          };
        }
      }
      else if (this.provider === EmailService.PROVIDER_RESEND) {
        if (!this.resendClient) {
          return { 
            success: false, 
            message: 'Resend client is not initialized' 
          };
        }
        
        try {
          // For Resend, we'll do a simple API check (domain list)
          const domains = await this.resendClient.domains.list();
          return { 
            success: true, 
            message: 'Resend API connection verified successfully'
          };
        } catch (err: any) {
          
          return {
            success: false,
            message: `Resend API test failed: ${err.message}`
          };
        }
      }
      else if (this.provider === EmailService.PROVIDER_SENDGRID) {
        if (!this.sendGridClient) {
          return { 
            success: false, 
            message: 'SendGrid client is not initialized' 
          };
        }
        
        // For SendGrid, we can't easily test without sending an email
        // So we'll just consider it valid if the API key format looks correct
        const apiKey = this.apiKey || '';
        if (!apiKey.startsWith('SG.') || apiKey.length < 50) {
          return { 
            success: false, 
            message: 'SendGrid API key appears to be invalid'
          };
        }
        
        try {
          // Make a basic API call to check if the API key works
          // We'll use the most lightweight API endpoint available
          const response = await fetch('https://api.sendgrid.com/v3/user/credits', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            return { 
              success: true, 
              message: 'SendGrid API connection verified successfully'
            };
          } else {
            return {
              success: false,
              message: `SendGrid API test failed with status ${response.status}: ${response.statusText}`
            };
          }
        } catch (err: any) {
          
          return {
            success: false,
            message: `SendGrid API test failed: ${err.message}`
          };
        }
      }
      
      return { 
        success: false, 
        message: `Unknown provider: ${this.provider}` 
      };
    } catch (error: any) {
      
      return {
        success: false,
        message: `Connection test failed: ${error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Send a simple email
   */
  public async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
    text?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const { to, subject, html, text, from } = options;
    const fromEmail = from || this.defaultFromEmail;

    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Email service not properly configured. Check API key and from email.'
      };
    }

    try {
      // Format recipient(s) as an array
      const toAddresses = Array.isArray(to) ? to : [to];
      
      // Handle different providers
      if (this.provider === EmailService.PROVIDER_RESEND) {
        if (!this.resendClient) {
          return { success: false, error: 'Resend client not initialized' };
        }
        
        const response = await this.resendClient.emails.send({
          from: fromEmail,
          to: toAddresses,
          subject,
          html,
          text: text || undefined,
        });

        if (response.error) {
          
          return {
            success: false,
            error: response.error.message
          };
        }

        return {
          success: true,
          id: response.data?.id
        };
      }
      
      else if (this.provider === EmailService.PROVIDER_SENDGRID) {
        if (!this.sendGridClient) {
          return { success: false, error: 'SendGrid client not initialized' };
        }
        
        const msg = {
          to: toAddresses,
          from: fromEmail,
          subject: subject,
          text: text || '',
          html: html,
        };
        
        try {
          const response = await this.sendGridClient.send(msg);

          
          return {
            success: true,
            id: response?.[0]?.headers['x-message-id'] || 'unknown'
          };
        } catch (error: any) {
          
          
          if (error.response) {
            // Extract more detailed error information
            const errorDetails = error.response.body?.errors?.map((err: any) => err.message).join(', ') 
              || error.message;
              
            return {
              success: false,
              error: `SendGrid error: ${errorDetails}`
            };
          }
          
          return {
            success: false,
            error: `SendGrid error: ${error.message}`
          };
        }
      }
      
      else if (this.provider === EmailService.PROVIDER_GMAIL || this.provider === EmailService.PROVIDER_OUTLOOK) {
        if (!this.nodemailerTransport) {
          return { 
            success: false, 
            error: `${this.provider} transport not initialized` 
          };
        }
        
        // For nodemailer, we need to extract the email address from the formatted from string
        // if it's in the format "Name <email@example.com>"
        let fromEmailAddress = fromEmail;
        if (fromEmail.includes('<') && fromEmail.includes('>')) {
          fromEmailAddress = fromEmail.match(/<([^>]+)>/)?.[1] || fromEmail;
        }
        
        try {
          const mailOptions = {
            from: fromEmail,
            to: toAddresses.join(', '),
            subject: subject,
            text: text || '',
            html: html
          };
          
          // Attempting to send email via OAuth provider
          
          try {
            const info = await this.nodemailerTransport.sendMail(mailOptions);
            // Email sent successfully via OAuth provider
            
            return {
              success: true,
              id: info.messageId
            };
          } catch (error) {
            
            
            // Check for common OAuth errors
            const errorMessage = (error as any)?.message || '';
            const errorCode = (error as any)?.code || '';
            
            const needsTokenRefresh = 
              errorMessage.includes('invalid_grant') ||
              errorMessage.includes('Invalid login') ||
              errorMessage.includes('invalid access token') ||
              errorCode === 'EAUTH';
            
            if (needsTokenRefresh && this.event) {
              
              try {
                const refreshed = await this.refreshOAuthToken();
                if (refreshed) {
                  
                  
                  // Retry sending the email with the refreshed token
                  const retryInfo = await this.nodemailerTransport.sendMail(mailOptions);
                  // Email sent successfully after token refresh
                  
                  return {
                    success: true,
                    id: retryInfo.messageId
                  };
                }
              } catch (refreshError) {
                
              }
            }
            
            if (errorMessage.includes('invalid_grant')) {
              
            }
            
            if (errorCode === 'EAUTH') {
              
            }
            
            throw error;
          }
        } catch (error: any) {
          
          
          return {
            success: false,
            error: `${this.provider} error: ${error.message}`
          };
        }
      }

      // If we get here, the provider is not supported
      return {
        success: false,
        error: `Unsupported email provider: ${this.provider}`
      };
    } catch (error: any) {
      
      return {
        success: false,
        error: error.message || 'Unknown error sending email'
      };
    }
  }

  /**
   * Send an RSVP form email to a guest
   */
  public async sendRSVPEmail(guest: Guest, event: WeddingEvent, rsvpLink: string): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!guest.email) {
      return {
        success: false,
        error: 'Guest email is required'
      };
    }

    const guestName = `${guest.firstName} ${guest.lastName}`;
    const subject = `RSVP Request for ${event.title}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #9c27b0; text-align: center; padding-bottom: 10px; border-bottom: 1px solid #eee;">
          ${event.title}
        </h2>
        <p>Dear ${guestName},</p>
        <p>
          You are cordially invited to celebrate the wedding of <strong>${event.brideName}</strong> and <strong>${event.groomName}</strong>.
        </p>
        <p>
          <strong>When:</strong> ${event.startDate} to ${event.endDate}<br>
          <strong>Where:</strong> ${event.location}
        </p>
        <p>
          Please let us know if you'll be joining us by clicking the link below to complete your RSVP:
        </p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${rsvpLink}" style="background-color: #9c27b0; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            RSVP Now
          </a>
        </p>
        <p>
          If the button doesn't work, you can copy and paste this link into your browser:<br>
          <a href="${rsvpLink}">${rsvpLink}</a>
        </p>
        <p>
          We look forward to celebrating with you!
        </p>
        <p style="font-style: italic; color: #666;">
          ${event.brideName} & ${event.groomName}
        </p>
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
          This invitation was sent by ${event.title} Wedding RSVP System
        </div>
      </div>
    `;

    const text = `
Dear ${guestName},

You are cordially invited to celebrate the wedding of ${event.brideName} and ${event.groomName}.

When: ${event.startDate} to ${event.endDate}
Where: ${event.location}

Please let us know if you'll be joining us by visiting:
${rsvpLink}

We look forward to celebrating with you!

${event.brideName} & ${event.groomName}
    `;

    return this.sendEmail({
      to: guest.email,
      subject,
      html,
      text
    });
  }

  /**
   * Refresh OAuth token for the current provider
   * Returns true if the token was successfully refreshed
   */
  private async refreshOAuthToken(): Promise<boolean> {
    if (!this.event) {
      
      return false;
    }

    try {
      if (this.provider === EmailService.PROVIDER_GMAIL) {
        // Refresh Gmail token
        if (!this.event.gmailRefreshToken) {
          
          return false;
        }
        
        // Use event-specific credentials or fall back to environment variables
        const clientId = this.event.gmailClientId || process.env.GMAIL_CLIENT_ID;
        const clientSecret = this.event.gmailClientSecret || process.env.GMAIL_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
          
          return false;
        }
        
        
        
        const response = await axios.post(
          "https://oauth2.googleapis.com/token",
          new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: this.event.gmailRefreshToken,
            grant_type: "refresh_token",
          }).toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        
        const { access_token, expires_in } = response.data;
        
        if (!access_token) {
          
          return false;
        }
        
        // Update the token in the database
        await storage.updateEventEmailConfig(this.eventId, {
          gmailAccessToken: access_token,
          gmailTokenExpiry: new Date(Date.now() + expires_in * 1000),
        });
        
        // Update the current instance
        this.apiKey = access_token;
        
        // Reinitialize the transport with the new token
        const transport = {
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: this.event.gmailAccount,
            clientId,
            clientSecret,
            refreshToken: this.event.gmailRefreshToken,
            accessToken: access_token
          }
        };
        
        this.nodemailerTransport = nodemailer.createTransport(transport as any);
        
        
        return true;
      }
      else if (this.provider === EmailService.PROVIDER_OUTLOOK) {
        // Refresh Outlook token
        if (!this.event.outlookRefreshToken) {
          
          return false;
        }
        
        // Use event-specific credentials or fall back to environment variables
        const clientId = this.event.outlookClientId || process.env.OUTLOOK_CLIENT_ID;
        const clientSecret = this.event.outlookClientSecret || process.env.OUTLOOK_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
          
          return false;
        }
        
        
        
        const response = await axios.post(
          "https://login.microsoftonline.com/common/oauth2/v2.0/token",
          new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: this.event.outlookRefreshToken,
            grant_type: "refresh_token",
            scope: "https://outlook.office.com/SMTP.Send offline_access",
          }).toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        
        const { access_token, expires_in, refresh_token } = response.data;
        
        if (!access_token) {
          
          return false;
        }
        
        // Update tokens in the database
        const updateData: any = {
          outlookAccessToken: access_token,
          outlookTokenExpiry: new Date(Date.now() + expires_in * 1000)
        };
        
        // If a new refresh token was provided, update that too
        if (refresh_token) {
          updateData.outlookRefreshToken = refresh_token;
        }
        
        await storage.updateEventEmailConfig(this.eventId, updateData);
        
        // Update the current instance
        this.apiKey = access_token;
        
        // Reinitialize the transport with the new token
        const transport = {
          service: 'Outlook365',
          auth: {
            type: 'OAuth2',
            user: this.event.outlookAccount,
            clientId,
            clientSecret,
            refreshToken: refresh_token || this.event.outlookRefreshToken,
            accessToken: access_token
          }
        };
        
        this.nodemailerTransport = nodemailer.createTransport(transport as any);
        
        
        return true;
      }
      
      
      return false;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Create an EmailService instance from an event object
   */
  public static fromEvent(event: WeddingEvent): EmailService {
    if (!event) {
      throw new Error('Event is required to create an email service');
    }

    // Extract email configuration from the event
    const emailProvider = event.emailProvider || 'resend';
    
    // Determine the API key to use based on the event's configuration
    let emailApiKey = null;
    
    // First try the direct API key in the event object
    if (event.emailApiKey) {
      emailApiKey = event.emailApiKey;
      
    }
    // If Gmail is configured and selected as provider
    else if (event.useGmail && emailProvider === 'gmail') {
      // Check if we're using direct SMTP or OAuth
      if (event.useGmailDirectSMTP) {
        // For direct SMTP, the API key is still null, but we'll use the password stored in the event
        emailApiKey = null; // Not used for direct SMTP
        
      } 
      // If using OAuth, use the access token
      else if (event.gmailAccessToken) {
        emailApiKey = event.gmailAccessToken;
        
      }
    }
    // If Outlook is configured and selected as provider, use Outlook OAuth tokens
    else if (event.useOutlook && emailProvider === 'outlook' && event.outlookAccessToken) {
      emailApiKey = event.outlookAccessToken;
      
    }
    // If SendGrid is configured and selected as provider, use SendGrid API key
    else if (event.useSendGrid && emailProvider === 'sendgrid' && event.sendGridApiKey) {
      emailApiKey = event.sendGridApiKey;
      
    }
    // Fallback to environment variables if available
    else if (process.env.RESEND_API_KEY && emailProvider === 'resend') {
      emailApiKey = process.env.RESEND_API_KEY;
      
    }
    
    // Special handling for Gmail Direct SMTP - we don't have an API key but it's still valid
    if (!emailApiKey && !(emailProvider === 'gmail' && event.useGmailDirectSMTP)) {
      
    }
    
    // Determine from email address
    // Default format is "Wedding of [Couple] <noreply@domain.com>"
    const fromName = `Wedding of ${event.coupleNames}`;
    const fromDomain = event.emailFromDomain || 'example.com';
    const fromEmail = event.emailFromAddress || `noreply@${fromDomain}`;
    const formattedFromEmail = `${fromName} <${fromEmail}>`;

    // Log the email configuration (without API key details for security)
    let configMethod = !!emailApiKey ? "API Key" : "No API Key";
    if (emailProvider === 'gmail' && event.useGmailDirectSMTP) {
      configMethod = "Direct SMTP";
    }

    // Email service configured for event

    return new EmailService(
      event.id,
      emailProvider,
      emailApiKey,
      formattedFromEmail,
      event.title,
      event
    );
  }
}

/**
 * Get the RSVP link for a guest
 */
export function generateRSVPLink(baseUrl: string, eventId: number, guestId: number, token: string): string {
  return `${baseUrl}/guest-rsvp/${token}`;
}