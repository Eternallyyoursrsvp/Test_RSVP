/**
 * Provider Validator
 * 
 * Comprehensive validation system for providers including security, compliance,
 * configuration validation, and integration testing.
 */

import { EventEmitter } from 'events';
import { IEnhancedProviderRegistry } from '../interfaces/enhanced-provider-registry';
import {
  ProviderType,
  ProviderConfiguration,
  TestResult,
  ValidationResult
} from '../interfaces/provider-types';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'compliance' | 'performance' | 'configuration' | 'integration';
  severity: 'error' | 'warning' | 'info';
  required: boolean;
  validator: (provider: any, config: ProviderConfiguration) => Promise<ValidationResult>;
}

export interface ValidationReport {
  validationId: string;
  providerName: string;
  providerType: ProviderType;
  timestamp: Date;
  overallResult: 'passed' | 'failed' | 'warning';
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  results: ValidationRuleResult[];
  recommendations: string[];
  complianceScore: number; // 0-100
  securityScore: number; // 0-100
  performanceScore: number; // 0-100
}

export interface ValidationRuleResult {
  rule: ValidationRule;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  result: ValidationResult;
  executionTime: number;
  error?: Error;
}

export interface ValidationOptions {
  categories?: ValidationRule['category'][];
  skipOptional?: boolean;
  continueOnError?: boolean;
  generateReport?: boolean;
  notificationCallback?: (report: ValidationReport) => void;
}

export class ProviderValidator extends EventEmitter {
  private registry: IEnhancedProviderRegistry;
  private validationRules: ValidationRule[] = [];
  private validationHistory: ValidationReport[] = [];
  private readonly MAX_HISTORY = 100;

  constructor(registry: IEnhancedProviderRegistry) {
    super();
    this.registry = registry;
    this.initializeValidationRules();
  }

