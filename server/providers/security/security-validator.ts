/**
 * Security Validator for Provider System
 * 
 * Comprehensive security validation system that audits all providers
 * for security vulnerabilities, compliance requirements, and best practices.
 */

import { EventEmitter } from 'events';
import { createHash, createCipher, createDecipher } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

// Security validation interfaces
export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'authentication' | 'authorization' | 'encryption' | 'input_validation' | 'data_protection' | 'network' | 'configuration';
  compliance: string[]; // GDPR, CCPA, SOC2, etc.
  validate: (provider: any, config: any) => Promise<SecurityViolation[]>;
}

export interface SecurityViolation {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  location: string;
  recommendation: string;
  cweId?: string; // Common Weakness Enumeration ID
  compliance: string[];
  remediation?: {
    code?: string;
    config?: Record<string, any>;
    steps: string[];
  };
}

export interface SecurityAuditResult {
  providerId: string;
  providerType: string;
  timestamp: Date;
  overallScore: number; // 0-100
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  violations: SecurityViolation[];
  compliance: {
    gdpr: boolean;
    ccpa: boolean;
    soc2: boolean;
    pci: boolean;
    hipaa: boolean;
  };
  recommendations: string[];
  nextAuditDate: Date;
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  requirements: string[];
  validationRules: string[]; // Rule IDs
  mandatory: boolean;
}

export class SecurityValidator extends EventEmitter {
  private rules: Map<string, SecurityRule> = new Map();
  private complianceRequirements: Map<string, ComplianceRequirement> = new Map();
  private auditHistory: SecurityAuditResult[] = [];

  constructor() {
    super();
    this.initializeSecurityRules();
    this.initializeComplianceRequirements();
  }

