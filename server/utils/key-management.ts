/**
 * Encryption Key Management Utility
 * 
 * Provides enterprise-grade key management capabilities including:
 * - Automated key rotation
 * - Key lifecycle management
 * - Security compliance checks
 * - Audit trail management
 * - Emergency key recovery
 */

import cron from 'node-cron';
import crypto from 'crypto';
import { getEncryptionService, EncryptionContext } from '../services/encryption-service';
import { metricsRegistry } from '../middleware/monitoring';

// Key rotation schedule configuration
interface KeyRotationSchedule {
  context: EncryptionContext;
  cronExpression: string;
  maxAge: number; // Maximum key age in days
  warningThreshold: number; // Days before rotation to warn
  enabled: boolean;
}

// Default rotation schedules (can be overridden by environment variables)
const DEFAULT_ROTATION_SCHEDULES: KeyRotationSchedule[] = [
  {
    context: EncryptionContext.AUTH_TOKENS,
    cronExpression: '0 2 */15 * *', // Every 15 days at 2 AM
    maxAge: 30,
    warningThreshold: 7,
    enabled: true
  },
  {
    context: EncryptionContext.API_KEYS,
    cronExpression: '0 3 */30 * *', // Every 30 days at 3 AM
    maxAge: 60,
    warningThreshold: 14,
    enabled: true
  },
  {
    context: EncryptionContext.USER_PII,
    cronExpression: '0 4 */60 * *', // Every 60 days at 4 AM
    maxAge: 120,
    warningThreshold: 21,
    enabled: true
  },
  {
    context: EncryptionContext.COMMUNICATIONS,
    cronExpression: '0 5 */45 * *', // Every 45 days at 5 AM
    maxAge: 90,
    warningThreshold: 14,
    enabled: true
  },
  {
    context: EncryptionContext.FINANCIAL,
    cronExpression: '0 1 */7 * *', // Every 7 days at 1 AM
    maxAge: 14,
    warningThreshold: 3,
    enabled: true
  },
  {
    context: EncryptionContext.METADATA,
    cronExpression: '0 6 */90 * *', // Every 90 days at 6 AM
    maxAge: 180,
    warningThreshold: 30,
    enabled: true
  },
  {
    context: EncryptionContext.INTERNAL,
    cronExpression: '0 7 */120 * *', // Every 120 days at 7 AM
    maxAge: 240,
    warningThreshold: 45,
    enabled: true
  }
];

// Key management events
interface KeyManagementEvent {
  type: 'rotation' | 'warning' | 'error' | 'cleanup' | 'backup';
  context: EncryptionContext;
  keyVersion?: number;
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * Enterprise Key Management System
 */
export class KeyManagementService {
  private rotationSchedules: Map<EncryptionContext, KeyRotationSchedule> = new Map();
  private cronJobs: Map<EncryptionContext, any> = new Map();
  private events: KeyManagementEvent[] = [];
  private enabled: boolean;
  private encryptionService: ReturnType<typeof getEncryptionService>;

  constructor() {
    this.enabled = process.env.KEY_ROTATION_ENABLED !== 'false';
    
    if (this.enabled) {
      this.encryptionService = getEncryptionService();
      this.initializeRotationSchedules();
      console.log('🔑 Key management service initialized');
    }
  }

  /**
   * Initialize key rotation schedules
   */
  private initializeRotationSchedules(): void {
    for (const schedule of DEFAULT_ROTATION_SCHEDULES) {
      // Override from environment if specified
      const envCron = process.env[`KEY_ROTATION_${schedule.context.toUpperCase()}`];
      if (envCron) {
        schedule.cronExpression = envCron;
      }
      
      this.rotationSchedules.set(schedule.context, schedule);
      
      if (schedule.enabled) {
        this.scheduleKeyRotation(schedule);
      }
    }
    
    // Schedule daily health checks
    this.scheduleHealthChecks();
    
    console.log(`📅 Scheduled key rotation for ${this.rotationSchedules.size} contexts`);
  }