  /**
   * Validate a provider comprehensively
   */
  async validateProvider(
    providerName: string,
    options: ValidationOptions = {}
  ): Promise<ValidationReport> {
    console.log(`🔍 Starting comprehensive validation for provider: ${providerName}`);

    const provider = this.registry.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider '${providerName}' not found`);
    }

    const providerInfo = this.registry.getProviderInfo(providerName);
    if (!providerInfo) {
      throw new Error(`Provider info for '${providerName}' not found`);
    }

    const validationId = `validation_${providerName}_${Date.now()}`;
    
    const report: ValidationReport = {
      validationId,
      providerName,
      providerType: providerInfo.type,
      timestamp: new Date(),
      overallResult: 'passed',
      totalRules: 0,
      passedRules: 0,
      failedRules: 0,
      warningRules: 0,
      results: [],
      recommendations: [],
      complianceScore: 0,
      securityScore: 0,
      performanceScore: 0
    };

    this.emit('validationStarted', report);
    options.notificationCallback?.(report);

    try {
      // Filter rules based on options
      const rulesToRun = this.filterRules(options);
      report.totalRules = rulesToRun.length;

      // Execute validation rules
      for (const rule of rulesToRun) {
        const ruleResult = await this.executeValidationRule(rule, provider, providerInfo, options);
        report.results.push(ruleResult);

        // Update counters
        switch (ruleResult.status) {
          case 'passed':
            report.passedRules++;
            break;
          case 'failed':
            report.failedRules++;
            if (rule.severity === 'error') {
              report.overallResult = 'failed';
            }
            break;
          case 'warning':
            report.warningRules++;
            if (report.overallResult === 'passed') {
              report.overallResult = 'warning';
            }
            break;
        }

        // Stop on error if not continuing
        if (ruleResult.status === 'failed' && rule.severity === 'error' && !options.continueOnError) {
          break;
        }
      }

      // Calculate scores
      report.complianceScore = this.calculateComplianceScore(report);
      report.securityScore = this.calculateSecurityScore(report);
      report.performanceScore = this.calculatePerformanceScore(report);

      // Generate recommendations
      report.recommendations = this.generateRecommendations(report);

      console.log(`✅ Validation completed for ${providerName}: ${report.overallResult} (${report.passedRules}/${report.totalRules} passed)`);

    } catch (error) {
      report.overallResult = 'failed';
      console.error(`❌ Validation failed for ${providerName}:`, error);
    } finally {
      this.addToHistory(report);
      this.emit('validationCompleted', report);
      options.notificationCallback?.(report);
    }

    return report;
  }

  /**
   * Validate all providers in the registry
   */
  async validateAllProviders(options: ValidationOptions = {}): Promise<ValidationReport[]> {
    const providers = this.registry.listProviders();
    const reports: ValidationReport[] = [];

    for (const provider of providers) {
      try {
        const report = await this.validateProvider(provider.name, options);
        reports.push(report);
      } catch (error) {
        console.error(`Error validating provider ${provider.name}:`, error);
      }
    }

    return reports;
  }

  /**
   * Get validation history
   */
  getValidationHistory(): ValidationReport[] {
    return [...this.validationHistory];
  }

  /**
   * Get validation rules
   */
  getValidationRules(): ValidationRule[] {
    return [...this.validationRules];
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
    console.log(`📝 Added validation rule: ${rule.name} (${rule.category})`);
  }

  /**
   * Remove validation rule
   */
  removeValidationRule(ruleId: string): boolean {
    const index = this.validationRules.findIndex(rule => rule.id === ruleId);
    if (index >= 0) {
      this.validationRules.splice(index, 1);
      console.log(`🗑️ Removed validation rule: ${ruleId}`);
      return true;
    }
    return false;
  }

  // Private Methods

  private initializeValidationRules(): void {
    // Security validation rules
    this.addValidationRule({
      id: 'security-config-validation',
      name: 'Security Configuration Validation',
      description: 'Validates security-related configuration settings',
      category: 'security',
      severity: 'error',
      required: true,
      validator: async (provider, config) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check for sensitive data in configuration
        if (this.containsSensitiveData(config.config)) {
          errors.push('Configuration contains potentially sensitive data');
        }

        // Check SSL/TLS configuration
        if (config.type.includes('db') || config.type.includes('auth')) {
          const ssl = (config.config as any).ssl;
          if (ssl === false) {
            warnings.push('SSL/TLS is disabled - consider enabling for production');
          }
        }

        // Check password policy for auth providers
        if (config.type.includes('auth')) {
          const passwordConfig = (config.config as any).passwordRequirements;
          if (passwordConfig && !passwordConfig.requireUppercase && !passwordConfig.requireNumbers) {
            warnings.push('Weak password policy detected');
          }
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings
        };
      }
    });

    this.addValidationRule({
      id: 'connection-security',
      name: 'Connection Security',
      description: 'Validates secure connection practices',
      category: 'security',
      severity: 'warning',
      required: true,
      validator: async (provider, config) => {
        const warnings: string[] = [];

        // Check for secure connection strings
        const connectionString = (config.config as any).connectionString || 
                               (config.config as any).supabaseUrl ||
                               (config.config as any).host;

        if (connectionString && typeof connectionString === 'string') {
          if (!connectionString.startsWith('https://') && !connectionString.includes('ssl=true')) {
            warnings.push('Connection may not be using secure transport');
          }
        }

        return {
          valid: true,
          errors: [],
          warnings
        };
      }
    });

    // Configuration validation rules
    this.addValidationRule({
      id: 'config-completeness',
      name: 'Configuration Completeness',
      description: 'Validates that all required configuration fields are present',
      category: 'configuration',
      severity: 'error',
      required: true,
      validator: async (provider, config) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check required fields based on provider type
        const requiredFields = this.getRequiredFields(config.type);
        
        for (const field of requiredFields) {
          if (!(config.config as any)[field]) {
            errors.push(`Required field missing: ${field}`);
          }
        }

        // Check for empty strings or null values
        for (const [key, value] of Object.entries(config.config)) {
          if (value === '' || value === null) {
            warnings.push(`Empty value for field: ${key}`);
          }
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings
        };
      }
    });

    this.addValidationRule({
      id: 'config-validation',
      name: 'Configuration Validation',
      description: 'Validates configuration values and ranges',
      category: 'configuration',
      severity: 'warning',
      required: true,
      validator: async (provider, config) => {
        const warnings: string[] = [];

        // Validate numeric ranges
        const numericFields = ['maxConnections', 'timeout', 'retries', 'port'];
        
        for (const field of numericFields) {
          const value = (config.config as any)[field];
          if (typeof value === 'number') {
            if (field === 'maxConnections' && value > 100) {
              warnings.push('High connection count may impact performance');
            }
            if (field === 'timeout' && value < 5000) {
              warnings.push('Low timeout value may cause connection issues');
            }
            if (field === 'retries' && value > 10) {
              warnings.push('High retry count may cause delays');
            }
          }
        }

        return {
          valid: true,
          errors: [],
          warnings
        };
      }
    });

    // Performance validation rules
    this.addValidationRule({
      id: 'performance-health-check',
      name: 'Performance Health Check',
      description: 'Validates provider performance characteristics',
      category: 'performance',
      severity: 'warning',
      required: false,
      validator: async (provider, config) => {
        const warnings: string[] = [];

        try {
          const health = await provider.getDetailedHealth();
          
          if (health.performance.responseTime > 1000) {
            warnings.push('High response time detected (>1000ms)');
          }
          
          if (health.performance.errorRate > 0.05) {
            warnings.push('High error rate detected (>5%)');
          }

        } catch (error) {
          warnings.push('Unable to perform performance health check');
        }

        return {
          valid: true,
          errors: [],
          warnings
        };
      }
    });

    // Integration validation rules
    this.addValidationRule({
      id: 'connectivity-test',
      name: 'Connectivity Test',
      description: 'Tests actual connectivity to provider services',
      category: 'integration',
      severity: 'error',
      required: true,
      validator: async (provider, config) => {
        const errors: string[] = [];

        try {
          const diagnostics = await provider.runDiagnostics();
          
          for (const [test, result] of Object.entries(diagnostics)) {
            if (!result.success) {
              errors.push(`Connectivity test failed: ${test} - ${result.message}`);
            }
          }

        } catch (error) {
          errors.push(`Connectivity test failed: ${(error as Error).message}`);
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings: []
        };
      }
    });

    this.addValidationRule({
      id: 'feature-compatibility',
      name: 'Feature Compatibility',
      description: 'Validates that provider features work as expected',
      category: 'integration',
      severity: 'warning',
      required: false,
      validator: async (provider, config) => {
        const warnings: string[] = [];

        try {
          const capabilities = provider.getCapabilities();
          
          // Test a few key capabilities
          const wizardIntegration = provider.getWizardIntegration?.();
          if (capabilities.includes('wizard-integration') && !wizardIntegration) {
            warnings.push('Wizard integration capability claimed but not available');
          }

          const setupAutomation = provider.getSetupAutomation?.();
          if (capabilities.includes('setup-automation') && !setupAutomation) {
            warnings.push('Setup automation capability claimed but not available');
          }

        } catch (error) {
          warnings.push('Unable to verify feature compatibility');
        }

        return {
          valid: true,
          errors: [],
          warnings
        };
      }
    });

    // Compliance validation rules
    this.addValidationRule({
      id: 'data-retention-compliance',
      name: 'Data Retention Compliance',
      description: 'Validates data retention and privacy compliance',
      category: 'compliance',
      severity: 'warning',
      required: false,
      validator: async (provider, config) => {
        const warnings: string[] = [];

        // Check for data retention settings
        if (!config.config.dataRetentionDays && !config.config.dataRetentionPolicy) {
          warnings.push('No data retention policy configured');
        }

        // Check for audit logging
        if (config.type.includes('auth') && !(config.config as any).enableAuditLogging) {
          warnings.push('Audit logging not enabled for authentication provider');
        }

        return {
          valid: true,
          errors: [],
          warnings
        };
      }
    });

    console.log(`📝 Initialized ${this.validationRules.length} validation rules`);
  }

  private filterRules(options: ValidationOptions): ValidationRule[] {
    let rules = [...this.validationRules];

    // Filter by categories
    if (options.categories && options.categories.length > 0) {
      rules = rules.filter(rule => options.categories!.includes(rule.category));
    }

    // Skip optional rules if requested
    if (options.skipOptional) {
      rules = rules.filter(rule => rule.required);
    }

    return rules;
  }

  private async executeValidationRule(
    rule: ValidationRule,
    provider: any,
    providerInfo: any,
    options: ValidationOptions
  ): Promise<ValidationRuleResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Running validation rule: ${rule.name}`);
      
