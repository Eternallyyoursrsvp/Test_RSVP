/**
 * WhatsApp Service
 * Handles WhatsApp message sending via Business API and Web.js
 */

export interface WhatsAppMessage {
  to: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'video';
}

export interface WhatsAppProvider {
  type: 'business-api' | 'web-js';
  config: {
    phoneNumberId?: string;
    accessToken?: string;
    accountId?: string;
    webhookUrl?: string;
    sessionPath?: string;
  };
}

export class WhatsAppService {
  private providers: Map<string, WhatsAppProvider> = new Map();
  private businessApiConfig: {
    phoneNumberId: string;
    accessToken: string;
    accountId?: string;
  } | null = null;

  constructor() {
    this.initializeBusinessAPI();
  }

  /**
   * Initialize WhatsApp Business API
   */
  private initializeBusinessAPI() {
    if (process.env.WHATSAPP_BUSINESS_PHONE_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
      this.businessApiConfig = {
        phoneNumberId: process.env.WHATSAPP_BUSINESS_PHONE_ID,
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        accountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      };
    }
  }

  /**
   * Add WhatsApp provider configuration
   */
  addProvider(providerId: string, provider: WhatsAppProvider) {
    this.providers.set(providerId, provider);
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(message: WhatsAppMessage, providerId?: string): Promise<boolean> {
    try {
      // Use Business API if available and no specific provider requested
      if (!providerId && this.businessApiConfig) {
        return await this.sendViaBusinessAPI(message);
      }

      // Use specific provider if configured
      if (providerId && this.providers.has(providerId)) {
        const provider = this.providers.get(providerId)!;
        return await this.sendViaProvider(message, provider);
      }

      
      return false;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Send message via WhatsApp Business API
   */
  private async sendViaBusinessAPI(message: WhatsAppMessage): Promise<boolean> {
    if (!this.businessApiConfig) {
      
      return false;
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${this.businessApiConfig.phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to: message.to,
        type: 'text',
        text: {
          body: message.content
        }
      };

      // Add media if provided
      if (message.mediaUrl && message.mediaType) {
        payload.type = message.mediaType;
        payload[message.mediaType] = {
          link: message.mediaUrl
        };
        delete payload.text;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.businessApiConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();

        return true;
      } else {
        const error = await response.text();
        
        return false;
      }
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Send message via specific provider
   */
  private async sendViaProvider(message: WhatsAppMessage, provider: WhatsAppProvider): Promise<boolean> {
    switch (provider.type) {
      case 'business-api':
        return await this.sendViaBusinessAPIProvider(message, provider.config);
      case 'web-js':
        return await this.sendViaWebJS(message, provider.config);
      default:
        
        return false;
    }
  }

  /**
   * Send message via Business API with custom config
   */
  private async sendViaBusinessAPIProvider(message: WhatsAppMessage, config: any): Promise<boolean> {
    try {
      const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to: message.to,
        type: 'text',
        text: {
          body: message.content
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();

        return true;
      } else {
        const error = await response.text();
        
        return false;
      }
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Send message via WhatsApp Web.js
   */
  private async sendViaWebJS(message: WhatsAppMessage, config: any): Promise<boolean> {
    try {
      // TODO: Implement WhatsApp Web.js integration
      // This requires whatsapp-web.js library and QR code authentication
      // WhatsApp Web.js sending not yet implemented
      return false;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Test WhatsApp connection
   */
  async testConnection(providerId?: string): Promise<boolean> {
    try {
      // Test Business API if available
      if (!providerId && this.businessApiConfig) {
        const url = `https://graph.facebook.com/v18.0/${this.businessApiConfig.phoneNumberId}`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.businessApiConfig.accessToken}`,
          },
        });

        return response.ok;
      }

      // Test specific provider
      if (providerId && this.providers.has(providerId)) {
        const provider = this.providers.get(providerId)!;
        
        if (provider.type === 'business-api') {
          const url = `https://graph.facebook.com/v18.0/${provider.config.phoneNumberId}`;
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${provider.config.accessToken}`,
            },
          });

          return response.ok;
        }
      }

      return false;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    const providers: string[] = [];
    
    if (this.businessApiConfig) {
      providers.push('business-api');
    }
    
    providers.push(...Array.from(this.providers.keys()));
    
    return providers;
  }

  /**
   * Format phone number for WhatsApp
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present (assuming India +91 as default)
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    // Basic validation: should be at least 10 digits
    return formatted.length >= 10 && formatted.length <= 15;
  }
}

// Export singleton instance
export const whatsAppService = new WhatsAppService();