/**
 * WhatsApp Business API Service
 * Handles message sending via WhatsApp Business API
 */

import { WhatsAppServiceInterface } from './whatsapp-factory';

export interface BusinessAPIConfig {
  accessToken: string;
  phoneNumberId: string;
  accountId?: string;
}

export class BusinessAPIService implements WhatsAppServiceInterface {
  private config: BusinessAPIConfig;
  private ready: boolean = false;

  constructor(config: BusinessAPIConfig) {
    this.config = config;
    this.ready = true; // Business API is ready immediately if credentials are provided
  }

  isClientReady(): boolean {
    return this.ready && !!this.config.accessToken && !!this.config.phoneNumberId;
  }

  getQRCode(): string | null {
    return null; // Business API doesn't use QR codes
  }

  async sendTextMessage(to: string, message: string): Promise<string> {
    if (!this.isClientReady()) {
      throw new Error('WhatsApp Business API service not ready');
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${this.config.phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''), // Remove non-digits
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        const messageId = result.messages[0]?.id || 'unknown';
        
        return messageId;
      } else {
        const error = await response.text();
        
        throw new Error(`Business API error: ${error}`);
      }
    } catch (error) {
      
      throw error;
    }
  }

  async sendMediaMessage(to: string, mediaPath: string, caption?: string): Promise<string> {
    if (!this.isClientReady()) {
      throw new Error('WhatsApp Business API service not ready');
    }

    try {
      // For now, we'll treat media messages as text messages with the caption
      // Full media upload implementation would require file hosting
      const message = caption || 'Media message';
      return await this.sendTextMessage(to, message);
    } catch (error) {
      
      throw error;
    }
  }

  async sendTemplateMessage(to: string, templateName: string, languageCode: string, components: any[]): Promise<string> {
    if (!this.isClientReady()) {
      throw new Error('WhatsApp Business API service not ready');
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${this.config.phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''), // Remove non-digits
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components: components
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        const messageId = result.messages[0]?.id || 'unknown';
        
        return messageId;
      } else {
        const error = await response.text();
        
        throw new Error(`Business API template error: ${error}`);
      }
    } catch (error) {
      
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.ready = false;
    
  }
}