      const result = await rule.validator(provider, providerInfo);
      const executionTime = Date.now() - startTime;

      let status: ValidationRuleResult['status'] = 'passed';
      
      if (result.errors.length > 0) {
        status = rule.severity === 'error' ? 'failed' : 'warning';
      } else if (result.warnings.length > 0) {
        status = 'warning';
      }

      return {
        rule,
        status,
        result,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        rule,
        status: 'failed',
        result: {
          valid: false,
          errors: [`Rule execution failed: ${(error as Error).message}`],
          warnings: []
        },
        executionTime,
        error: error as Error
      };
    }
  }

  private calculateComplianceScore(report: ValidationReport): number {
    const complianceRules = report.results.filter(r => r.rule.category === 'compliance');
    if (complianceRules.length === 0) return 100;

    const passedRules = complianceRules.filter(r => r.status === 'passed').length;
    return Math.round((passedRules / complianceRules.length) * 100);
  }

  private calculateSecurityScore(report: ValidationReport): number {
    const securityRules = report.results.filter(r => r.rule.category === 'security');
    if (securityRules.length === 0) return 100;

    let score = 0;
    for (const result of securityRules) {
      if (result.status === 'passed') {
        score += result.rule.severity === 'error' ? 40 : 20;
      } else if (result.status === 'warning') {
        score += result.rule.severity === 'error' ? 20 : 10;
      }
    }

    return Math.min(100, score);
  }

  private calculatePerformanceScore(report: ValidationReport): number {
    const performanceRules = report.results.filter(r => r.rule.category === 'performance');
    if (performanceRules.length === 0) return 100;

    const passedRules = performanceRules.filter(r => r.status === 'passed').length;
    const warningRules = performanceRules.filter(r => r.status === 'warning').length;
    
    return Math.round(((passedRules + warningRules * 0.5) / performanceRules.length) * 100);
  }

  private generateRecommendations(report: ValidationReport): string[] {
    const recommendations: string[] = [];

    // Security recommendations
    const securityIssues = report.results.filter(r => 
      r.rule.category === 'security' && (r.status === 'failed' || r.status === 'warning')
    );

    if (securityIssues.length > 0) {
      recommendations.push('Review and address security configuration issues');
      if (securityIssues.some(r => r.result.warnings.some(w => w.includes('SSL')))) {
        recommendations.push('Enable SSL/TLS for all connections in production');
      }
    }

    // Performance recommendations
    const performanceIssues = report.results.filter(r => 
      r.rule.category === 'performance' && r.status === 'warning'
    );

    if (performanceIssues.length > 0) {
      recommendations.push('Optimize provider configuration for better performance');
    }

    // Configuration recommendations
    const configIssues = report.results.filter(r => 
      r.rule.category === 'configuration' && (r.status === 'failed' || r.status === 'warning')
    );

    if (configIssues.length > 0) {
      recommendations.push('Complete provider configuration with all required fields');
    }

    // General recommendations
    if (report.overallResult === 'failed') {
      recommendations.push('Address critical validation failures before using in production');
    } else if (report.overallResult === 'warning') {
      recommendations.push('Consider addressing validation warnings for optimal operation');
    }

    // Score-based recommendations
    if (report.securityScore < 80) {
      recommendations.push('Improve security configuration to achieve better security score');
    }

    if (report.performanceScore < 70) {
      recommendations.push('Optimize provider settings for better performance');
    }

    return recommendations;
  }

  private containsSensitiveData(config: Record<string, unknown>): boolean {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /credential/i
    ];

    const configString = JSON.stringify(config);
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(configString)) {
        // Check if it's actually sensitive (not just a field name)
        const matches = configString.match(new RegExp(`"[^"]*${pattern.source}[^"]*"\\s*:\\s*"([^"]{8,})"`, 'gi'));
        if (matches && matches.length > 0) {
          return true;
        }
      }
    }

    return false;
  }

  private getRequiredFields(providerType: ProviderType): string[] {
    const requiredFieldsMap: Record<string, string[]> = {
      'postgresql': ['host', 'database', 'username'],
      'supabase-db': ['supabaseUrl', 'supabaseKey'],
      'pocketbase-all-in-one': ['url'],
      'local-auth': ['passwordMinLength', 'maxLoginAttempts'],
      'mysql': ['host', 'database', 'username']
    };

    return requiredFieldsMap[providerType] || [];
  }

  private addToHistory(report: ValidationReport): void {
    this.validationHistory.unshift(report);
    
    // Keep only last MAX_HISTORY entries
    if (this.validationHistory.length > this.MAX_HISTORY) {
      this.validationHistory = this.validationHistory.slice(0, this.MAX_HISTORY);
    }
  }
}