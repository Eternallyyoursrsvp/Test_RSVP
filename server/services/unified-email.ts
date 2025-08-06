import nodemailer, { Transporter } from 'nodemailer';
import { google } from 'googleapis';
import { storage } from '../storage';
import { db } from '../db';
import { events } from '@shared/schema';
import { eq } from 'drizzle-orm';


/**
 * Email provider types supported by the application
 */
export enum EmailProvider {
  GMAIL = 'gmail',
  OUTLOOK = 'outlook',
  SMTP = 'smtp'
}

/**
 * Email sending result interface
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * OAuth token structure
 */
interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiry: number; // Timestamp in milliseconds
}

/**
 * Email options interface
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

/**
 * Enhanced unified email service that supports multiple providers
 * with proper OAuth handling and fallback mechanisms
 */
export class UnifiedEmailService {
  private eventId: number;
  private provider: EmailProvider;
  private fromEmail: string;
  private eventName: string;
  private transport: Transporter | null = null;
  private fallbackProvider: EmailProvider | null = null;
  private fallbackTransport: Transporter | null = null;
  private lastError: string | null = null;
  private initialized: boolean = false;

  /**
   * Create a new UnifiedEmailService
   * 
   * @param eventId The event ID
   * @param provider Primary email provider
   * @param fromEmail From email address
   * @param eventName Event name for email subjects
   * @param fallbackProvider Optional fallback provider if primary fails
   */
  constructor(
    eventId: number, 
    provider: EmailProvider, 
    fromEmail: string, 
    eventName: string,
    fallbackProvider: EmailProvider | null = null
  ) {
    this.eventId = eventId;
    this.provider = provider;
    this.fromEmail = fromEmail;
    this.eventName = eventName;
    this.fallbackProvider = fallbackProvider;
  }

  /**
   * Initialize the email service and transport
   */
  public async initialize(): Promise<boolean> {
    try {
      // Get event data with email configuration
      const event = await this.getEventData();
      if (!event) {
        this.lastError = `Event not found: ${this.eventId}`;
        
        return false;
      }

      // Initialize primary transport
      let primarySuccess = false;
      try {
        this.transport = await this.createTransport(this.provider, event);
        primarySuccess = !!this.transport;
      } catch (error) {
        this.lastError = `Failed to create primary transport (${this.provider}): ${error.message}`;
        
      }

      // Initialize fallback transport if needed and configured
      if (this.fallbackProvider && (!primarySuccess || this.provider !== this.fallbackProvider)) {
        try {
          this.fallbackTransport = await this.createTransport(this.fallbackProvider, event);
        } catch (error) {
          
        }
      }

      this.initialized = primarySuccess || !!this.fallbackTransport;
      return this.initialized;
    } catch (error) {
      this.lastError = `Error initializing email service: ${error.message}`;
      
      return false;
    }
  }

  /**
   * Get the event data with email configuration
   */
  private async getEventData() {
    try {
      const [event] = await db.select().from(events).where(eq(events.id, this.eventId));
      return event;
    } catch (error) {
      
      return null;
    }
  }