  /**
   * Initialize comprehensive security rules
   */
  private async initializeSecurityRules(): Promise<void> {
    const rules: SecurityRule[] = [
      // Authentication Security Rules
      {
        id: 'AUTH_001',
        name: 'Strong Password Policy',
        description: 'Enforce strong password requirements',
        severity: 'high',
        category: 'authentication',
        compliance: ['GDPR', 'SOC2', 'PCI'],
        validate: async (provider, config) => {
          const violations: SecurityViolation[] = [];
          
          if (provider.type === 'authentication' || provider.type === 'database') {
            if (!config.passwordPolicy) {
              violations.push({
                ruleId: 'AUTH_001',
                severity: 'high',
                message: 'No password policy configured',
                location: 'provider configuration',
                recommendation: 'Implement strong password policy with minimum 12 characters, mixed case, numbers, and special characters',
                cweId: 'CWE-521',
                compliance: ['GDPR', 'SOC2', 'PCI'],
                remediation: {
                  config: {
                    passwordPolicy: {
                      minLength: 12,
                      requireUppercase: true,
                      requireLowercase: true,
                      requireNumbers: true,
                      requireSpecialChars: true,
                      preventReuse: 12,
                      maxAge: 90
                    }
                  },
                  steps: [
                    'Configure minimum password length of 12 characters',
                    'Require mixed case letters, numbers, and special characters',
                    'Implement password history to prevent reuse',
                    'Set password expiration policy'
                  ]
                }
              });
            }
          }
          
          return violations;
        }
      },

      {
        id: 'AUTH_002',
        name: 'Multi-Factor Authentication',
        description: 'Require MFA for administrative access',
        severity: 'critical',
        category: 'authentication',
        compliance: ['SOC2', 'PCI', 'HIPAA'],
        validate: async (provider, config) => {
          const violations: SecurityViolation[] = [];
          
          if (provider.type === 'authentication') {
            if (!config.mfa || !config.mfa.enabled) {
              violations.push({
                ruleId: 'AUTH_002',
                severity: 'critical',
                message: 'Multi-factor authentication not enabled',
                location: 'authentication provider',
                recommendation: 'Enable MFA for all administrative accounts using TOTP, SMS, or hardware tokens',
                cweId: 'CWE-308',
                compliance: ['SOC2', 'PCI', 'HIPAA'],
                remediation: {
                  config: {
                    mfa: {
                      enabled: true,
                      methods: ['totp', 'sms'],
                      backupCodes: true,
                      enforceForAdmins: true
                    }
                  },
                  steps: [
                    'Enable MFA in authentication provider configuration',
                    'Configure TOTP and SMS as authentication methods',
                    'Generate backup codes for account recovery',
                    'Enforce MFA for all administrative accounts'
                  ]
                }
              });
            }
          }
          
          return violations;
        }
      },

      // Encryption Security Rules
      {
        id: 'ENC_001',
        name: 'Data Encryption at Rest',
        description: 'Ensure sensitive data is encrypted when stored',
        severity: 'critical',
        category: 'encryption',
        compliance: ['GDPR', 'CCPA', 'SOC2', 'PCI', 'HIPAA'],
        validate: async (provider, config) => {
          const violations: SecurityViolation[] = [];
          
          if (provider.type === 'database' || provider.type === 'storage') {
            if (!config.encryption || !config.encryption.atRest) {
              violations.push({
                ruleId: 'ENC_001',
                severity: 'critical',
                message: 'Data encryption at rest not configured',
                location: `${provider.type} provider`,
                recommendation: 'Enable AES-256 encryption for data at rest with proper key management',
                cweId: 'CWE-311',
                compliance: ['GDPR', 'CCPA', 'SOC2', 'PCI', 'HIPAA'],
                remediation: {
                  config: {
                    encryption: {
                      atRest: {
                        enabled: true,
                        algorithm: 'AES-256-GCM',
                        keyRotation: true,
                        keyRotationInterval: 30 // days
                      }
                    }
                  },
                  steps: [
                    'Enable encryption at rest with AES-256 algorithm',
                    'Configure secure key management system',
                    'Implement automatic key rotation',
                    'Verify encryption is applied to all sensitive data'
                  ]
                }
              });
            }
          }
          
          return violations;
        }
      },

      {
        id: 'ENC_002',
        name: 'Data Encryption in Transit',
        description: 'Ensure all data transmission uses encryption',
        severity: 'critical',
        category: 'encryption',
        compliance: ['GDPR', 'SOC2', 'PCI', 'HIPAA'],
        validate: async (provider, config) => {
          const violations: SecurityViolation[] = [];
          
          // Check TLS configuration
          if (!config.tls || !config.tls.enabled || (config.tls.version && config.tls.version < 1.2)) {
            violations.push({
              ruleId: 'ENC_002',
              severity: 'critical',
              message: 'Insufficient TLS configuration for data in transit',
              location: 'network configuration',
              recommendation: 'Enable TLS 1.2+ for all data transmission with strong cipher suites',
              cweId: 'CWE-319',
              compliance: ['GDPR', 'SOC2', 'PCI', 'HIPAA'],
              remediation: {
                config: {
                  tls: {
                    enabled: true,
                    version: 1.3,
                    cipherSuites: [
                      'TLS_AES_256_GCM_SHA384',
                      'TLS_CHACHA20_POLY1305_SHA256',
                      'TLS_AES_128_GCM_SHA256'
                    ],
                    certificateValidation: true
                  }
                },
                steps: [
                  'Enable TLS 1.2 or higher for all connections',
                  'Configure strong cipher suites',
                  'Implement certificate validation',
                  'Disable insecure protocols (SSL, TLS 1.0/1.1)'
                ]
              }
            });
          }
          
          return violations;
        }
      },

      // Input Validation Rules
      {
        id: 'VAL_001',
        name: 'SQL Injection Prevention',
        description: 'Prevent SQL injection vulnerabilities',
        severity: 'critical',
        category: 'input_validation',
        compliance: ['SOC2', 'PCI'],
        validate: async (provider, config) => {
          const violations: SecurityViolation[] = [];
          
          if (provider.type === 'database') {
            if (!config.security || !config.security.parameterizedQueries) {
              violations.push({
                ruleId: 'VAL_001',
                severity: 'critical',
                message: 'Parameterized queries not enforced',
                location: 'database provider',
                recommendation: 'Use parameterized queries and input validation to prevent SQL injection',
                cweId: 'CWE-89',
                compliance: ['SOC2', 'PCI'],
                remediation: {
                  code: `
// Use parameterized queries
const query = 'SELECT * FROM users WHERE email = ? AND active = ?';
const result = await provider.query(query, [email, true]);

// Never concatenate user input
// BAD: const query = \`SELECT * FROM users WHERE email = '\${email}'\`;
`,
                  steps: [
                    'Implement parameterized queries for all database operations',
                    'Validate and sanitize all user inputs',
                    'Use ORM query builders with built-in protection',
                    'Implement query allowlisting for complex operations'
                  ]
                }
              });
            }
          }
          
          return violations;
        }
      },

      {
        id: 'VAL_002',
        name: 'Cross-Site Scripting Prevention',
        description: 'Prevent XSS vulnerabilities in data handling',
        severity: 'high',
        category: 'input_validation',
        compliance: ['SOC2'],
        validate: async (provider, config) => {
          const violations: SecurityViolation[] = [];
          
          if (!config.security || !config.security.outputEncoding) {
            violations.push({
              ruleId: 'VAL_002',
              severity: 'high',
              message: 'Output encoding not configured',
              location: 'data handling',
              recommendation: 'Implement proper output encoding and Content Security Policy',
              cweId: 'CWE-79',
              compliance: ['SOC2'],
              remediation: {
                config: {
                  security: {
                    outputEncoding: true,
                    contentSecurityPolicy: {
                      enabled: true,
                      directives: {
                        'default-src': "'self'",
                        'script-src': "'self' 'unsafe-inline'",
                        'style-src': "'self' 'unsafe-inline'",
                        'img-src': "'self' data:",
                        'connect-src': "'self'"
                      }
                    }
                  }
                },
                steps: [
                  'Enable output encoding for all user-generated content',
                  'Implement Content Security Policy headers',
                  'Sanitize HTML input using trusted libraries',
                  'Use templating engines with auto-escaping'
                ]
              }
            });
          }
          
          return violations;
        }
      },

      // Data Protection Rules
      {
        id: 'DATA_001',
        name: 'Personal Data Identification',
        description: 'Identify and protect personal data',
        severity: 'high',
        category: 'data_protection',
        compliance: ['GDPR', 'CCPA'],
        validate: async (provider, config) => {
          const violations: SecurityViolation[] = [];
          
          if (!config.dataClassification || !config.dataClassification.personalData) {
            violations.push({
              ruleId: 'DATA_001',
              severity: 'high',
              message: 'Personal data not properly classified',
              location: 'data handling',
              recommendation: 'Implement data classification system to identify and protect personal data',
              compliance: ['GDPR', 'CCPA'],
              remediation: {
                config: {
                  dataClassification: {
                    personalData: {
                      fields: ['email', 'name', 'phone', 'address'],
                      encryption: true,
                      accessLogging: true,
                      retentionPolicy: 2555 // 7 years in days
                    }
                  }
                },
                steps: [
                  'Identify all fields containing personal data',
                  'Implement encryption for personal data fields',
                  'Enable access logging for personal data',
                  'Define data retention and deletion policies'
                ]
              }
            });
          }
          
          return violations;
        }
      },

      {
        id: 'DATA_002',
        name: 'Data Anonymization',
        description: 'Implement data anonymization for analytics',
        severity: 'medium',
        category: 'data_protection',
        compliance: ['GDPR', 'CCPA'],
        validate: async (provider, config) => {
          const violations: SecurityViolation[] = [];
          
          if (provider.type === 'database' && !config.anonymization) {
            violations.push({
              ruleId: 'DATA_002',
              severity: 'medium',
              message: 'Data anonymization not implemented',
              location: 'analytics and reporting',
              recommendation: 'Implement data anonymization techniques for analytics and non-production environments',
              compliance: ['GDPR', 'CCPA'],
              remediation: {
                config: {
                  anonymization: {
                    techniques: ['pseudonymization', 'generalization', 'suppression'],
                    fields: ['email', 'name', 'phone'],
                    preserveAnalytics: true
                  }
                },
                steps: [
                  'Implement pseudonymization for identifiable data',
                  'Use generalization for demographic data',
                  'Apply suppression for highly sensitive fields',
                  'Maintain referential integrity in anonymized datasets'
                ]
              }
            });
          }
          
          return violations;
        }
      },

      // Network Security Rules
      {
        id: 'NET_001',
        name: 'Network Access Control',
        description: 'Implement proper network access controls',
        severity: 'high',
        category: 'network',
        compliance: ['SOC2', 'PCI'],
        validate: async (provider, config) => {
          const violations: SecurityViolation[] = [];
          
          if (!config.network || !config.network.accessControl) {
            violations.push({
              ruleId: 'NET_001',
              severity: 'high',
              message: 'Network access controls not configured',
              location: 'network configuration',
              recommendation: 'Implement IP allowlisting, VPN requirements, and network segmentation',
              cweId: 'CWE-284',
              compliance: ['SOC2', 'PCI'],
              remediation: {
                config: {
                  network: {
                    accessControl: {
                      ipAllowlist: ['10.0.0.0/8', '192.168.0.0/16'],
                      vpnRequired: true,
                      networkSegmentation: true,
                      firewallRules: true
                    }
                  }
                },
                steps: [
                  'Configure IP allowlisting for administrative access',
                  'Require VPN for remote connections',
                  'Implement network segmentation',
                  'Configure firewall rules for service isolation'
                ]
              }
            });
          }
          
          return violations;
        }
      },

      // Configuration Security Rules
      {
        id: 'CFG_001',
        name: 'Secure Configuration Management',
        description: 'Ensure secure configuration practices',
        severity: 'high',
        category: 'configuration',
        compliance: ['SOC2', 'PCI'],
        validate: async (provider, config) => {
          const violations: SecurityViolation[] = [];
          
          // Check for hardcoded secrets
          const configString = JSON.stringify(config);
          const secretPatterns = [/password.*[:=]\s*["'][^"']+["']/i, /api.*key.*[:=]\s*["'][^"']+["']/i, /secret.*[:=]\s*["'][^"']+["']/i];
          
          for (const pattern of secretPatterns) {
            if (pattern.test(configString)) {
              violations.push({
                ruleId: 'CFG_001',
                severity: 'high',
                message: 'Hardcoded secrets detected in configuration',
                location: 'provider configuration',
                recommendation: 'Use environment variables or secure secret management for sensitive configuration',
                cweId: 'CWE-798',
                compliance: ['SOC2', 'PCI'],
                remediation: {
                  code: `
// Use environment variables
const config = {
  apiKey: process.env.API_KEY,
  password: process.env.DB_PASSWORD
};

// Or use secret management service
const secrets = await secretManager.getSecrets(['api-key', 'db-password']);
`,
                  steps: [
                    'Move all secrets to environment variables',
                    'Implement secure secret management service',
                    'Rotate secrets regularly',
                    'Remove hardcoded credentials from configuration files'
                  ]
                }
              });
              break;
            }
          }
          
          return violations;
        }
      },

      {
        id: 'CFG_002',
        name: 'Default Credentials',
        description: 'Ensure default credentials are changed',
        severity: 'critical',
        category: 'configuration',
        compliance: ['SOC2', 'PCI'],
        validate: async (provider, config) => {
          const violations: SecurityViolation[] = [];
          
          const defaultCredentials = [
            'admin/admin', 'admin/password', 'root/root', 'admin/123456',
            'user/user', 'test/test', 'guest/guest'
          ];
          
          const configString = JSON.stringify(config).toLowerCase();
          
          for (const cred of defaultCredentials) {
            const [user, pass] = cred.split('/');
            if (configString.includes(user) && configString.includes(pass)) {
              violations.push({
                ruleId: 'CFG_002',
                severity: 'critical',
                message: 'Default credentials detected',
                location: 'authentication configuration',
                recommendation: 'Change all default credentials to strong, unique values',
                cweId: 'CWE-521',
                compliance: ['SOC2', 'PCI'],
                remediation: {
                  steps: [
                    'Generate strong, unique credentials for all accounts',
                    'Implement credential rotation policy',
                    'Remove or disable default accounts',
                    'Document credential management procedures'
                  ]
                }
              });
              break;
            }
          }
          
          return violations;
        }
      }
    ];

    // Register all rules
    for (const rule of rules) {
      this.rules.set(rule.id, rule);
    }
  }

