/**
 * Security System Integration Example
 * 
 * Demonstrates how to integrate the security validation system
 * with the provider registry and implement continuous monitoring.
 */

import { ProviderRegistry } from '../registry/provider-registry';
import { createSecuritySystem, defaultSecurityConfig } from './index';

/**
 * Example: Complete Security Integration
 */
export class SecurityIntegrationExample {
  private securitySystem: ReturnType<typeof createSecuritySystem>;
  private providerRegistry: ProviderRegistry;

  constructor(providerRegistry: ProviderRegistry) {
    this.providerRegistry = providerRegistry;
    this.securitySystem = createSecuritySystem({
      ...defaultSecurityConfig,
      automation: {
        autoRemediation: true,
        autoNotification: true,
        emergencyShutdown: false
      },
      thresholds: {
        securityScore: 85,
        complianceScore: 95,
        vulnerabilityRiskScore: 25,
        criticalVulnerabilities: 0
      }
    });

    this.setupSecurityMonitoring();
  }

  /**
   * Perform comprehensive security assessment of all providers
   */
  async performSecurityAssessment(): Promise<void> {
    console.log('🔒 Starting comprehensive security assessment...');

    // Get all active providers
    const providers = this.providerRegistry.getActiveProviders();
    
    const providerData = providers.map(provider => ({
      id: provider.id,
      type: provider.type,
      instance: provider.instance,
      config: provider.config
    }));

    // Run full security audit
    const dashboard = await this.securitySystem.orchestrator.assessProviderSecurity(
      providerData,
      {
        includeCompliance: ['GDPR', 'SOC2', 'PCI', 'HIPAA'],
        depth: 'comprehensive',
        generateReports: true,
        autoRemediate: true
      }
    );

    // Display results
    console.log(`📊 Security Assessment Complete:`);
    console.log(`   Overall Security Posture: ${dashboard.overallSecurityPosture}`);
    console.log(`   Security Score: ${dashboard.overallScore}/100`);
    console.log(`   Providers Assessed: ${dashboard.providers.length}`);
    console.log(`   Critical Alerts: ${dashboard.alerts.filter(a => a.severity === 'critical').length}`);
    console.log(`   Pending Tasks: ${dashboard.upcomingTasks.length}`);

    // Handle critical issues
    const criticalAlerts = dashboard.alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      console.log('🚨 CRITICAL SECURITY ISSUES DETECTED:');
      criticalAlerts.forEach(alert => {
        console.log(`   - ${alert.title}: ${alert.description}`);
      });
    }

    // Show recommendations
    if (dashboard.recommendations.length > 0) {
      console.log('💡 Security Recommendations:');
      dashboard.recommendations.slice(0, 5).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
  }

  /**
   * Setup continuous security monitoring
   */
  private setupSecurityMonitoring(): void {
    // Monitor security events
    this.securitySystem.orchestrator.on('security-violation', (violation) => {
      console.log(`⚠️ Security Violation: ${violation.message} (${violation.severity})`);
    });

    this.securitySystem.orchestrator.on('compliance-failure', (failure) => {
      console.log(`📋 Compliance Failure: ${failure.frameworkId} - ${failure.requirementId}`);
    });

    this.securitySystem.orchestrator.on('vulnerability-detected', (vulnerability) => {
      console.log(`🐛 Vulnerability: ${vulnerability.title} (${vulnerability.severity})`);
    });

    this.securitySystem.orchestrator.on('incident-created', (incident) => {
      console.log(`🚨 Security Incident: ${incident.title} - ${incident.severity}`);
    });

    this.securitySystem.orchestrator.on('emergency-protocol-activated', (protocol) => {
      console.log(`🔴 EMERGENCY: ${protocol.reason} - ${protocol.action}`);
    });

    console.log('🔒 Security monitoring active');
  }

  /**
   * Validate security system health
   */
  async validateSystemHealth(): Promise<void> {
    const healthCheck = await this.securitySystem.orchestrator.getSystemHealth();
    
    console.log('🏥 Security System Health Check:');
    console.log(`   Status: ${healthCheck.status}`);
    console.log(`   Components: ${healthCheck.components.healthy}/${healthCheck.components.total}`);
    console.log(`   Last Assessment: ${healthCheck.lastAssessment}`);
    console.log(`   Active Monitors: ${healthCheck.activeMonitors}`);
    
    if (healthCheck.issues.length > 0) {
      console.log('   Issues:');
      healthCheck.issues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    }
  }

  /**
   * Generate executive security report
   */
  async generateExecutiveReport(): Promise<string> {
    console.log('📄 Generating executive security report...');
    
    const providers = this.providerRegistry.getActiveProviders().map(provider => ({
      id: provider.id,
      type: provider.type,
      instance: provider.instance,
      config: provider.config
    }));

    const dashboard = await this.securitySystem.orchestrator.assessProviderSecurity(providers);
    const reportPath = await this.securitySystem.orchestrator.generateExecutiveReport(dashboard);
    
    console.log(`📊 Executive report generated: ${reportPath}`);
    return reportPath;
  }
}

/**
 * Example Usage Function
 */
export async function demonstrateSecurityIntegration(providerRegistry: ProviderRegistry): Promise<void> {
  console.log('🚀 Security Integration Demonstration');
  console.log('=====================================\n');

  try {
    // Initialize security integration
    const securityIntegration = new SecurityIntegrationExample(providerRegistry);

    // 1. Validate system health
    await securityIntegration.validateSystemHealth();
    console.log();

    // 2. Perform security assessment
    await securityIntegration.performSecurityAssessment();
    console.log();

    // 3. Generate executive report
    await securityIntegration.generateExecutiveReport();
    console.log();

    console.log('✅ Security integration demonstration complete');

  } catch (error) {
    console.error('❌ Security integration failed:', error);
    throw error;
  }
}

/**
 * Quick Security Check Function
 */
export async function quickSecurityCheck(
  providerId: string,
  provider: any,
  config: any
): Promise<boolean> {
  const securitySystem = createSecuritySystem();
  
  const dashboard = await securitySystem.assessProvider(providerId, provider, config);
  
  const isSecure = 
    dashboard.overallScore >= 80 &&
    dashboard.alerts.filter(a => a.severity === 'critical').length === 0;

  console.log(`🔍 Quick Security Check for ${providerId}:`);
  console.log(`   Score: ${dashboard.overallScore}/100`);
  console.log(`   Status: ${isSecure ? '✅ SECURE' : '❌ NEEDS ATTENTION'}`);

  return isSecure;
}