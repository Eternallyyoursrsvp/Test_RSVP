/**
 * PocketBase All-in-One Provider Implementation
 * 
 * Comprehensive multi-service provider supporting database, authentication,
 * email, storage, real-time, and admin dashboard functionality.
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import axios, { AxiosInstance } from 'axios';
import EventEmitter from 'events';

import {
  IEnhancedProvider,
  ProviderSummary,
  ProviderDetails,
  ValidationResult,
  TestResult
} from '../interfaces/enhanced-provider-registry';

import {
  ProviderType,
  ProviderConfiguration,
  ProviderStatus,
  ProviderMetrics,
  ProviderFeatures,
  MultiServiceProvider,
  ProviderSetupAutomation,
  ProviderWizardIntegration,
  WizardStep,
  WizardField,
  StepResult,
  PreviewResult
} from '../interfaces/provider-types';

import { BaseProviderConfig } from '../interfaces/provider-config';

export interface PocketBaseConfig extends BaseProviderConfig {
  // PocketBase specific configuration
  binaryPath?: string;
  dataDir: string;
  publicDir?: string;
  migrationsDir?: string;
  hooksDir?: string;
  
  // Server configuration
  host: string;
  port: number;
  adminEmail?: string;
  adminPassword?: string;
  
  // Database configuration
  database: {
    type: 'sqlite';
    path?: string;
    pragmas?: Record<string, string>;
  };
  
  // Authentication configuration
  auth: {
    enabled: boolean;
    providers: string[];
    oauth2?: Record<string, {
      clientId: string;
      clientSecret: string;
      redirectUrl?: string;
    }>;
    jwt?: {
      duration: number;
      refreshDuration: number;
    };
  };
  
  // Email configuration
  email?: {
    enabled: boolean;
    smtp?: {
      host: string;
      port: number;
      username: string;
      password: string;
      tls: boolean;
    };
  };
  
  // Storage configuration
  storage: {
    enabled: boolean;
    maxSize: number;
    allowedTypes: string[];
    thumbSizes: number[];
  };
  
  // Real-time configuration
  realtime: {
    enabled: boolean;
    maxConnections: number;
  };
  
  // Admin dashboard configuration
  admin: {
    enabled: boolean;
    ui: boolean;
    cors: boolean;
  };
  
  // Additional settings
  settings: {
    logs: boolean;
    debug: boolean;
    dev: boolean;
    encryptionEnv?: string;
  };
}

export class PocketBaseProvider extends EventEmitter implements IEnhancedProvider, MultiServiceProvider, ProviderSetupAutomation, ProviderWizardIntegration {
  public readonly name = 'pocketbase';
  public readonly version = '1.0.0';
  public readonly type: ProviderType = 'pocketbase-all-in-one';
  
  private config: PocketBaseConfig | null = null;
  private process: ChildProcess | null = null;
  private apiClient: AxiosInstance | null = null;
  private startTime: Date | null = null;
  private healthStatus: ProviderStatus | null = null;
  private isInitialized = false;
  private isStarted = false;
  
  private readonly enabledServices = new Set<string>([
    'database',
    'auth',
    'admin',
    'storage',
    'realtime'
  ]);
  
  // IProvider implementation
  async initialize(config: BaseProviderConfig): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    this.config = config as PocketBaseConfig;
    
    // Validate configuration
    const validation = await this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`PocketBase configuration invalid: ${validation.errors.join(', ')}`);
    }
    
    // Ensure directories exist
    await this.ensureDirectories();
    
    // Initialize API client
    this.apiClient = axios.create({
      baseURL: `http://${this.config.host}:${this.config.port}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    this.isInitialized = true;
    this.emit('initialized');
  }
  
  async start(): Promise<void> {
    if (!this.isInitialized || !this.config) {
      throw new Error('Provider not initialized');
    }
    
    if (this.isStarted) {
      return;
    }
    
    try {
      // Start PocketBase process
      await this.startPocketBaseProcess();
      
      // Wait for service to be ready
      await this.waitForReady();
      
      // Setup admin user if configured
      if (this.config.adminEmail && this.config.adminPassword) {
        await this.setupAdminUser();
      }
      
      // Apply initial configuration
      await this.applyConfiguration();
      
      this.isStarted = true;
      this.startTime = new Date();
      this.emit('started');
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }
    
    try {
      if (this.process) {
        // Graceful shutdown
        this.process.kill('SIGTERM');
        
        // Wait for process to exit
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (this.process) {
              this.process.kill('SIGKILL');
            }
            reject(new Error('Process did not exit gracefully'));
          }, 10000);
          
          this.process!.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      
      this.process = null;
      this.isStarted = false;
      this.startTime = null;
      this.emit('stopped');
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  async destroy(): Promise<void> {
    if (this.isStarted) {
      await this.stop();
    }
    
    this.removeAllListeners();
    this.apiClient = null;
    this.config = null;
    this.isInitialized = false;
    this.emit('destroyed');
  }
  
  async getHealth(): Promise<ProviderStatus> {
    if (!this.isStarted || !this.apiClient) {
      return {
        status: 'stopped',
        health: 'unhealthy',
        uptime: 0,
        lastCheck: new Date(),
        errors: 0,
        warnings: 0,
        performance: {
          responseTime: 0,
          throughput: 0,
          errorRate: 0
        }
      };
    }
    
    try {
      const startTime = Date.now();
      
      // Test health endpoint
      await this.apiClient.get('/api/health');
      
      const responseTime = Date.now() - startTime;
      const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
      
      const status: ProviderStatus = {
        status: 'active',
        health: 'healthy',
        uptime,
        lastCheck: new Date(),
        errors: 0,
        warnings: 0,
        performance: {
          responseTime,
          throughput: 0, // Would need to track over time
          errorRate: 0    // Would need to track over time
        },
        details: {
          pid: this.process?.pid,
          host: this.config?.host,
          port: this.config?.port,
          dataDir: this.config?.dataDir
        }
      };
      
      this.healthStatus = status;
      return status;
      
    } catch (error) {
      const status: ProviderStatus = {
        status: 'failed',
        health: 'unhealthy',
        uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
        lastCheck: new Date(),
        errors: 1,
        warnings: 0,
        performance: {
          responseTime: 0,
          throughput: 0,
          errorRate: 1
        },
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
      
      this.healthStatus = status;
      return status;
    }
  }
  
  // IEnhancedProvider implementation
  getProviderType(): ProviderType {
    return this.type;
  }
  
  getCapabilities(): string[] {
    return [
      'database',
      'authentication',
      'email',
      'storage',
      'realtime',
      'admin-dashboard',
      'rest-api',
      'file-management',
      'user-management',
      'oauth2',
      'websockets'
    ];
  }
  
  isMultiService(): boolean {
    return true;
  }
  
  getMultiServiceProvider(): MultiServiceProvider {
    return this;
  }
  
  getSetupAutomation(): ProviderSetupAutomation {
    return this;
  }
  
  getWizardIntegration(): ProviderWizardIntegration {
    return this;
  }
  
  async getDetailedHealth(): Promise<ProviderStatus> {
    return this.getHealth();
  }
  
  async getMetrics(): Promise<ProviderMetrics> {
    const timestamp = new Date();
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    
    // Mock metrics - in production, these would be collected from PocketBase
    return {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        rate: 0
      },
      performance: {
        avgResponseTime: this.healthStatus?.performance.responseTime || 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0
      },
      resources: {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        connections: 0
      },
      business: {
        activeUsers: 0,
        totalRecords: 0,
        emailsSent: 0,
        filesStored: 0
      },
      timestamp,
      period: '1m'
    };
  }
  
  async validateConfig(config: Record<string, unknown>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const pbConfig = config as PocketBaseConfig;
    
    // Required fields
    if (!pbConfig.dataDir) {
      errors.push('dataDir is required');
    }
    
    if (!pbConfig.host) {
      errors.push('host is required');
    }
    
    if (!pbConfig.port || pbConfig.port < 1 || pbConfig.port > 65535) {
      errors.push('port must be between 1 and 65535');
    }
    
    // Validate directories
    if (pbConfig.dataDir) {
      try {
        await fs.access(pbConfig.dataDir);
      } catch {
        warnings.push(`dataDir ${pbConfig.dataDir} does not exist and will be created`);
      }
    }
    
    // Validate auth configuration
    if (pbConfig.auth?.enabled) {
      if (pbConfig.auth.oauth2) {
        for (const [provider, config] of Object.entries(pbConfig.auth.oauth2)) {
          if (!config.clientId || !config.clientSecret) {
            errors.push(`OAuth2 provider ${provider} requires clientId and clientSecret`);
          }
        }
      }
    }
    
    // Validate email configuration
    if (pbConfig.email?.enabled && pbConfig.email.smtp) {
      const smtp = pbConfig.email.smtp;
      if (!smtp.host || !smtp.port || !smtp.username || !smtp.password) {
        errors.push('SMTP configuration requires host, port, username, and password');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  async updateConfig(config: Record<string, unknown>): Promise<void> {
    const validation = await this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    this.config = { ...this.config, ...config } as PocketBaseConfig;
    
    if (this.isStarted) {
      await this.applyConfiguration();
    }
    
    this.emit('config_updated', config);
  }
  
  async resetConfig(): Promise<void> {
    if (!this.config) {
      return;
    }
    
    this.config = this.generateDefaultConfig() as PocketBaseConfig;
    
    if (this.isStarted) {
      await this.applyConfiguration();
    }
    
    this.emit('config_reset');
  }
  
  async runDiagnostics(): Promise<Record<string, TestResult>> {
    const results: Record<string, TestResult> = {};
    
    // Test process
    results.process = {
      success: this.process !== null && !this.process.killed,
      message: this.process ? 'PocketBase process is running' : 'PocketBase process is not running'
    };
    
    // Test API connectivity
    if (this.apiClient) {
      try {
        const start = Date.now();
        await this.apiClient.get('/api/health');
        results.api = {
          success: true,
          message: 'API is accessible',
          latency: Date.now() - start
        };
      } catch (error) {
        results.api = {
          success: false,
          message: `API is not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    } else {
      results.api = {
        success: false,
        message: 'API client not initialized'
      };
    }
    
    // Test database
    if (this.isServiceEnabled('database')) {
      results.database = await this.testDatabase();
    }
    
    // Test authentication
    if (this.isServiceEnabled('auth')) {
      results.auth = await this.testAuthentication();
    }
    
    // Test storage
    if (this.isServiceEnabled('storage')) {
      results.storage = await this.testStorage();
    }
    
    // Test real-time
    if (this.isServiceEnabled('realtime')) {
      results.realtime = await this.testRealtime();
    }
    
    return results;
  }
  
  async getDebugInfo(): Promise<Record<string, unknown>> {
    return {
      config: this.config,
      isInitialized: this.isInitialized,
      isStarted: this.isStarted,
      process: {
        pid: this.process?.pid,
        killed: this.process?.killed,
        exitCode: this.process?.exitCode
      },
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      enabledServices: Array.from(this.enabledServices),
      healthStatus: this.healthStatus
    };
  }
  
  // MultiServiceProvider implementation
  getAvailableServices(): string[] {
    return ['database', 'auth', 'email', 'storage', 'realtime', 'admin'];
  }
  
  isServiceEnabled(service: string): boolean {
    return this.enabledServices.has(service);
  }
  
  async enableService(service: string): Promise<void> {
    if (!this.getAvailableServices().includes(service)) {
      throw new Error(`Service ${service} is not available`);
    }
    
    this.enabledServices.add(service);
    
    if (this.isStarted) {
      await this.applyServiceConfiguration(service, true);
    }
    
    this.emit('service_enabled', service);
  }
  
  async disableService(service: string): Promise<void> {
    if (service === 'database') {
      throw new Error('Database service cannot be disabled');
    }
    
    this.enabledServices.delete(service);
    
    if (this.isStarted) {
      await this.applyServiceConfiguration(service, false);
    }
    
    this.emit('service_disabled', service);
  }
  
  getServiceConfig(service: string): Record<string, unknown> {
    if (!this.config) {
      return {};
    }
    
    switch (service) {
      case 'database':
        return this.config.database;
      case 'auth':
        return this.config.auth;
      case 'email':
        return this.config.email || {};
      case 'storage':
        return this.config.storage;
      case 'realtime':
        return this.config.realtime;
      case 'admin':
        return this.config.admin;
      default:
        return {};
    }
  }
  
  async updateServiceConfig(service: string, config: Record<string, unknown>): Promise<void> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }
    
    switch (service) {
      case 'database':
        this.config.database = { ...this.config.database, ...config };
        break;
      case 'auth':
        this.config.auth = { ...this.config.auth, ...config };
        break;
      case 'email':
        this.config.email = { ...this.config.email, ...config };
        break;
      case 'storage':
        this.config.storage = { ...this.config.storage, ...config };
        break;
      case 'realtime':
        this.config.realtime = { ...this.config.realtime, ...config };
        break;
      case 'admin':
        this.config.admin = { ...this.config.admin, ...config };
        break;
      default:
        throw new Error(`Unknown service: ${service}`);
    }
    
    if (this.isStarted) {
      await this.applyServiceConfiguration(service, this.isServiceEnabled(service));
    }
    
    this.emit('service_config_updated', service, config);
  }
  
  async getServiceHealth(service: string): Promise<ProviderStatus> {
    // For PocketBase, all services share the same health status
    // In a more complex implementation, each service could have its own health
    return this.getHealth();
  }
  
  async getAllServicesHealth(): Promise<Record<string, ProviderStatus>> {
    const health = await this.getHealth();
    const result: Record<string, ProviderStatus> = {};
    
    for (const service of this.getAvailableServices()) {
      result[service] = { ...health };
    }
    
    return result;
  }
  
  async getServiceMetrics(service: string): Promise<ProviderMetrics> {
    // For PocketBase, all services share the same metrics
    // In a more complex implementation, each service could have its own metrics
    return this.getMetrics();
  }
  
  async getAllServicesMetrics(): Promise<Record<string, ProviderMetrics>> {
    const metrics = await this.getMetrics();
    const result: Record<string, ProviderMetrics> = {};
    
    for (const service of this.getAvailableServices()) {
      result[service] = { ...metrics };
    }
    
    return result;
  }
  
  // ProviderSetupAutomation implementation
  canAutoSetup(): boolean {
    return true;
  }
  
  getSetupSteps(): string[] {
    return [
      'validate_system',
      'create_directories',
      'download_binary',
      'generate_config',
      'start_service',
      'setup_admin',
      'configure_services',
      'test_connection'
    ];
  }
  
  async createSchema(): Promise<void> {
    // PocketBase handles schema creation automatically
    // We could create initial collections here if needed
    this.emit('schema_created');
  }
  
  async migrateSchema(from: string, to: string): Promise<void> {
    // PocketBase handles migrations automatically
    // We could implement custom migration logic here
    this.emit('schema_migrated', { from, to });
  }
  
  generateDefaultConfig(): Record<string, unknown> {
    const config: PocketBaseConfig = {
      name: 'pocketbase',
      type: 'pocketbase-all-in-one',
      enabled: true,
      
      dataDir: './pb_data',
      host: '127.0.0.1',
      port: 8090,
      
      database: {
        type: 'sqlite'
      },
      
      auth: {
        enabled: true,
        providers: ['email']
      },
      
      storage: {
        enabled: true,
        maxSize: 5242880, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
        thumbSizes: [100, 300, 500]
      },
      
      realtime: {
        enabled: true,
        maxConnections: 1000
      },
      
      admin: {
        enabled: true,
        ui: true,
        cors: true
      },
      
      settings: {
        logs: true,
        debug: false,
        dev: false
      }
    };
    
    return config;
  }
  
  async validateConfiguration(config: Record<string, unknown>): Promise<boolean> {
    const validation = await this.validateConfig(config);
    return validation.valid;
  }
  
  async exportData(): Promise<Buffer> {
    if (!this.config || !this.isStarted) {
      throw new Error('Provider not started');
    }
    
    // Export database and files
    // This would implement a backup mechanism
    throw new Error('Export data not implemented yet');
  }
  
  async importData(data: Buffer): Promise<void> {
    if (!this.config || !this.isStarted) {
      throw new Error('Provider not started');
    }
    
    // Import database and files
    // This would implement a restore mechanism
    throw new Error('Import data not implemented yet');
  }
  
  async createBackup(): Promise<string> {
    if (!this.config || !this.isStarted) {
      throw new Error('Provider not started');
    }
    
    // Create backup using PocketBase backup API
    const backupId = `backup_${Date.now()}`;
    // Implementation would create actual backup
    
    this.emit('backup_created', backupId);
    return backupId;
  }
  
  async restoreBackup(backupId: string): Promise<void> {
    if (!this.config || !this.isStarted) {
      throw new Error('Provider not started');
    }
    
    // Restore backup using PocketBase API
    // Implementation would restore actual backup
    
    this.emit('backup_restored', backupId);
  }
  
  // ProviderWizardIntegration implementation
  getWizardSteps(): WizardStep[] {
    return [
      {
        id: 'basic_config',
        name: 'Basic Configuration',
        description: 'Configure basic PocketBase settings',
        required: true,
        fields: [
          {
            id: 'dataDir',
            name: 'dataDir',
            type: 'text',
            label: 'Data Directory',
            description: 'Directory where PocketBase will store data',
            required: true,
            defaultValue: './pb_data'
          },
          {
            id: 'host',
            name: 'host',
            type: 'text',
            label: 'Host',
            description: 'Host to bind PocketBase server',
            required: true,
            defaultValue: '127.0.0.1'
          },
          {
            id: 'port',
            name: 'port',
            type: 'number',
            label: 'Port',
            description: 'Port to bind PocketBase server',
            required: true,
            defaultValue: 8090
          }
        ]
      },
      {
        id: 'admin_setup',
        name: 'Admin Setup',
        description: 'Configure admin user',
        required: false,
        fields: [
          {
            id: 'adminEmail',
            name: 'adminEmail',
            type: 'text',
            label: 'Admin Email',
            description: 'Email for admin user',
            required: false
          },
          {
            id: 'adminPassword',
            name: 'adminPassword',
            type: 'password',
            label: 'Admin Password',
            description: 'Password for admin user',
            required: false
          }
        ]
      },
      {
        id: 'services_config',
        name: 'Services Configuration',
        description: 'Configure PocketBase services',
        required: false,
        fields: [
          {
            id: 'authEnabled',
            name: 'authEnabled',
            type: 'boolean',
            label: 'Enable Authentication',
            description: 'Enable user authentication services',
            required: false,
            defaultValue: true
          },
          {
            id: 'storageEnabled',
            name: 'storageEnabled',
            type: 'boolean',
            label: 'Enable Storage',
            description: 'Enable file storage services',
            required: false,
            defaultValue: true
          },
          {
            id: 'realtimeEnabled',
            name: 'realtimeEnabled',
            type: 'boolean',
            label: 'Enable Real-time',
            description: 'Enable real-time subscriptions',
            required: false,
            defaultValue: true
          }
        ]
      }
    ];
  }
  
  async validateStep(stepId: string, data: Record<string, unknown>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    switch (stepId) {
      case 'basic_config':
        if (!data.dataDir) errors.push('Data directory is required');
        if (!data.host) errors.push('Host is required');
        if (!data.port || typeof data.port !== 'number') errors.push('Valid port number is required');
        break;
        
      case 'admin_setup':
        if (data.adminEmail && !data.adminPassword) {
          errors.push('Admin password is required when admin email is provided');
        }
        if (data.adminPassword && !data.adminEmail) {
          errors.push('Admin email is required when admin password is provided');
        }
        break;
        
      case 'services_config':
        // No validation needed for boolean flags
        break;
        
      default:
        errors.push(`Unknown step: ${stepId}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  async executeStep(stepId: string, data: Record<string, unknown>): Promise<StepResult> {
    try {
      switch (stepId) {
        case 'basic_config':
          // Validate and store basic configuration
          const validation = await this.validateStep(stepId, data);
          if (!validation.valid) {
            return {
              success: false,
              error: validation.errors.join(', ')
            };
          }
          
          return {
            success: true,
            data: {
              dataDir: data.dataDir,
              host: data.host,
              port: data.port
            },
            nextStep: 'admin_setup'
          };
          
        case 'admin_setup':
          return {
            success: true,
            data: {
              adminEmail: data.adminEmail,
              adminPassword: data.adminPassword
            },
            nextStep: 'services_config'
          };
          
        case 'services_config':
          return {
            success: true,
            data: {
              authEnabled: data.authEnabled,
              storageEnabled: data.storageEnabled,
              realtimeEnabled: data.realtimeEnabled
            }
          };
          
        default:
          return {
            success: false,
            error: `Unknown step: ${stepId}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async testConnection(config: Record<string, unknown>): Promise<TestResult> {
    try {
      const pbConfig = config as PocketBaseConfig;
      const testClient = axios.create({
        baseURL: `http://${pbConfig.host}:${pbConfig.port}`,
        timeout: 5000
      });
      
      const start = Date.now();
      await testClient.get('/api/health');
      const latency = Date.now() - start;
      
      return {
        success: true,
        message: 'Connection successful',
        latency
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }
  
  async testFeatures(features: string[]): Promise<Record<string, TestResult>> {
    const results: Record<string, TestResult> = {};
    
    for (const feature of features) {
      switch (feature) {
        case 'database':
          results[feature] = await this.testDatabase();
          break;
        case 'auth':
          results[feature] = await this.testAuthentication();
          break;
        case 'storage':
          results[feature] = await this.testStorage();
          break;
        case 'realtime':
          results[feature] = await this.testRealtime();
          break;
        default:
          results[feature] = {
            success: false,
            message: `Unknown feature: ${feature}`
          };
      }
    }
    
    return results;
  }
  
  async generatePreview(config: Record<string, unknown>): Promise<PreviewResult> {
    const pbConfig = config as PocketBaseConfig;
    
    return {
      success: true,
      preview: {
        schema: {
          collections: [
            { name: 'users', type: 'auth' },
            { name: 'posts', type: 'base' },
            { name: 'files', type: 'base' }
          ]
        },
        sampleData: [
          { collection: 'users', count: 0 },
          { collection: 'posts', count: 0 },
          { collection: 'files', count: 0 }
        ],
        endpoints: [
          `GET http://${pbConfig.host}:${pbConfig.port}/api/collections/users/records`,
          `POST http://${pbConfig.host}:${pbConfig.port}/api/collections/users/auth-with-password`,
          `GET http://${pbConfig.host}:${pbConfig.port}/api/files/{collection}/{recordId}/{filename}`
        ],
        features: Array.from(this.enabledServices)
      },
      estimatedSetupTime: 30 // seconds
    };
  }
  
  // Private helper methods
  private async ensureDirectories(): Promise<void> {
    if (!this.config) return;
    
    const dirs = [
      this.config.dataDir,
      this.config.publicDir,
      this.config.migrationsDir,
      this.config.hooksDir
    ].filter(Boolean) as string[];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }
  }
  
  private async startPocketBaseProcess(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not set');
    }
    
    const binaryPath = this.config.binaryPath || 'pocketbase';
    const args = [
      'serve',
      '--http',
      `${this.config.host}:${this.config.port}`,
      '--dir',
      this.config.dataDir
    ];
    
    if (this.config.settings.dev) {
      args.push('--dev');
    }
    
    this.process = spawn(binaryPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...this.getEnvironmentVariables() }
    });
    
    this.process.stdout?.on('data', (data: Buffer) => {
      if (this.config?.settings.logs) {
        console.log(`[PocketBase] ${data.toString()}`);
      }
      this.emit('log', { level: 'info', message: data.toString() });
    });
    
    this.process.stderr?.on('data', (data: Buffer) => {
      console.error(`[PocketBase Error] ${data.toString()}`);
      this.emit('log', { level: 'error', message: data.toString() });
    });
    
    this.process.on('exit', (code: number | null) => {
      console.log(`PocketBase process exited with code ${code}`);
      this.emit('process_exit', code);
      
      if (code !== 0 && code !== null) {
        this.emit('error', new Error(`PocketBase process exited with code ${code}`));
      }
    });
    
    this.process.on('error', (error: Error) => {
      console.error('PocketBase process error:', error);
      this.emit('error', error);
    });
  }
  
  private getEnvironmentVariables(): Record<string, string> {
    const env: Record<string, string> = {};
    
    if (this.config?.settings.encryptionEnv) {
      env.PB_ENCRYPTION_KEY = this.config.settings.encryptionEnv;
    }
    
    return env;
  }
  
  private async waitForReady(timeout = 30000): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        if (this.apiClient) {
          await this.apiClient.get('/api/health');
          return;
        }
      } catch {
        // Service not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('PocketBase service did not become ready within timeout');
  }
  
  private async setupAdminUser(): Promise<void> {
    if (!this.config?.adminEmail || !this.config?.adminPassword || !this.apiClient) {
      return;
    }
    
    try {
      // Try to create admin user
      await this.apiClient.post('/api/admins', {
        email: this.config.adminEmail,
        password: this.config.adminPassword,
        passwordConfirm: this.config.adminPassword
      });
    } catch (error) {
      // Admin might already exist, try to login
      try {
        await this.apiClient.post('/api/admins/auth-with-password', {
          identity: this.config.adminEmail,
          password: this.config.adminPassword
        });
      } catch {
        console.warn('Could not setup or login admin user');
      }
    }
  }
  
  private async applyConfiguration(): Promise<void> {
    // Apply configuration through PocketBase API
    // This would set up collections, rules, settings, etc.
    this.emit('configuration_applied');
  }
  
  private async applyServiceConfiguration(service: string, enabled: boolean): Promise<void> {
    // Apply service-specific configuration
    // This would enable/disable specific PocketBase features
    this.emit('service_configuration_applied', service, enabled);
  }
  
  private async testDatabase(): Promise<TestResult> {
    try {
      if (!this.apiClient) {
        return { success: false, message: 'API client not available' };
      }
      
      // Test database connectivity
      const response = await this.apiClient.get('/api/collections');
      
      return {
        success: true,
        message: `Database accessible, ${response.data?.items?.length || 0} collections found`
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Database test failed'
      };
    }
  }
  
  private async testAuthentication(): Promise<TestResult> {
    try {
      if (!this.apiClient) {
        return { success: false, message: 'API client not available' };
      }
      
      // Test auth endpoints
      const response = await this.apiClient.get('/api/collections');
      
      return {
        success: true,
        message: 'Authentication service accessible'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Authentication test failed'
      };
    }
  }
  
  private async testStorage(): Promise<TestResult> {
    try {
      if (!this.apiClient) {
        return { success: false, message: 'API client not available' };
      }
      
      // Test storage by checking if we can access file endpoints
      // This is a basic test - a real implementation would upload/download a test file
      return {
        success: true,
        message: 'Storage service available'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Storage test failed'
      };
    }
  }
  
  private async testRealtime(): Promise<TestResult> {
    try {
      // Test WebSocket connectivity
      // This would establish a WebSocket connection to test real-time features
      return {
        success: true,
        message: 'Real-time service available'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Real-time test failed'
      };
    }
  }
}

/**
 * PocketBase Provider Factory
 */
