/**
 * Security System Entry Point
 * 
 * Central export point for the complete security validation system,
 * providing unified access to all security components.
 */

// Core Security Components
export { SecurityValidator } from './security-validator';
export { ComplianceChecker } from './compliance-checker';
export { VulnerabilityScanner } from './vulnerability-scanner';
export { SecurityOrchestrator } from './security-orchestrator';

// Type Definitions
export type {
  SecurityRule,
  SecurityViolation,
  SecurityAuditResult,
  SecurityDashboard,
  SecurityTask,
  SecurityAlert,
  SecurityIncident,
  IncidentSeverity,
  IncidentStatus,
  IncidentTimeline
} from './security-validator';

export type {
  ComplianceFramework,
  ComplianceRequirement,
  ComplianceTest,
  ComplianceTestResult,
  ComplianceEvidence,
  ComplianceAssessment,
  ComplianceRequirementResult,
  ComplianceGap
} from './compliance-checker';

export type {
  VulnerabilityRule,
  VulnerabilityFinding,
  ScanResult,
  VulnerabilityReport,
  RemediationAction,
  SarifReport
} from './vulnerability-scanner';

export type {
  SecurityOrchestratorConfig,
  SecurityThresholds,
  AutomationConfig,
  AuditSchedule,
  EmergencyProtocol,
  NotificationConfig
} from './security-orchestrator';

// Convenience Factory Functions
export const createSecuritySystem = (config?: Partial<SecurityOrchestratorConfig>) => {
  const securityValidator = new SecurityValidator();
  const complianceChecker = new ComplianceChecker(securityValidator);
  const vulnerabilityScanner = new VulnerabilityScanner();
  const orchestrator = new SecurityOrchestrator(config);

  return {
    securityValidator,
    complianceChecker,
    vulnerabilityScanner,
    orchestrator,
    
    // Convenience methods
    async assessProvider(providerId: string, provider: any, config: any) {
      return await orchestrator.assessProviderSecurity(
        [{ id: providerId, type: provider.type, instance: provider, config }]
      );
    },
    
    async fullSecurityAudit(providers: Array<{ id: string; type: string; instance: any; config: any }>) {
      return await orchestrator.assessProviderSecurity(providers, {
        includeCompliance: ['GDPR', 'SOC2', 'PCI', 'HIPAA'],
        depth: 'comprehensive',
        generateReports: true,
        autoRemediate: false
      });
    }
  };
};

// Default Security Configuration
export const defaultSecurityConfig: SecurityOrchestratorConfig = {
  auditSchedule: {
    security: 'weekly',
    compliance: 'monthly',
    vulnerability: 'daily'
  },
  thresholds: {
    securityScore: 80,
    complianceScore: 90,
    vulnerabilityRiskScore: 30,
    criticalVulnerabilities: 0
  },
  automation: {
    autoRemediation: false,
    autoNotification: true,
    emergencyShutdown: false
  },
  notifications: {
    webhook: {
      enabled: false,
      url: '',
      events: ['critical-violation', 'compliance-failure', 'vulnerability-detected']
    },
    email: {
      enabled: false,
      recipients: [],
      events: ['security-report', 'incident-created', 'emergency-alert']
    }
  },
  emergencyProtocols: {
    criticalVulnerabilities: 3,
    securityScore: 30,
    dataBreachSuspected: true,
    complianceViolation: ['PCI', 'HIPAA']
  }
};

// Security System Validation
export const validateSecuritySystem = async () => {
  const system = createSecuritySystem();
  
  const healthCheck = {
    securityValidator: !!system.securityValidator,
    complianceChecker: !!system.complianceChecker,
    vulnerabilityScanner: !!system.vulnerabilityScanner,
    orchestrator: !!system.orchestrator,
    timestamp: new Date().toISOString()
  };
  
  return {
    healthy: Object.values(healthCheck).every(check => check === true || typeof check === 'string'),
    components: healthCheck,
    version: '1.0.0',
    features: [
      'Security Validation with 15+ rules',
      'Compliance Checking (GDPR, SOC2, PCI, HIPAA)',
      'Vulnerability Scanning with OWASP Top 10',
      'Automated Security Orchestration',
      'Incident Response Management',
      'SARIF Report Generation',
      'Emergency Protocols',
      'Real-time Monitoring'
    ]
  };
};