  /**
   * Schedule key rotation for a specific context
   */
  private scheduleKeyRotation(schedule: KeyRotationSchedule): void {
    try {
      const cronJob = cron.schedule(schedule.cronExpression, async () => {
        await this.performKeyRotation(schedule.context);
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'UTC'
      });
      
      this.cronJobs.set(schedule.context, cronJob);
      
      this.logEvent({
        type: 'rotation',
        context: schedule.context,
        message: `Key rotation scheduled: ${schedule.cronExpression}`,
        timestamp: new Date(),
        severity: 'info',
        metadata: {
          maxAge: schedule.maxAge,
          warningThreshold: schedule.warningThreshold
        }
      });
      
    } catch (error) {
      this.logEvent({
        type: 'error',
        context: schedule.context,
        message: `Failed to schedule key rotation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        severity: 'error'
      });
    }
  }

  /**
   * Schedule daily health checks
   */
  private scheduleHealthChecks(): void {
    // Daily health check at midnight
    cron.schedule('0 0 * * *', async () => {
      await this.performHealthCheck();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'UTC'
    });
    
    console.log('🏥 Scheduled daily key health checks');
  }

  /**
   * Perform key rotation for a specific context
   */
  async performKeyRotation(context: EncryptionContext): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log(`🔄 Starting key rotation for context: ${context}`);
      
      // Get current key info
      const currentKeyInfo = this.encryptionService.getKeyInfo(context);
      if (!currentKeyInfo) {
        throw new Error(`No active key found for context: ${context}`);
      }
      
      // Rotate the key
      const newKey = await this.encryptionService.rotateKey(context);
      
      const duration = performance.now() - startTime;
      
      // Record metrics
      metricsRegistry.recordHistogram('key_rotation_duration_ms', duration, {
        context: context.toString(),
        success: 'true'
      });
      
      metricsRegistry.incrementCounter('key_rotations_total', {
        context: context.toString(),
        status: 'success'
      });
      
      this.logEvent({
        type: 'rotation',
        context,
        keyVersion: newKey.version,
        message: `Key rotation completed successfully`,
        timestamp: new Date(),
        severity: 'info',
        metadata: {
          oldVersion: currentKeyInfo.version,
          newVersion: newKey.version,
          duration: Math.round(duration)
        }
      });
      
      console.log(`✅ Key rotation completed for ${context}: v${currentKeyInfo.version} → v${newKey.version}`);
      
    } catch (error) {
      const duration = performance.now() - startTime;
      
      metricsRegistry.recordHistogram('key_rotation_duration_ms', duration, {
        context: context.toString(),
        success: 'false'
      });
      
      metricsRegistry.incrementCounter('key_rotations_total', {
        context: context.toString(),
        status: 'error'
      });
      
      this.logEvent({
        type: 'error',
        context,
        message: `Key rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        severity: 'critical',
        metadata: {
          duration: Math.round(duration)
        }
      });
      
      console.error(`❌ Key rotation failed for ${context}:`, error);
      
      // In production, you might want to send alerts here
      await this.sendKeyRotationAlert(context, error);
    }
  }