  /**
   * Create a nodemailer transport for the specified provider
   */
  private async createTransport(provider: EmailProvider, event: any): Promise<Transporter> {
    switch (provider) {
      case EmailProvider.GMAIL:
        return this.createGmailTransport(event);
      
      case EmailProvider.OUTLOOK:
        return this.createOutlookTransport(event);
      
      case EmailProvider.SMTP:
        return this.createSMTPTransport(event);
      
      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }

  /**
   * Create a Gmail transport using OAuth2
   */
  private async createGmailTransport(event: any): Promise<Transporter> {
    // Check if using direct SMTP
    if (event.useGmailDirectSMTP) {
      if (!event.gmailPassword) {
        throw new Error('Gmail direct SMTP is enabled but no password is configured');
      }
      
      const userEmail = event.gmailAccount || this.extractEmailAddress(this.fromEmail);
      if (!userEmail) {
        throw new Error('Gmail direct SMTP is enabled but no account email is configured');
      }
      
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: userEmail,
          pass: event.gmailPassword
        }
      });
    }
    
    // Using OAuth2
    const clientId = event.gmailClientId || process.env.GMAIL_CLIENT_ID;
    const clientSecret = event.gmailClientSecret || process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = event.gmailRefreshToken;
    
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Gmail OAuth not properly configured - missing credentials');
    }
    
    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      event.gmailRedirectUri || `${process.env.BASE_URL || 'http://localhost:3000'}/api/oauth/gmail/callback`
    );
    
    // Check if token needs refreshing
    let accessToken = event.gmailAccessToken;
    const tokenExpiry = event.gmailTokenExpiry ? new Date(event.gmailTokenExpiry).getTime() : 0;
    
    if (!accessToken || Date.now() >= tokenExpiry) {
      try {
        // Set credentials to get a new access token
        oauth2Client.setCredentials({
          refresh_token: refreshToken
        });
        
        // Get new access token
        const tokenResponse = await oauth2Client.getAccessToken();
        if (!tokenResponse.token) {
          throw new Error('Failed to refresh Gmail access token');
        }
        
        accessToken = tokenResponse.token;
        
        // Update token in database
        const expiryTime = oauth2Client.credentials.expiry_date;
        await db.update(events)
          .set({
            gmailAccessToken: accessToken,
            gmailTokenExpiry: expiryTime ? new Date(expiryTime) : null
          })
          .where(eq(events.id, this.eventId));
        
        
      } catch (error) {
        throw new Error(`Error refreshing Gmail access token: ${error.message}`);
      }
    }
    
    // Create transport with OAuth2
    const userEmail = event.gmailAccount || this.extractEmailAddress(this.fromEmail);
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: userEmail,
        clientId,
        clientSecret,
        refreshToken,
        accessToken
      }
    });
  }

  /**
   * Create an Outlook transport using OAuth2
   */
  private async createOutlookTransport(event: any): Promise<Transporter> {
    const clientId = event.outlookClientId || process.env.OUTLOOK_CLIENT_ID;
    const clientSecret = event.outlookClientSecret || process.env.OUTLOOK_CLIENT_SECRET;
    const refreshToken = event.outlookRefreshToken;
    
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Outlook OAuth not properly configured - missing credentials');
    }
    
    // Check if token needs refreshing
    let accessToken = event.outlookAccessToken;
    const tokenExpiry = event.outlookTokenExpiry ? new Date(event.outlookTokenExpiry).getTime() : 0;
    
    if (!accessToken || Date.now() >= tokenExpiry) {
      try {
        // Microsoft identity platform token endpoint
        const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
        
        // Request new access token
        const response = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            scope: 'https://graph.microsoft.com/mail.send offline_access'
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Token refresh error: ${errorData.error_description || errorData.error}`);
        }
        
        const tokenData = await response.json();
        accessToken = tokenData.access_token;
        
        // Calculate expiry time
        const expiryTime = Date.now() + (tokenData.expires_in * 1000);
        
        // Update token in database
        await db.update(events)
          .set({
            outlookAccessToken: accessToken,
            outlookTokenExpiry: new Date(expiryTime)
          })
          .where(eq(events.id, this.eventId));
        
        
      } catch (error) {
        throw new Error(`Error refreshing Outlook access token: ${error.message}`);
      }
    }
    
    // Create transport with OAuth2
    const userEmail = event.outlookAccount || this.extractEmailAddress(this.fromEmail);
    return nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: {
        type: 'OAuth2',
        user: userEmail,
        clientId,
        clientSecret,
        refreshToken,
        accessToken
      }
    });
  }

  /**
   * Create a generic SMTP transport
   */
  private createSMTPTransport(event: any): Transporter {
    // Check if we have SMTP configuration
    if (!event.smtpHost || !event.smtpPort) {
      throw new Error('SMTP configuration missing host or port');
    }
    
    return nodemailer.createTransport({
      host: event.smtpHost,
      port: parseInt(event.smtpPort, 10),
      secure: event.smtpSecure === true,
      auth: {
        user: event.smtpUsername,
        pass: event.smtpPassword
      }
    });
  }

  /**
   * Check if the email service is properly configured and ready to use
   */
  public isReady(): boolean {
    return this.initialized && (!!this.transport || !!this.fallbackTransport);
  }

  /**
   * Send an email using the configured transport
   */
  public async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.isReady()) {
      try {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            error: `Email service not initialized: ${this.lastError || 'Unknown error'}`
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to initialize email service: ${error.message}`
        };
      }
    }
    
    // Try primary transport first
    if (this.transport) {
      try {
        const result = await this.transport.sendMail({
          from: this.fromEmail,
          to: options.to,
          cc: options.cc,
          bcc: options.bcc,
          subject: options.subject,
          text: options.text,
          html: options.html,
          attachments: options.attachments,
          replyTo: options.replyTo || this.fromEmail
        });
        
        return {
          success: true,
          messageId: result.messageId
        };
      } catch (error) {
        // Log error but try fallback if available
        
        
        // Only try fallback if it exists
        if (!this.fallbackTransport) {
          return {
            success: false,
            error: `Failed to send email: ${error.message}`
          };
        }
      }
    }
    
    // Try fallback transport if primary failed or isn't available
    if (this.fallbackTransport) {
      try {
        const result = await this.fallbackTransport.sendMail({
          from: this.fromEmail,
          to: options.to,
          cc: options.cc,
          bcc: options.bcc,
          subject: options.subject,
          text: options.text,
          html: options.html,
          attachments: options.attachments,
          replyTo: options.replyTo || this.fromEmail
        });
        
        return {
          success: true,
          messageId: result.messageId
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to send email with fallback transport (${this.fallbackProvider}): ${error.message}`
        };
      }
    }
    
    return {
      success: false,
      error: 'No available email transport'
    };
  }

  /**
   * Send a test email to verify the configuration
   */
  public async sendTestEmail(toEmail: string): Promise<EmailResult> {
    return this.sendEmail({
      to: toEmail,
      subject: `Test Email from ${this.eventName}`,
      text: `This is a test email from the Wedding RSVP application for event: ${this.eventName}.\n\nIf you're receiving this, the email configuration is working correctly.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #D4AF37; text-align: center;">Email Configuration Test</h2>
          <p>This is a test email from the Wedding RSVP application for event: <strong>${this.eventName}</strong>.</p>
          <p>If you're receiving this, the email configuration is working correctly.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 0;"><strong>Provider:</strong> ${this.provider}</p>
            <p style="margin: 8px 0 0;"><strong>From:</strong> ${this.fromEmail}</p>
          </div>
          <p style="text-align: center; font-size: 12px; color: #777; margin-top: 30px;">
            This is an automated message, please do not reply directly to this email.
          </p>
        </div>
      `
    });
  }

  /**
   * Helper to extract email address from formatted strings
   */
  private extractEmailAddress(formattedEmail: string): string {
    if (!formattedEmail) return '';
    
    // Check if the email is in the format "Name <email@example.com>"
    const emailMatch = formattedEmail.match(/<([^>]+)>/);
    if (emailMatch && emailMatch[1]) {
      return emailMatch[1];
    }
    
    // Simple validation to check if it looks like an email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(formattedEmail)) {
      return formattedEmail;
    }
    
    return '';
  }

  /**
   * Get the last error message
   */
  public getLastError(): string | null {
    return this.lastError;
  }

  /**
   * Create an email service instance from event configuration
   */
  public static async fromEvent(eventId: number): Promise<UnifiedEmailService | null> {
    try {
      // Get event data
      const [event] = await db.select().from(events).where(eq(events.id, eventId));
      if (!event) {
        
        return null;
      }
      
      // Determine primary provider
      let primaryProvider: EmailProvider | null = null;
      let fallbackProvider: EmailProvider | null = null;
      
      if (event.useGmail) {
        primaryProvider = EmailProvider.GMAIL;
      } else if (event.useOutlook) {
        primaryProvider = EmailProvider.OUTLOOK;
      } else if (event.smtpHost && event.smtpPort) {
        primaryProvider = EmailProvider.SMTP;
      }
      
      // Set a fallback provider if possible
      if (primaryProvider !== EmailProvider.GMAIL && event.gmailRefreshToken) {
        fallbackProvider = EmailProvider.GMAIL;
      } else if (primaryProvider !== EmailProvider.OUTLOOK && event.outlookRefreshToken) {
        fallbackProvider = EmailProvider.OUTLOOK;
      } else if (primaryProvider !== EmailProvider.SMTP && event.smtpHost && event.smtpPort) {
        fallbackProvider = EmailProvider.SMTP;
      }
      
      if (!primaryProvider) {
        
        return null;
      }
      
      // Create formatted from email
      const fromName = event.emailFromName || event.title || 'Wedding RSVP';
      const fromAddress = event.emailFromAddress || 'noreply@example.com';
      const formattedFromEmail = `${fromName} <${fromAddress}>`;
      
      // Create service instance
      const service = new UnifiedEmailService(
        eventId,
        primaryProvider,
        formattedFromEmail,
        event.title,
        fallbackProvider
      );
      
      // Initialize it
      await service.initialize();
      
      return service;
    } catch (error) {
      
      return null;
    }
  }
}