/**
 * WhatsApp Manager
 * Manages WhatsApp service instances across different events and providers
 */

import { WhatsAppFactory, WhatsAppProvider, WhatsAppConfig, WhatsAppServiceInterface } from './whatsapp-factory';
import { db } from '../../db';
import { weddingEvents } from '@shared/schema';
import { eq } from 'drizzle-orm';

export default class WhatsAppManager {
  private static instance: WhatsAppManager | null = null;
  private services: Map<number, WhatsAppServiceInterface> = new Map();
  private preferredProvider: WhatsAppProvider = WhatsAppProvider.WebJS;
  private businessAPICredentials: { apiKey: string; phoneNumberId: string } | null = null;

  private constructor() {}

  static getInstance(): WhatsAppManager {
    if (!WhatsAppManager.instance) {
      WhatsAppManager.instance = new WhatsAppManager();
    }
    return WhatsAppManager.instance;
  }

  setPreferredProvider(provider: WhatsAppProvider): void {
    this.preferredProvider = provider;
  }

  getPreferredProvider(): WhatsAppProvider {
    return this.preferredProvider;
  }

  setBusinessAPICredentials(apiKey: string, phoneNumberId: string): void {
    this.businessAPICredentials = { apiKey, phoneNumberId };
  }

  async getService(eventId: number): Promise<WhatsAppServiceInterface> {
    // Return existing service if available
    if (this.services.has(eventId)) {
      return this.services.get(eventId)!;
    }

    // Create new service based on preferred provider
    const config = await this.createConfig(eventId);
    const service = await WhatsAppFactory.createService(config);
    
    this.services.set(eventId, service);
    return service;
  }

  private async createConfig(eventId: number): Promise<WhatsAppConfig> {
    const config: WhatsAppConfig = {
      provider: this.preferredProvider
    };

    if (this.preferredProvider === WhatsAppProvider.BusinessAPI) {
      // Try to get credentials from database first
      try {
        const event = await db.select().from(weddingEvents).where(eq(weddingEvents.id, eventId)).limit(1);
        
        if (event[0]?.whatsappAccessToken && event[0]?.whatsappBusinessPhoneId) {
          config.businessAPI = {
            accessToken: event[0].whatsappAccessToken,
            phoneNumberId: event[0].whatsappBusinessPhoneId,
            accountId: event[0].whatsappBusinessAccountId || undefined
          };
        } else if (this.businessAPICredentials) {
          // Fall back to manager credentials
          config.businessAPI = {
            accessToken: this.businessAPICredentials.apiKey,
            phoneNumberId: this.businessAPICredentials.phoneNumberId
          };
        } else {
          throw new Error('WhatsApp Business API credentials not configured');
        }
      } catch (error) {
        if (this.businessAPICredentials) {
          config.businessAPI = {
            accessToken: this.businessAPICredentials.apiKey,
            phoneNumberId: this.businessAPICredentials.phoneNumberId
          };
        } else {
          throw new Error('WhatsApp Business API credentials not available');
        }
      }
    } else {
      // WebJS configuration
      config.webJS = {
        session: `event_${eventId}`,
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      };
    }

    return config;
  }

  async sendTextMessage(eventId: number, to: string, message: string): Promise<string> {
    const service = await this.getService(eventId);
    return await service.sendTextMessage(to, message);
  }

  async sendMediaMessage(eventId: number, to: string, mediaPath: string, caption?: string): Promise<string> {
    const service = await this.getService(eventId);
    return await service.sendMediaMessage(to, mediaPath, caption);
  }

  async sendTemplateMessage(eventId: number, to: string, templateName: string, languageCode: string, components: any[]): Promise<string> {
    const service = await this.getService(eventId);
    return await service.sendTemplateMessage(to, templateName, languageCode, components);
  }

  async disconnectService(eventId: number): Promise<void> {
    const service = this.services.get(eventId);
    if (service) {
      await service.disconnect();
      this.services.delete(eventId);
    }
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.services.entries()).map(async ([eventId, service]) => {
      try {
        await service.disconnect();
      } catch (error) {
        
      }
    });

    await Promise.all(disconnectPromises);
    this.services.clear();
  }

  getServiceStatus(eventId: number): { connected: boolean; qrCode?: string | null } {
    const service = this.services.get(eventId);
    if (!service) {
      return { connected: false };
    }

    return {
      connected: service.isClientReady(),
      qrCode: service.getQRCode?.() || null
    };
  }

  async testConnection(eventId?: number): Promise<boolean> {
    try {
      if (eventId) {
        const service = await this.getService(eventId);
        return service.isClientReady();
      } else {
        // Test if we can create a service with current configuration
        const testConfig = await this.createConfig(1); // Use dummy event ID
        const testService = await WhatsAppFactory.createService(testConfig);
        const isReady = testService.isClientReady();
        await testService.disconnect();
        return isReady;
      }
    } catch (error) {
      
      return false;
    }
  }
}