  /**
   * Initialize compliance requirements
   */
  private async initializeComplianceRequirements(): Promise<void> {
    const requirements: ComplianceRequirement[] = [
      {
        id: 'GDPR',
        name: 'General Data Protection Regulation',
        description: 'EU data protection and privacy regulation',
        requirements: [
          'Data encryption at rest and in transit',
          'Personal data identification and protection',
          'Data anonymization capabilities',
          'User consent management',
          'Right to be forgotten implementation',
          'Data breach notification procedures'
        ],
        validationRules: ['ENC_001', 'ENC_002', 'DATA_001', 'DATA_002'],
        mandatory: true
      },
      {
        id: 'SOC2',
        name: 'Service Organization Control 2',
        description: 'Security, availability, and confidentiality controls',
        requirements: [
          'Multi-factor authentication for administrative access',
          'Network access controls and monitoring',
          'Secure configuration management',
          'Regular security audits and reviews',
          'Incident response procedures'
        ],
        validationRules: ['AUTH_001', 'AUTH_002', 'NET_001', 'CFG_001', 'CFG_002'],
        mandatory: true
      },
      {
        id: 'PCI',
        name: 'Payment Card Industry Data Security Standard',
        description: 'Security standards for payment card data',
        requirements: [
          'Network security controls',
          'Strong authentication and access controls',
          'Data encryption and tokenization',
          'Regular security testing',
          'Security policy maintenance'
        ],
        validationRules: ['AUTH_001', 'AUTH_002', 'ENC_001', 'ENC_002', 'NET_001', 'VAL_001'],
        mandatory: false
      },
      {
        id: 'HIPAA',
        name: 'Health Insurance Portability and Accountability Act',
        description: 'Healthcare data protection requirements',
        requirements: [
          'Administrative safeguards',
          'Physical safeguards',
          'Technical safeguards',
          'Access controls and audit logs',
          'Data encryption and integrity'
        ],
        validationRules: ['AUTH_002', 'ENC_001', 'ENC_002', 'DATA_001'],
        mandatory: false
      }
    ];

    for (const requirement of requirements) {
      this.complianceRequirements.set(requirement.id, requirement);
    }
  }

