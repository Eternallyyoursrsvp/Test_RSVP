/**
 * Unit Tests for Email Providers
 * 
 * Tests all email provider implementations including SendGrid and SMTP
 * providers with comprehensive email functionality coverage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupProviderTestEnvironment, TEST_CONFIGS, mockNetworkError, mockAuthenticationError } from '../setup/test-environment';

// Import email providers
import { SendGridProvider } from '../../../server/providers/email/sendgrid';
import { SMTPProvider } from '../../../server/providers/email/smtp';

// Setup test environment
setupProviderTestEnvironment();

describe('Email Providers', () => {
  describe('SendGrid Provider', () => {
    let provider: SendGridProvider;

    beforeEach(() => {
      provider = new SendGridProvider(TEST_CONFIGS.sendgrid);
    });

    describe('Initialization', () => {
      it('should initialize with API key', () => {
        expect(provider.getApiKey()).toBe(TEST_CONFIGS.sendgrid.apiKey);
      });

      it('should set sandbox mode for testing', () => {
        expect(provider.isSandboxMode()).toBe(true);
      });

      it('should validate API key format', () => {
        expect(() => {
          new SendGridProvider({ apiKey: 'invalid-key', fromEmail: 'test@example.com' });
        }).toThrow('Invalid SendGrid API key format');
      });
    });

    describe('Email Sending', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should send simple email', async () => {
        const email = {
          to: 'guest@example.com',
          subject: 'Wedding RSVP Invitation',
          text: 'You are invited to our wedding!',
          html: '<p>You are invited to our wedding!</p>'
        };

        const result = await provider.sendEmail(email);
        
        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
        expect(result.accepted).toContain('guest@example.com');
      });

      it('should send email with attachments', async () => {
        const email = {
          to: 'guest@example.com',
          subject: 'Wedding Details',
          text: 'Wedding details attached',
          attachments: [
            {
              filename: 'invitation.pdf',
              content: Buffer.from('PDF content'),
              type: 'application/pdf'
            }
          ]
        };

        const result = await provider.sendEmail(email);
        expect(result.success).toBe(true);
      });

      it('should send bulk emails', async () => {
        const emails = [
          {
            to: 'guest1@example.com',
            subject: 'Wedding Invitation',
            text: 'You are invited!'
          },
          {
            to: 'guest2@example.com',
            subject: 'Wedding Invitation',
            text: 'You are invited!'
          }
        ];

        const results = await provider.sendBulkEmails(emails);
        
        expect(results.length).toBe(2);
        expect(results.every(r => r.success)).toBe(true);
      });

      it('should handle email validation', async () => {
        const invalidEmail = {
          to: 'invalid-email',
          subject: 'Test',
          text: 'Test content'
        };

        await expect(provider.sendEmail(invalidEmail)).rejects.toThrow('Invalid email address');
      });
    });

    describe('Template Support', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should send templated emails', async () => {
        const templateEmail = {
          to: 'guest@example.com',
          templateId: 'd-12345',
          dynamicTemplateData: {
            guestName: 'John Doe',
            eventName: 'Sarah & Mike Wedding',
            eventDate: '2024-12-31'
          }
        };

        const result = await provider.sendTemplatedEmail(templateEmail);
        expect(result.success).toBe(true);
      });

      it('should validate template data', async () => {
        const templateEmail = {
          to: 'guest@example.com',
          templateId: 'd-12345',
          dynamicTemplateData: null
        };

        await expect(provider.sendTemplatedEmail(templateEmail)).rejects.toThrow();
      });
    });

    describe('Error Handling', () => {
      it('should handle API rate limits', async () => {
        vi.mocked(provider['client'].send).mockRejectedValueOnce({
          code: 429,
          message: 'Too Many Requests'
        });

        const email = {
          to: 'guest@example.com',
          subject: 'Test',
          text: 'Test'
        };

        await expect(provider.sendEmail(email)).rejects.toThrow('Rate limit exceeded');
      });

      it('should handle authentication errors', async () => {
        vi.mocked(provider['client'].send).mockRejectedValueOnce(mockAuthenticationError());

        const email = {
          to: 'guest@example.com',
          subject: 'Test',
          text: 'Test'
        };

        await expect(provider.sendEmail(email)).rejects.toThrow('Authentication failed');
      });

      it('should handle network errors', async () => {
        vi.mocked(provider['client'].send).mockRejectedValueOnce(mockNetworkError());

        const email = {
          to: 'guest@example.com',
          subject: 'Test',
          text: 'Test'
        };

        await expect(provider.sendEmail(email)).rejects.toThrow('Network Error');
      });
    });

    describe('Webhook Handling', () => {
      it('should process delivery webhooks', async () => {
        const webhookData = {
          event: 'delivered',
          email: 'guest@example.com',
          timestamp: Date.now(),
          'smtp-id': '<test-message-id>'
        };

        const result = await provider.processWebhook(webhookData);
        
        expect(result.processed).toBe(true);
        expect(result.event).toBe('delivered');
      });

      it('should process bounce webhooks', async () => {
        const webhookData = {
          event: 'bounce',
          email: 'invalid@example.com',
          reason: 'Invalid recipient',
          timestamp: Date.now()
        };

        const result = await provider.processWebhook(webhookData);
        
        expect(result.processed).toBe(true);
        expect(result.event).toBe('bounce');
      });
    });
  });

  describe('SMTP Provider', () => {
    let provider: SMTPProvider;

    beforeEach(() => {
      provider = new SMTPProvider(TEST_CONFIGS.smtp);
    });

    describe('Connection Management', () => {
      it('should connect to SMTP server', async () => {
        await provider.connect();
        expect(provider.isConnected()).toBe(true);
      });

      it('should verify SMTP connection', async () => {
        await provider.connect();
        const isValid = await provider.verify();
        expect(isValid).toBe(true);
      });

      it('should handle connection failures', async () => {
        const badProvider = new SMTPProvider({
          ...TEST_CONFIGS.smtp,
          host: 'invalid-host.example.com'
        });

        await expect(badProvider.connect()).rejects.toThrow();
      });

      it('should disconnect properly', async () => {
        await provider.connect();
        await provider.disconnect();
        expect(provider.isConnected()).toBe(false);
      });
    });

    describe('Email Sending', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should send simple email', async () => {
        const email = {
          to: 'guest@example.com',
          subject: 'Wedding Invitation',
          text: 'You are invited to our wedding!',
          html: '<h1>You are invited to our wedding!</h1>'
        };

        const result = await provider.sendEmail(email);
        
        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
        expect(result.accepted).toContain('guest@example.com');
      });

      it('should send email with multiple recipients', async () => {
        const email = {
          to: ['guest1@example.com', 'guest2@example.com'],
          cc: ['family@example.com'],
          bcc: ['organizer@example.com'],
          subject: 'Wedding Update',
          text: 'Important wedding update!'
        };

        const result = await provider.sendEmail(email);
        expect(result.success).toBe(true);
        expect(result.accepted.length).toBeGreaterThan(0);
      });

      it('should send email with attachments', async () => {
        const email = {
          to: 'guest@example.com',
          subject: 'Wedding Invitation with Details',
          text: 'Please find the wedding details attached.',
          attachments: [
            {
              filename: 'wedding-details.pdf',
              content: Buffer.from('Wedding details PDF content'),
              contentType: 'application/pdf'
            },
            {
              filename: 'venue-map.jpg',
              path: '/path/to/venue-map.jpg', // Mock path
              contentType: 'image/jpeg'
            }
          ]
        };

        const result = await provider.sendEmail(email);
        expect(result.success).toBe(true);
      });

      it('should handle email priority', async () => {
        const urgentEmail = {
          to: 'guest@example.com',
          subject: 'URGENT: Wedding Venue Change',
          text: 'Important venue change notification',
          priority: 'high',
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High'
          }
        };

        const result = await provider.sendEmail(urgentEmail);
        expect(result.success).toBe(true);
      });
    });

    describe('Security Features', () => {
      it('should support TLS encryption', async () => {
        const secureProvider = new SMTPProvider({
          ...TEST_CONFIGS.smtp,
          secure: true,
          port: 465
        });

        await expect(secureProvider.connect()).resolves.not.toThrow();
      });

      it('should support STARTTLS', async () => {
        const starttlsProvider = new SMTPProvider({
          ...TEST_CONFIGS.smtp,
          secure: false,
          requireTLS: true
        });

        await expect(starttlsProvider.connect()).resolves.not.toThrow();
      });

      it('should validate authentication credentials', async () => {
        const invalidAuthProvider = new SMTPProvider({
          ...TEST_CONFIGS.smtp,
          auth: {
            user: 'invalid@example.com',
            pass: 'wrong-password'
          }
        });

        await expect(invalidAuthProvider.connect()).rejects.toThrow();
      });
    });

    describe('Error Handling', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should handle recipient validation errors', async () => {
        const email = {
          to: 'invalid-email-format',
          subject: 'Test',
          text: 'Test content'
        };

        await expect(provider.sendEmail(email)).rejects.toThrow('Invalid email address');
      });

      it('should handle server timeout errors', async () => {
        vi.mocked(provider['transporter'].sendMail).mockRejectedValueOnce({
          code: 'ETIMEDOUT',
          message: 'Connection timeout'
        });

        const email = {
          to: 'guest@example.com',
          subject: 'Test',
          text: 'Test'
        };

        await expect(provider.sendEmail(email)).rejects.toThrow('Connection timeout');
      });

      it('should handle mailbox full errors', async () => {
        vi.mocked(provider['transporter'].sendMail).mockRejectedValueOnce({
          code: 'EMESSAGE',
          response: '552 Mailbox full',
          responseCode: 552
        });

        const email = {
          to: 'guest@example.com',
          subject: 'Test',
          text: 'Test'
        };

        await expect(provider.sendEmail(email)).rejects.toThrow('Recipient mailbox full');
      });
    });

    describe('Bulk Email Handling', () => {
      beforeEach(async () => {
        await provider.connect();
      });

      it('should send bulk emails with rate limiting', async () => {
        const emails = Array.from({ length: 10 }, (_, i) => ({
          to: `guest${i + 1}@example.com`,
          subject: 'Wedding Invitation',
          text: 'You are invited to our wedding!'
        }));

        const results = await provider.sendBulkEmails(emails, {
          rateLimit: 5, // 5 emails per second
          batchSize: 3   // 3 emails per batch
        });

        expect(results.length).toBe(10);
        expect(results.every(r => r.success)).toBe(true);
      });

      it('should handle partial failures in bulk sending', async () => {
        const emails = [
          {
            to: 'valid@example.com',
            subject: 'Test',
            text: 'Test'
          },
          {
            to: 'invalid-email',
            subject: 'Test',
            text: 'Test'
          }
        ];

        const results = await provider.sendBulkEmails(emails, {
          continueOnError: true
        });

        expect(results.length).toBe(2);
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(false);
      });
    });
  });

  describe('Email Provider Compatibility', () => {
    it('should implement consistent interfaces', () => {
      const providers = [
        new SendGridProvider(TEST_CONFIGS.sendgrid),
        new SMTPProvider(TEST_CONFIGS.smtp)
      ];

      providers.forEach(provider => {
        expect(provider.connect).toBeTypeOf('function');
        expect(provider.disconnect).toBeTypeOf('function');
        expect(provider.sendEmail).toBeTypeOf('function');
        expect(provider.sendBulkEmails).toBeTypeOf('function');
        expect(provider.verify).toBeTypeOf('function');
      });
    });

    it('should handle similar email structures', async () => {
      const testEmail = {
        to: 'guest@example.com',
        subject: 'Wedding Invitation',
        text: 'You are invited to our wedding!',
        html: '<p>You are invited to our wedding!</p>'
      };

      const providers = [
        new SendGridProvider(TEST_CONFIGS.sendgrid),
        new SMTPProvider(TEST_CONFIGS.smtp)
      ];

      for (const provider of providers) {
        await provider.connect();
        
        const result = await provider.sendEmail(testEmail);
        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
        
        await provider.disconnect();
      }
    });

    it('should provide consistent error handling', async () => {
      const invalidEmail = {
        to: 'invalid-email-format',
        subject: 'Test',
        text: 'Test'
      };

      const providers = [
        new SendGridProvider(TEST_CONFIGS.sendgrid),
        new SMTPProvider(TEST_CONFIGS.smtp)
      ];

      for (const provider of providers) {
        await provider.connect();
        
        await expect(provider.sendEmail(invalidEmail)).rejects.toThrow();
        
        await provider.disconnect();
      }
    });
  });
});