/**
 * WhatsApp Factory
 * Creates WhatsApp service instances based on provider type
 */

export enum WhatsAppProvider {
  BusinessAPI = 'business-api',
  WebJS = 'web-js'
}

export interface WhatsAppConfig {
  provider: WhatsAppProvider;
  businessAPI?: {
    accessToken: string;
    phoneNumberId: string;
    accountId?: string;
  };
  webJS?: {
    session?: string;
    puppeteer?: any;
  };
}

export interface WhatsAppServiceInterface {
  isClientReady(): boolean;
  getQRCode?(): string | null;
  sendTextMessage(to: string, message: string): Promise<string>;
  sendMediaMessage(to: string, mediaPath: string, caption?: string): Promise<string>;
  sendTemplateMessage(to: string, templateName: string, languageCode: string, components: any[]): Promise<string>;
  disconnect(): Promise<void>;
}

export class WhatsAppFactory {
  static async createService(config: WhatsAppConfig): Promise<WhatsAppServiceInterface> {
    switch (config.provider) {
      case WhatsAppProvider.BusinessAPI:
        const { BusinessAPIService } = await import('./business-api-service');
        return new BusinessAPIService(config.businessAPI!);
      
      case WhatsAppProvider.WebJS:
        const { WebJSService } = await import('./webjs-service');
        return new WebJSService(config.webJS || {});
      
      default:
        throw new Error(`Unsupported WhatsApp provider: ${config.provider}`);
    }
  }
}