  /**
   * Audit a single provider for security violations
   */
  async auditProvider(
    providerId: string,
    providerType: string,
    provider: any,
    config: any,
    options: {
      includeCompliance?: string[];
      severity?: ('critical' | 'high' | 'medium' | 'low')[];
      categories?: string[];
    } = {}
  ): Promise<SecurityAuditResult> {
    const violations: SecurityViolation[] = [];
    const timestamp = new Date();

    // Run all applicable security rules
    for (const [ruleId, rule] of this.rules) {
      // Filter by options
      if (options.severity && !options.severity.includes(rule.severity)) continue;
      if (options.categories && !options.categories.includes(rule.category)) continue;

      try {
        const ruleViolations = await rule.validate(provider, config);
        violations.push(...ruleViolations);
      } catch (error) {
        this.emit('audit-error', { providerId, ruleId, error });
      }
    }

    // Calculate overall security score
    const overallScore = this.calculateSecurityScore(violations);
    const riskLevel = this.determineRiskLevel(violations);

    // Check compliance requirements
    const compliance = await this.checkCompliance(violations, options.includeCompliance);

    // Generate recommendations
    const recommendations = this.generateRecommendations(violations);

    const auditResult: SecurityAuditResult = {
      providerId,
      providerType,
      timestamp,
      overallScore,
      riskLevel,
      violations,
      compliance,
      recommendations,
      nextAuditDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    // Store audit history
    this.auditHistory.push(auditResult);
    this.emit('audit-completed', auditResult);

    return auditResult;
  }

  /**
   * Audit all providers in the system
   */
  async auditAllProviders(
    providers: Array<{ id: string; type: string; instance: any; config: any }>,
    options: {
      includeCompliance?: string[];
      parallel?: boolean;
      generateReport?: boolean;
    } = {}
  ): Promise<SecurityAuditResult[]> {
    const auditPromises = providers.map(provider =>
      this.auditProvider(provider.id, provider.type, provider.instance, provider.config, options)
    );

    const results = options.parallel 
      ? await Promise.all(auditPromises)
      : await this.runSequentially(auditPromises);

    if (options.generateReport) {
      await this.generateSecurityReport(results);
    }

    return results;
  }

  /**
   * Calculate security score based on violations
   */
  private calculateSecurityScore(violations: SecurityViolation[]): number {
    if (violations.length === 0) return 100;

    const severityWeights = {
      critical: 40,
      high: 20,
      medium: 10,
      low: 5
    };

    const totalDeduction = violations.reduce((sum, violation) => {
      return sum + severityWeights[violation.severity];
    }, 0);

    return Math.max(0, 100 - totalDeduction);
  }

  /**
   * Determine risk level based on violations
   */
  private determineRiskLevel(violations: SecurityViolation[]): 'critical' | 'high' | 'medium' | 'low' {
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const highCount = violations.filter(v => v.severity === 'high').length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 2) return 'high';
    if (highCount > 0 || violations.length > 5) return 'medium';
    return 'low';
  }