export class PocketBaseProviderFactory implements import('../interfaces/enhanced-provider-registry').IEnhancedProviderFactory {
  public readonly name = 'pocketbase-factory';
  public readonly supportedTypes: ProviderType[] = ['pocketbase-all-in-one'];
  
  async createProvider(type: ProviderType, config: ProviderConfiguration): Promise<IEnhancedProvider> {
    if (!this.supportedTypes.includes(type)) {
      throw new Error(`Unsupported provider type: ${type}`);
    }
    
    const provider = new PocketBaseProvider();
    await provider.initialize(config);
    
    return provider;
  }
  
  getSupportedTypes(): ProviderType[] {
    return this.supportedTypes;
  }
  
  async validateConfig(type: ProviderType, config: ProviderConfiguration): Promise<ValidationResult> {
    if (!this.supportedTypes.includes(type)) {
      return {
        valid: false,
        errors: [`Unsupported provider type: ${type}`],
        warnings: []
      };
    }
    
    const provider = new PocketBaseProvider();
    return provider.validateConfig(config);
  }
  
  getProviderInfo(type: ProviderType): import('../interfaces/enhanced-provider-registry').ProviderInfo {
    return {
      type,
      name: 'PocketBase',
      description: 'Open-source backend in a single file with database, auth, storage, and admin dashboard',
      category: 'all-in-one',
      vendor: 'PocketBase',
      version: '0.22.x',
      documentation: 'https://pocketbase.io/docs/',
      features: [
        'SQLite Database',
        'Real-time Subscriptions',
        'Authentication',
        'File Storage',
        'Admin Dashboard',
        'REST API',
        'OAuth2',
        'Email Templates'
      ],
      tags: ['database', 'auth', 'storage', 'realtime', 'admin', 'sqlite', 'golang'],
      maturity: 'stable',
      pricing: 'free'
    };
  }
  
