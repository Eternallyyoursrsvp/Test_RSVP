/**
 * WhatsApp Web.js Service
 * Handles message sending via WhatsApp Web.js (requires QR code authentication)
 */

import { WhatsAppServiceInterface } from './whatsapp-factory';

export interface WebJSConfig {
  session?: string;
  puppeteer?: any;
}

export class WebJSService implements WhatsAppServiceInterface {
  private config: WebJSConfig;
  private client: any = null;
  private ready: boolean = false;
  private qrCode: string | null = null;
  private initPromise: Promise<void> | null = null;
  private cleanupHandlers: (() => void)[] = [];

  constructor(config: WebJSConfig) {
    this.config = config;
    this.initPromise = this.initialize();
    
    // Add cleanup handlers for memory management
    const cleanup = () => this.cleanup();
    this.cleanupHandlers.push(cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  }

  /**
   * Cleanup WhatsApp service to prevent memory leaks
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.client) {
        await this.client.destroy();
        this.client = null;
      }
      this.ready = false;
      this.qrCode = null;
    } catch (error) {
      // Silent cleanup failure
    }
  }

  private async initialize(): Promise<void> {
    try {
      
      
      // Import WhatsApp Web.js components dynamically
      const whatsappModule = await import('whatsapp-web.js');
      const { Client, LocalAuth } = whatsappModule.default;
      
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.config.session || 'default',
          dataPath: './.wwebjs_auth',
        }),
        puppeteer: {
          headless: true,
          executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
          ],
          timeout: 60000,
          ...this.config.puppeteer,
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        qrMaxRetries: 3,
        restartOnAuthFail: true,
        takeoverOnConflict: false,
        takeoverTimeoutMs: 0,
      });

      // Set up event handlers
      this.client.on('qr', (qr: string) => {
        
        this.qrCode = qr;
        this.ready = false;
      });

      this.client.on('ready', () => {
        
        this.ready = true;
        this.qrCode = null;
      });

      this.client.on('authenticated', () => {
        
        this.qrCode = null;
      });

      this.client.on('auth_failure', (msg: string) => {
        
        this.ready = false;
        this.qrCode = null;
      });

      this.client.on('disconnected', (reason: string) => {
        
        this.ready = false;
        this.qrCode = null;
      });

      // Additional event handlers recommended by documentation
      this.client.on('loading_screen', (percent: number, message: string) => {
        
      });

      this.client.on('change_state', (state: string) => {
        
      });

      // Handle remote session saved (when QR code is scanned)
      this.client.on('remote_session_saved', () => {
        
      });

      // Initialize the client
      await this.client.initialize();
      
    } catch (error) {
      
      
      // If whatsapp-web.js is not available, create a mock service
      
      this.ready = false;
    }
  }

  isClientReady(): boolean {
    return this.ready;
  }

  getQRCode(): string | null {
    return this.qrCode;
  }

  async sendTextMessage(to: string, message: string): Promise<string> {
    if (!this.initPromise) {
      throw new Error('WhatsApp Web.js service not initialized');
    }
    
    await this.initPromise;
    
    if (!this.isClientReady()) {
      throw new Error('WhatsApp Web.js service not ready. Please scan QR code first.');
    }

    try {
      // Format phone number (ensure it has country code)
      let formattedNumber = to.replace(/\D/g, '');
      if (!formattedNumber.startsWith('91') && formattedNumber.length === 10) {
        formattedNumber = '91' + formattedNumber;
      }
      formattedNumber += '@c.us';

      const sentMessage = await this.client.sendMessage(formattedNumber, message);
      const messageId = sentMessage.id._serialized || 'unknown';
      
      
      return messageId;
    } catch (error) {
      
      throw error;
    }
  }

  async sendMediaMessage(to: string, mediaPath: string, caption?: string): Promise<string> {
    if (!this.initPromise) {
      throw new Error('WhatsApp Web.js service not initialized');
    }
    
    await this.initPromise;
    
    if (!this.isClientReady()) {
      throw new Error('WhatsApp Web.js service not ready. Please scan QR code first.');
    }

    try {
      const { MessageMedia } = await import('whatsapp-web.js');
      
      // Format phone number
      let formattedNumber = to.replace(/\D/g, '');
      if (!formattedNumber.startsWith('91') && formattedNumber.length === 10) {
        formattedNumber = '91' + formattedNumber;
      }
      formattedNumber += '@c.us';

      const media = MessageMedia.fromFilePath(mediaPath);
      const sentMessage = await this.client.sendMessage(formattedNumber, media, { caption });
      const messageId = sentMessage.id._serialized || 'unknown';
      
      
      return messageId;
    } catch (error) {
      
      throw error;
    }
  }

  async sendTemplateMessage(to: string, templateName: string, languageCode: string, components: any[]): Promise<string> {
    // Template messages are not supported in WhatsApp Web.js
    // Send as regular text message instead
    const message = `Template: ${templateName} (${languageCode})`;
    return await this.sendTextMessage(to, message);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy();
        
      } catch (error) {
        
      }
    }
    this.ready = false;
    this.qrCode = null;
  }
}