  /**
   * Check compliance with regulations
   */
  private async checkCompliance(
    violations: SecurityViolation[],
    includeCompliance?: string[]
  ): Promise<SecurityAuditResult['compliance']> {
    const compliance = {
      gdpr: true,
      ccpa: true,
      soc2: true,
      pci: true,
      hipaa: true
    };

    // Check each compliance requirement
    for (const violation of violations) {
      for (const comp of violation.compliance) {
        const compKey = comp.toLowerCase() as keyof typeof compliance;
        if (compliance[compKey] !== undefined) {
          compliance[compKey] = false;
        }
      }
    }

    return compliance;
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(violations: SecurityViolation[]): string[] {
    const recommendations = new Set<string>();

    // Add specific recommendations from violations
    violations.forEach(violation => {
      recommendations.add(violation.recommendation);
    });

    // Add general recommendations based on violation patterns
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      recommendations.add('Address all critical security violations immediately');
      recommendations.add('Implement emergency security patches and hotfixes');
    }

    const authViolations = violations.filter(v => v.ruleId.startsWith('AUTH'));
    if (authViolations.length > 0) {
      recommendations.add('Review and strengthen authentication mechanisms');
      recommendations.add('Implement comprehensive identity and access management');
    }

    const encryptionViolations = violations.filter(v => v.ruleId.startsWith('ENC'));
    if (encryptionViolations.length > 0) {
      recommendations.add('Implement end-to-end encryption for all sensitive data');
      recommendations.add('Review and update encryption key management practices');
    }

    return Array.from(recommendations);
  }