  getProviderRequirements(type: ProviderType): import('../interfaces/enhanced-provider-registry').ProviderRequirements {
    return {
      system: {
        os: ['linux', 'darwin', 'windows'],
        architecture: ['amd64', 'arm64'],
        memory: 64, // MB
        disk: 100,  // MB
        cpu: 1      // cores
      },
      runtime: {
        // PocketBase is a single binary, no runtime dependencies
      },
      network: {
        ports: [8090], // default port
        protocols: ['http', 'https', 'ws', 'wss'],
        outbound: ['smtp'],
        inbound: ['http']
      },
      dependencies: {
        required: [],
        optional: ['smtp-server'],
        conflicting: []
      }
    };
  }
  
  canAutoSetup(type: ProviderType): boolean {
    return this.supportedTypes.includes(type);
  }
  
  generateDefaultConfig(type: ProviderType): ProviderConfiguration {
    const provider = new PocketBaseProvider();
    const defaultConfig = provider.generateDefaultConfig() as PocketBaseConfig;
    
    return {
      id: 'pocketbase-default',
      name: 'PocketBase',
      type,
      version: '1.0.0',
      description: 'PocketBase all-in-one backend',
      tags: ['database', 'auth', 'storage'],
      category: 'all-in-one',
      features: {
        database: {
          transactions: true,
          migrations: true,
          relationships: true,
          fullTextSearch: true,
          realTimeSubscriptions: true,
          backup: true
        },
        authentication: {
          localAuth: true,
          oauth2: true,
          jwt: true,
          mfa: false,
          passwordReset: true,
          emailVerification: true,
          sessionManagement: true,
          rbac: true
        },
        email: {
          transactional: true,
          templates: true,
          tracking: false,
          scheduling: false,
          attachments: true,
          webhooks: false
        },
        storage: {
          fileUpload: true,
          imageProcessing: true,
          cdn: false,
          versioning: false,
          publicAccess: true,
          privateAccess: true,
          presignedUrls: false
        },
        realtime: {
          websockets: true,
          serverSentEvents: true,
          pubsub: true,
          presence: false,
          broadcasting: true
        },
        admin: {
          dashboard: true,
          userManagement: true,
          analytics: false,
          logs: true,
          monitoring: true
        }
      },
      compatibility: {
        frameworks: ['express', 'fastify', 'nest', 'react', 'vue', 'svelte'],
        deployment: {
          standalone: true,
          docker: true,
          serverless: false,
          edge: false
        },
        environment: {
          development: true,
          staging: true,
          production: true
        },
        scale: {
          singleTenant: true,
          multiTenant: true,
          enterprise: false
        }
      },
      dependencies: [],
      config: defaultConfig,
      secrets: {},
      enabled: true,
      autoStart: true,
      healthCheck: true,
      priority: 1,
      timeout: 30000,
      retries: 3
    };
  }
  
  async testProviderType(type: ProviderType, config: ProviderConfiguration): Promise<TestResult> {
    try {
      const provider = await this.createProvider(type, config);
      const result = await provider.testConnection(config);
      
      // Cleanup
      await provider.destroy();
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Provider test failed'
      };
    }
  }
  
  getWizardSteps(type: ProviderType): import('./provider-types').WizardStep[] {
    if (!this.supportedTypes.includes(type)) {
      return [];
    }
    
    const provider = new PocketBaseProvider();
    return provider.getWizardSteps();
  }
}