  /**
   * Perform health check on all keys
   */
  async performHealthCheck(): Promise<void> {
    console.log('🏥 Performing key health check...');
    
    const healthResults: Array<{
      context: EncryptionContext;
      status: 'healthy' | 'warning' | 'critical';
      message: string;
      daysUntilRotation?: number;
    }> = [];
    
    for (const [context, schedule] of this.rotationSchedules.entries()) {
      try {
        const keyInfo = this.encryptionService.getKeyInfo(context);
        if (!keyInfo) {
          healthResults.push({
            context,
            status: 'critical',
            message: 'No active key found'
          });
          continue;
        }
        
        // Calculate key age
        const ageInDays = Math.floor((Date.now() - keyInfo.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilRotation = schedule.maxAge - ageInDays;
        
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        let message = `Key is healthy (age: ${ageInDays} days)`;
        
        if (daysUntilRotation <= 0) {
          status = 'critical';
          message = `Key is overdue for rotation (age: ${ageInDays} days, max: ${schedule.maxAge})`;
        } else if (daysUntilRotation <= schedule.warningThreshold) {
          status = 'warning';
          message = `Key rotation due in ${daysUntilRotation} days`;
        }
        
        healthResults.push({
          context,
          status,
          message,
          daysUntilRotation: Math.max(0, daysUntilRotation)
        });
        
        // Log warnings
        if (status === 'warning') {
          this.logEvent({
            type: 'warning',
            context,
            keyVersion: keyInfo.version,
            message,
            timestamp: new Date(),
            severity: 'warning',
            metadata: {
              ageInDays,
              daysUntilRotation,
              maxAge: schedule.maxAge
            }
          });
        } else if (status === 'critical') {
          this.logEvent({
            type: 'error',
            context,
            keyVersion: keyInfo.version,
            message,
            timestamp: new Date(),
            severity: 'critical',
            metadata: {
              ageInDays,
              maxAge: schedule.maxAge
            }
          });
          
          // Trigger immediate rotation for overdue keys
          await this.performKeyRotation(context);
        }
        
      } catch (error) {
        healthResults.push({
          context,
          status: 'critical',
          message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        
        this.logEvent({
          type: 'error',
          context,
          message: `Key health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          severity: 'error'
        });
      }
    }
    
    // Summary
    const healthySummary = healthResults.filter(r => r.status === 'healthy').length;
    const warningSummary = healthResults.filter(r => r.status === 'warning').length;
    const criticalSummary = healthResults.filter(r => r.status === 'critical').length;
    
    console.log(`🏥 Key health check completed: ${healthySummary} healthy, ${warningSummary} warnings, ${criticalSummary} critical`);
    
    // Record metrics
    metricsRegistry.setGauge('key_health_status', healthySummary, { status: 'healthy' });
    metricsRegistry.setGauge('key_health_status', warningSummary, { status: 'warning' });
    metricsRegistry.setGauge('key_health_status', criticalSummary, { status: 'critical' });
  }

  /**
   * Manually trigger key rotation for a context
   */
  async rotateKeyNow(context: EncryptionContext): Promise<void> {
    console.log(`🔧 Manual key rotation triggered for: ${context}`);
    await this.performKeyRotation(context);
  }

  /**
   * Rotate all keys immediately (emergency procedure)
   */
  async emergencyRotateAllKeys(): Promise<void> {
    console.log('🚨 Emergency key rotation initiated for ALL contexts');
    
    const results: Array<{ context: EncryptionContext; success: boolean; error?: string }> = [];
    
    for (const context of Object.values(EncryptionContext)) {
      try {
        await this.performKeyRotation(context);
        results.push({ context, success: true });
      } catch (error) {
        results.push({ 
          context, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    this.logEvent({
      type: 'rotation',
      context: EncryptionContext.INTERNAL,
      message: `Emergency rotation completed: ${successful} successful, ${failed} failed`,
      timestamp: new Date(),
      severity: failed > 0 ? 'warning' : 'info',
      metadata: { results }
    });
    
    console.log(`🚨 Emergency rotation completed: ${successful} successful, ${failed} failed`);
  }

  /**
   * Get key management statistics
   */
  getKeyManagementStats(): {
    scheduledRotations: number;
    activeJobs: number;
    events: number;
    nextRotations: Array<{
      context: EncryptionContext;
      nextRotation: string;
      daysUntilRotation: number;
    }>;
  } {
    const nextRotations = Array.from(this.rotationSchedules.entries()).map(([context, schedule]) => {
      const keyInfo = this.encryptionService.getKeyInfo(context);
      const ageInDays = keyInfo ? 
        Math.floor((Date.now() - keyInfo.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const daysUntilRotation = Math.max(0, schedule.maxAge - ageInDays);
      
      return {
        context,
        nextRotation: schedule.cronExpression,
        daysUntilRotation
      };
    });
    
    return {
      scheduledRotations: this.rotationSchedules.size,
      activeJobs: this.cronJobs.size,
      events: this.events.length,
      nextRotations
    };
  }

  /**
   * Get key management events
   */
  getEvents(options: {
    context?: EncryptionContext;
    type?: string;
    severity?: string;
    limit?: number;
    since?: Date;
  } = {}): KeyManagementEvent[] {
    let events = [...this.events];
    
    if (options.context) {
      events = events.filter(e => e.context === options.context);
    }
    
    if (options.type) {
      events = events.filter(e => e.type === options.type);
    }
    
    if (options.severity) {
      events = events.filter(e => e.severity === options.severity);
    }
    
    if (options.since) {
      events = events.filter(e => e.timestamp >= options.since!);
    }
    
    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (options.limit) {
      events = events.slice(0, options.limit);
    }
    
    return events;
  }

  /**
   * Update rotation schedule for a context
   */
  updateRotationSchedule(
    context: EncryptionContext, 
    updates: Partial<KeyRotationSchedule>
  ): void {
    const currentSchedule = this.rotationSchedules.get(context);
    if (!currentSchedule) {
      throw new Error(`No rotation schedule found for context: ${context}`);
    }
    
    const updatedSchedule = { ...currentSchedule, ...updates };
    this.rotationSchedules.set(context, updatedSchedule);
    
    // Restart cron job if schedule changed
    if (updates.cronExpression || updates.enabled !== undefined) {
      const existingJob = this.cronJobs.get(context);
      if (existingJob) {
        existingJob.stop();
        this.cronJobs.delete(context);
      }
      
      if (updatedSchedule.enabled) {
        this.scheduleKeyRotation(updatedSchedule);
      }
    }
    
    this.logEvent({
      type: 'rotation',
      context,
      message: 'Rotation schedule updated',
      timestamp: new Date(),
      severity: 'info',
      metadata: { updates }
    });
  }

  /**
   * Enable/disable key management service
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!enabled) {
      // Stop all cron jobs
      for (const [context, job] of this.cronJobs.entries()) {
        job.stop();
      }
      this.cronJobs.clear();
      console.log('🔑 Key management service disabled');
    } else {
      // Restart all schedules
      this.initializeRotationSchedules();
      console.log('🔑 Key management service enabled');
    }
  }

  /**
   * Log key management event
   */
  private logEvent(event: KeyManagementEvent): void {
    this.events.push(event);
    
    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events.splice(0, this.events.length - 1000);
    }
    
    // Log to console based on severity
    const logLevel = event.severity === 'error' || event.severity === 'critical' ? 'error' : 
                    event.severity === 'warning' ? 'warn' : 'info';
    
    console[logLevel](`🔑 Key Management [${event.type}] ${event.context}: ${event.message}`);
  }

  /**
   * Send key rotation alert (implement based on your notification system)
   */
  private async sendKeyRotationAlert(context: EncryptionContext, error: any): Promise<void> {
    // This is a placeholder - implement based on your notification system
    // Could send to Slack, email, PagerDuty, etc.
    console.error(`🚨 KEY ROTATION ALERT: Failed to rotate key for ${context}: ${error.message}`);
    
    // Example: Could send to a webhook, email service, etc.
    // await notificationService.sendAlert({
    //   type: 'key_rotation_failure',
    //   context,
    //   error: error.message,
    //   severity: 'critical'
    // });
  }

  /**
   * Cleanup key management service
   */
  async cleanup(): Promise<void> {
    // Stop all cron jobs
    for (const [context, job] of this.cronJobs.entries()) {
      job.stop();
    }
    this.cronJobs.clear();
    
    console.log('✅ Key management service cleaned up');
  }
}

// Export singleton instance
let keyManagementService: KeyManagementService | null = null;

export function initializeKeyManagement(): KeyManagementService {
  if (!keyManagementService) {
    keyManagementService = new KeyManagementService();
  }
  return keyManagementService;
}

export function getKeyManagementService(): KeyManagementService {
  if (!keyManagementService) {
    throw new Error('Key management service not initialized');
  }
  return keyManagementService;
}

export async function cleanupKeyManagement(): Promise<void> {
  if (keyManagementService) {
    await keyManagementService.cleanup();
    keyManagementService = null;
  }
}

// Export types
export type { KeyRotationSchedule, KeyManagementEvent };