  /**
   * Generate comprehensive security report
   */
  async generateSecurityReport(auditResults: SecurityAuditResult[]): Promise<string> {
    const reportPath = path.join(process.cwd(), 'security-reports', `security-audit-${Date.now()}.json`);
    
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalProviders: auditResults.length,
        averageScore: auditResults.reduce((sum, r) => sum + r.overallScore, 0) / auditResults.length,
        criticalViolations: auditResults.reduce((sum, r) => sum + r.violations.filter(v => v.severity === 'critical').length, 0),
        highViolations: auditResults.reduce((sum, r) => sum + r.violations.filter(v => v.severity === 'high').length, 0),
        complianceStatus: {
          gdpr: auditResults.every(r => r.compliance.gdpr),
          soc2: auditResults.every(r => r.compliance.soc2),
          pci: auditResults.every(r => r.compliance.pci)
        }
      },
      providers: auditResults,
      recommendations: this.consolidateRecommendations(auditResults)
    };

    // Ensure directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    
    // Write report
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    this.emit('report-generated', { reportPath, summary: report.summary });
    
    return reportPath;
  }

  /**
   * Consolidate recommendations across all providers
   */
  private consolidateRecommendations(auditResults: SecurityAuditResult[]): string[] {
    const allRecommendations = new Set<string>();
    
    auditResults.forEach(result => {
      result.recommendations.forEach(rec => allRecommendations.add(rec));
    });

    return Array.from(allRecommendations).sort();
  }

  /**
   * Run promises sequentially
   */
  private async runSequentially<T>(promises: Promise<T>[]): Promise<T[]> {
    const results: T[] = [];
    for (const promise of promises) {
      results.push(await promise);
    }
    return results;
  }

  /**
   * Get audit history for a provider
   */
  getAuditHistory(providerId?: string): SecurityAuditResult[] {
    return providerId 
      ? this.auditHistory.filter(audit => audit.providerId === providerId)
      : this.auditHistory;
  }

  /**
   * Get security rule by ID
   */
  getSecurityRule(ruleId: string): SecurityRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get compliance requirement by ID
   */
  getComplianceRequirement(requirementId: string): ComplianceRequirement | undefined {
    return this.complianceRequirements.get(requirementId);
  }

  /**
   * Add custom security rule
   */
  addCustomRule(rule: SecurityRule): void {
    this.rules.set(rule.id, rule);
    this.emit('rule-added', rule);
  }

  /**
   * Remove security rule
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      this.emit('rule-removed', ruleId);
    }
    return removed;
  }

  /**
   * Update security rule
   */
  updateRule(ruleId: string, updates: Partial<SecurityRule>): boolean {
    const existing = this.rules.get(ruleId);
    if (existing) {
      this.rules.set(ruleId, { ...existing, ...updates });
      this.emit('rule-updated', { ruleId, updates });
      return true;
    }
    return false;
  }
}