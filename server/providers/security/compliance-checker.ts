/**
 * Compliance Checker for Provider System
 * 
 * Specialized compliance validation system that ensures all providers
 * meet specific regulatory requirements (GDPR, CCPA, SOC2, etc.).
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SecurityValidator, SecurityAuditResult, SecurityViolation } from './security-validator';

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  description: string;
  jurisdiction: string[];
  applicableIndustries: string[];
  requirements: ComplianceRequirement[];
  auditFrequency: number; // days
  certificationRequired: boolean;
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  category: 'technical' | 'administrative' | 'physical';
  mandatory: boolean;
  controlObjectives: string[];
  evidenceRequired: string[];
  testProcedures: ComplianceTest[];
  relatedControls: string[];
}

export interface ComplianceTest {
  id: string;
  name: string;
  description: string;
  automatable: boolean;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  procedure: (provider: any, config: any) => Promise<ComplianceTestResult>;
}

export interface ComplianceTestResult {
  testId: string;
  status: 'pass' | 'fail' | 'warning' | 'not_applicable';
  score: number; // 0-100
  evidence: ComplianceEvidence[];
  findings: string[];
  recommendations: string[];
  nextTestDate?: Date;
}

export interface ComplianceEvidence {
  type: 'configuration' | 'log' | 'certificate' | 'policy' | 'procedure';
  description: string;
  location: string;
  timestamp: Date;
  hash?: string; // For integrity verification
  retention: number; // days
}

export interface ComplianceAssessment {
  frameworkId: string;
  providerId: string;
  timestamp: Date;
  overallStatus: 'compliant' | 'non_compliant' | 'partially_compliant';
  overallScore: number; // 0-100
  requirementResults: ComplianceRequirementResult[];
  gaps: ComplianceGap[];
  evidence: ComplianceEvidence[];
  certificationStatus: 'certified' | 'pending' | 'expired' | 'not_applicable';
  nextAssessmentDate: Date;
  auditorNotes?: string[];
}

export interface ComplianceRequirementResult {
  requirementId: string;
  status: 'compliant' | 'non_compliant' | 'partially_compliant';
  score: number;
  testResults: ComplianceTestResult[];
  evidence: ComplianceEvidence[];
  gaps: string[];
}

export interface ComplianceGap {
  requirementId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  remediation: {
    steps: string[];
    timeline: number; // days
    cost: 'low' | 'medium' | 'high';
    priority: number; // 1-10
  };
}

export class ComplianceChecker extends EventEmitter {
  private frameworks: Map<string, ComplianceFramework> = new Map();
  private assessmentHistory: ComplianceAssessment[] = [];
  private securityValidator: SecurityValidator;

  constructor(securityValidator: SecurityValidator) {
    super();
    this.securityValidator = securityValidator;
    this.initializeComplianceFrameworks();
  }

  /**
   * Initialize compliance frameworks
   */
  private async initializeComplianceFrameworks(): Promise<void> {
    const frameworks: ComplianceFramework[] = [
      {
        id: 'GDPR',
        name: 'General Data Protection Regulation',
        version: '2018',
        description: 'EU regulation on data protection and privacy',
        jurisdiction: ['EU', 'EEA'],
        applicableIndustries: ['all'],
        auditFrequency: 365, // Annual
        certificationRequired: false,
        requirements: [
          {
            id: 'GDPR_ART_5',
            title: 'Principles relating to processing of personal data',
            description: 'Personal data must be processed lawfully, fairly, and transparently',
            category: 'technical',
            mandatory: true,
            controlObjectives: [
              'Data minimization',
              'Purpose limitation',
              'Storage limitation',
              'Accuracy',
              'Integrity and confidentiality'
            ],
            evidenceRequired: [
              'Data processing records',
              'Privacy impact assessments',
              'Data retention policies',
              'Access control logs'
            ],
            testProcedures: [
              {
                id: 'GDPR_ART_5_T1',
                name: 'Data Classification Test',
                description: 'Verify personal data is properly classified and protected',
                automatable: true,
                frequency: 'continuous',
                procedure: async (provider, config) => {
                  const evidence: ComplianceEvidence[] = [];
                  const findings: string[] = [];
                  let score = 100;

                  // Check if personal data fields are identified
                  if (!config.dataClassification || !config.dataClassification.personalData) {
                    findings.push('Personal data fields not properly classified');
                    score -= 30;
                  } else {
                    evidence.push({
                      type: 'configuration',
                      description: 'Personal data classification configuration',
                      location: 'provider.config.dataClassification',
                      timestamp: new Date(),
                      retention: 2555 // 7 years
                    });
                  }

                  // Check encryption for personal data
                  if (!config.encryption || !config.encryption.personalData) {
                    findings.push('Personal data not encrypted');
                    score -= 40;
                  }

                  // Check access controls
                  if (!config.accessControl || !config.accessControl.personalData) {
                    findings.push('Access controls for personal data not configured');
                    score -= 30;
                  }

                  return {
                    testId: 'GDPR_ART_5_T1',
                    status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
                    score,
                    evidence,
                    findings,
                    recommendations: [
                      'Implement comprehensive data classification system',
                      'Enable encryption for all personal data fields',
                      'Configure role-based access controls for personal data'
                    ]
                  };
                }
              }
            ],
            relatedControls: ['GDPR_ART_6', 'GDPR_ART_25']
          },

          {
            id: 'GDPR_ART_17',
            title: 'Right to erasure (right to be forgotten)',
            description: 'Data subjects have the right to have their personal data erased',
            category: 'technical',
            mandatory: true,
            controlObjectives: [
              'Data erasure capability',
              'Automated deletion processes',
              'Third-party notification'
            ],
            evidenceRequired: [
              'Data deletion procedures',
              'Deletion logs',
              'Third-party notification records'
            ],
            testProcedures: [
              {
                id: 'GDPR_ART_17_T1',
                name: 'Data Erasure Test',
                description: 'Verify ability to completely erase personal data',
                automatable: true,
                frequency: 'monthly',
                procedure: async (provider, config) => {
                  const evidence: ComplianceEvidence[] = [];
                  const findings: string[] = [];
                  let score = 100;

                  // Check for data deletion capability
                  if (!provider.deletePersonalData || typeof provider.deletePersonalData !== 'function') {
                    findings.push('Data deletion capability not implemented');
                    score -= 50;
                  }

                  // Check for deletion logging
                  if (!config.auditLogging || !config.auditLogging.deletions) {
                    findings.push('Deletion activities not logged');
                    score -= 25;
                  }

                  // Check for backup erasure
                  if (!config.backup || !config.backup.erasureCapability) {
                    findings.push('Backup erasure capability not configured');
                    score -= 25;
                  }

                  return {
                    testId: 'GDPR_ART_17_T1',
                    status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
                    score,
                    evidence,
                    findings,
                    recommendations: [
                      'Implement comprehensive data erasure functionality',
                      'Enable audit logging for all deletion operations',
                      'Configure backup systems to support data erasure'
                    ]
                  };
                }
              }
            ],
            relatedControls: ['GDPR_ART_5', 'GDPR_ART_30']
          },

          {
            id: 'GDPR_ART_32',
            title: 'Security of processing',
            description: 'Appropriate technical and organizational measures for data security',
            category: 'technical',
            mandatory: true,
            controlObjectives: [
              'Pseudonymization and encryption',
              'Confidentiality, integrity, availability',
              'Resilience of processing systems',
              'Incident response capability'
            ],
            evidenceRequired: [
              'Encryption implementation',
              'Access control systems',
              'Incident response procedures',
              'Security audit reports'
            ],
            testProcedures: [
              {
                id: 'GDPR_ART_32_T1',
                name: 'Security Controls Test',
                description: 'Verify implementation of appropriate security measures',
                automatable: true,
                frequency: 'continuous',
                procedure: async (provider, config) => {
                  const evidence: ComplianceEvidence[] = [];
                  const findings: string[] = [];
                  let score = 100;

                  // Check encryption
                  if (!config.encryption || !config.encryption.atRest || !config.encryption.inTransit) {
                    findings.push('Encryption not properly implemented');
                    score -= 30;
                  }

                  // Check access controls
                  if (!config.accessControl || !config.accessControl.roleBasedAccess) {
                    findings.push('Role-based access control not implemented');
                    score -= 25;
                  }

                  // Check incident response
                  if (!config.incidentResponse || !config.incidentResponse.procedures) {
                    findings.push('Incident response procedures not defined');
                    score -= 25;
                  }

                  // Check monitoring
                  if (!config.monitoring || !config.monitoring.securityEvents) {
                    findings.push('Security event monitoring not configured');
                    score -= 20;
                  }

                  return {
                    testId: 'GDPR_ART_32_T1',
                    status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
                    score,
                    evidence,
                    findings,
                    recommendations: [
                      'Implement end-to-end encryption for all personal data',
                      'Configure comprehensive role-based access controls',
                      'Develop and test incident response procedures',
                      'Enable security event monitoring and alerting'
                    ]
                  };
                }
              }
            ],
            relatedControls: ['GDPR_ART_5', 'GDPR_ART_25', 'GDPR_ART_33']
          }
        ]
      },

      {
        id: 'SOC2_TYPE2',
        name: 'SOC 2 Type II',
        version: '2017',
        description: 'Service Organization Control 2 Type II audit',
        jurisdiction: ['US', 'Global'],
        applicableIndustries: ['technology', 'saas', 'cloud'],
        auditFrequency: 365, // Annual
        certificationRequired: true,
        requirements: [
          {
            id: 'SOC2_CC6_1',
            title: 'Logical and Physical Access Controls',
            description: 'The entity implements logical and physical access controls',
            category: 'technical',
            mandatory: true,
            controlObjectives: [
              'Logical access control',
              'Physical access control',
              'Network access control',
              'Privileged access management'
            ],
            evidenceRequired: [
              'Access control policies',
              'User access reviews',
              'Privilege escalation logs',
              'Physical security controls'
            ],
            testProcedures: [
              {
                id: 'SOC2_CC6_1_T1',
                name: 'Access Control Implementation Test',
                description: 'Verify logical and physical access controls are properly implemented',
                automatable: true,
                frequency: 'monthly',
                procedure: async (provider, config) => {
                  const evidence: ComplianceEvidence[] = [];
                  const findings: string[] = [];
                  let score = 100;

                  // Check multi-factor authentication
                  if (!config.mfa || !config.mfa.enabled) {
                    findings.push('Multi-factor authentication not enabled');
                    score -= 25;
                  }

                  // Check role-based access
                  if (!config.accessControl || !config.accessControl.rbac) {
                    findings.push('Role-based access control not implemented');
                    score -= 25;
                  }

                  // Check privileged access monitoring
                  if (!config.monitoring || !config.monitoring.privilegedAccess) {
                    findings.push('Privileged access monitoring not configured');
                    score -= 25;
                  }

                  // Check network access controls
                  if (!config.network || !config.network.accessControl) {
                    findings.push('Network access controls not configured');
                    score -= 25;
                  }

                  return {
                    testId: 'SOC2_CC6_1_T1',
                    status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
                    score,
                    evidence,
                    findings,
                    recommendations: [
                      'Enable multi-factor authentication for all users',
                      'Implement role-based access control system',
                      'Configure privileged access monitoring',
                      'Establish network segmentation and access controls'
                    ]
                  };
                }
              }
            ],
            relatedControls: ['SOC2_CC6_2', 'SOC2_CC6_3']
          }
        ]
      },

      {
        id: 'PCI_DSS',
        name: 'Payment Card Industry Data Security Standard',
        version: '4.0',
        description: 'Security standards for payment card data protection',
        jurisdiction: ['US', 'Global'],
        applicableIndustries: ['payment', 'retail', 'e-commerce'],
        auditFrequency: 365, // Annual
        certificationRequired: true,
        requirements: [
          {
            id: 'PCI_REQ_3',
            title: 'Protect stored cardholder data',
            description: 'Protect stored account data through encryption and other methods',
            category: 'technical',
            mandatory: true,
            controlObjectives: [
              'Cardholder data encryption',
              'Key management',
              'Data retention policies',
              'Secure deletion'
            ],
            evidenceRequired: [
              'Encryption implementation',
              'Key management procedures',
              'Data retention policies',
              'Secure deletion logs'
            ],
            testProcedures: [
              {
                id: 'PCI_REQ_3_T1',
                name: 'Cardholder Data Protection Test',
                description: 'Verify cardholder data is properly encrypted and protected',
                automatable: true,
                frequency: 'continuous',
                procedure: async (provider, config) => {
                  const evidence: ComplianceEvidence[] = [];
                  const findings: string[] = [];
                  let score = 100;

                  // Check for cardholder data encryption
                  if (!config.encryption || !config.encryption.cardholderData) {
                    findings.push('Cardholder data encryption not configured');
                    score -= 40;
                  }

                  // Check key management
                  if (!config.keyManagement || !config.keyManagement.procedures) {
                    findings.push('Key management procedures not defined');
                    score -= 30;
                  }

                  // Check data retention
                  if (!config.dataRetention || !config.dataRetention.cardholderData) {
                    findings.push('Cardholder data retention policy not configured');
                    score -= 30;
                  }

                  return {
                    testId: 'PCI_REQ_3_T1',
                    status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
                    score,
                    evidence,
                    findings,
                    recommendations: [
                      'Implement strong encryption for all cardholder data',
                      'Establish comprehensive key management procedures',
                      'Define and enforce data retention policies',
                      'Implement secure deletion procedures for expired data'
                    ]
                  };
                }
              }
            ],
            relatedControls: ['PCI_REQ_2', 'PCI_REQ_4']
          }
        ]
      }
    ];

    // Register all frameworks
    for (const framework of frameworks) {
      this.frameworks.set(framework.id, framework);
    }
  }

  /**
   * Assess compliance for a specific framework and provider
   */
  async assessCompliance(
    frameworkId: string,
    providerId: string,
    provider: any,
    config: any,
    options: {
      requirementIds?: string[];
      generateEvidence?: boolean;
      auditorNotes?: string[];
    } = {}
  ): Promise<ComplianceAssessment> {
    const framework = this.frameworks.get(frameworkId);
    if (!framework) {
      throw new Error(`Compliance framework '${frameworkId}' not found`);
    }

    const timestamp = new Date();
    const requirementResults: ComplianceRequirementResult[] = [];
    const gaps: ComplianceGap[] = [];
    const evidence: ComplianceEvidence[] = [];

    // Filter requirements if specified
    const requirements = options.requirementIds
      ? framework.requirements.filter(req => options.requirementIds!.includes(req.id))
      : framework.requirements;

    // Assess each requirement
    for (const requirement of requirements) {
      const requirementResult = await this.assessRequirement(
        requirement,
        provider,
        config,
        options.generateEvidence
      );

      requirementResults.push(requirementResult);
      
      // Collect evidence
      if (options.generateEvidence) {
        evidence.push(...requirementResult.evidence);
      }

      // Identify gaps
      if (requirementResult.status !== 'compliant') {
        const gap: ComplianceGap = {
          requirementId: requirement.id,
          severity: this.determineSeverity(requirementResult.score, requirement.mandatory),
          description: `Non-compliance with ${requirement.title}`,
          impact: this.assessImpact(requirement, requirementResult),
          remediation: {
            steps: this.generateRemediationSteps(requirement, requirementResult),
            timeline: this.estimateRemediationTimeline(requirement, requirementResult),
            cost: this.estimateRemediationCost(requirement, requirementResult),
            priority: this.calculatePriority(requirement, requirementResult)
          }
        };
        gaps.push(gap);
      }
    }

    // Calculate overall compliance status and score
    const overallScore = requirementResults.reduce((sum, result) => sum + result.score, 0) / requirementResults.length;
    const overallStatus = this.determineOverallStatus(requirementResults, framework);

    // Determine certification status
    const certificationStatus = this.determineCertificationStatus(framework, overallStatus, overallScore);

    const assessment: ComplianceAssessment = {
      frameworkId,
      providerId,
      timestamp,
      overallStatus,
      overallScore,
      requirementResults,
      gaps,
      evidence,
      certificationStatus,
      nextAssessmentDate: new Date(Date.now() + framework.auditFrequency * 24 * 60 * 60 * 1000),
      auditorNotes: options.auditorNotes
    };

    // Store assessment history
    this.assessmentHistory.push(assessment);
    this.emit('assessment-completed', assessment);

    return assessment;
  }

  /**
   * Assess a single compliance requirement
   */
  private async assessRequirement(
    requirement: ComplianceRequirement,
    provider: any,
    config: any,
    generateEvidence?: boolean
  ): Promise<ComplianceRequirementResult> {
    const testResults: ComplianceTestResult[] = [];
    const evidence: ComplianceEvidence[] = [];
    const gaps: string[] = [];

    // Run all test procedures for the requirement
    for (const test of requirement.testProcedures) {
      try {
        const testResult = await test.procedure(provider, config);
        testResults.push(testResult);

        if (generateEvidence) {
          evidence.push(...testResult.evidence);
        }

        if (testResult.status === 'fail') {
          gaps.push(...testResult.findings);
        }
      } catch (error) {
        testResults.push({
          testId: test.id,
          status: 'fail',
          score: 0,
          evidence: [],
          findings: [`Test execution failed: ${error.message}`],
          recommendations: ['Review test configuration and provider setup']
        });
      }
    }

    // Calculate requirement score and status
    const score = testResults.length > 0 
      ? testResults.reduce((sum, result) => sum + result.score, 0) / testResults.length
      : 0;

    const status = this.determineRequirementStatus(score, requirement.mandatory);

    return {
      requirementId: requirement.id,
      status,
      score,
      testResults,
      evidence,
      gaps
    };
  }

  /**
   * Determine requirement compliance status
   */
  private determineRequirementStatus(
    score: number,
    mandatory: boolean
  ): 'compliant' | 'non_compliant' | 'partially_compliant' {
    if (score >= 90) return 'compliant';
    if (score >= 70 && !mandatory) return 'partially_compliant';
    if (score >= 50 && !mandatory) return 'partially_compliant';
    return 'non_compliant';
  }

  /**
   * Determine overall compliance status
   */
  private determineOverallStatus(
    requirementResults: ComplianceRequirementResult[],
    framework: ComplianceFramework
  ): 'compliant' | 'non_compliant' | 'partially_compliant' {
    const mandatoryResults = requirementResults.filter(result =>
      framework.requirements.find(req => req.id === result.requirementId)?.mandatory
    );

    const mandatoryCompliant = mandatoryResults.every(result => result.status === 'compliant');
    const allCompliant = requirementResults.every(result => result.status === 'compliant');
    const someCompliant = requirementResults.some(result => result.status !== 'non_compliant');

    if (allCompliant) return 'compliant';
    if (!mandatoryCompliant) return 'non_compliant';
    if (someCompliant) return 'partially_compliant';
    return 'non_compliant';
  }

  /**
   * Determine certification status
   */
  private determineCertificationStatus(
    framework: ComplianceFramework,
    overallStatus: string,
    overallScore: number
  ): 'certified' | 'pending' | 'expired' | 'not_applicable' {
    if (!framework.certificationRequired) return 'not_applicable';
    if (overallStatus === 'compliant' && overallScore >= 90) return 'certified';
    if (overallStatus === 'partially_compliant' && overallScore >= 70) return 'pending';
    return 'expired';
  }

  /**
   * Determine gap severity
   */
  private determineSeverity(score: number, mandatory: boolean): 'critical' | 'high' | 'medium' | 'low' {
    if (mandatory && score < 50) return 'critical';
    if (mandatory && score < 70) return 'high';
    if (score < 50) return 'high';
    if (score < 70) return 'medium';
    return 'low';
  }

  /**
   * Assess compliance gap impact
   */
  private assessImpact(requirement: ComplianceRequirement, result: ComplianceRequirementResult): string {
    const impacts = [
      'Regulatory penalties and fines',
      'Operational disruption',
      'Reputational damage',
      'Customer trust loss',
      'Certification failure'
    ];

    if (requirement.mandatory && result.score < 50) {
      return 'Critical compliance failure may result in regulatory action, significant fines, and loss of certification';
    }

    if (result.score < 70) {
      return 'Moderate compliance gap may impact certification and increase regulatory scrutiny';
    }

    return 'Minor compliance gap with limited operational impact';
  }

  /**
   * Generate remediation steps
   */
  private generateRemediationSteps(
    requirement: ComplianceRequirement,
    result: ComplianceRequirementResult
  ): string[] {
    const steps: string[] = [];

    // Add specific recommendations from test results
    result.testResults.forEach(testResult => {
      steps.push(...testResult.recommendations);
    });

    // Add general remediation steps based on requirement category
    if (requirement.category === 'technical') {
      steps.push('Review and update technical security controls');
      steps.push('Implement automated compliance monitoring');
    }

    if (requirement.category === 'administrative') {
      steps.push('Update policies and procedures');
      steps.push('Conduct staff training and awareness programs');
    }

    if (requirement.category === 'physical') {
      steps.push('Review physical security controls');
      steps.push('Update access control systems');
    }

    return [...new Set(steps)]; // Remove duplicates
  }

  /**
   * Estimate remediation timeline
   */
  private estimateRemediationTimeline(
    requirement: ComplianceRequirement,
    result: ComplianceRequirementResult
  ): number {
    const baseTimeline = {
      technical: 30,
      administrative: 14,
      physical: 60
    };

    const complexityMultiplier = result.score < 50 ? 2 : result.score < 70 ? 1.5 : 1;
    const mandatoryMultiplier = requirement.mandatory ? 0.5 : 1; // Faster for mandatory requirements

    return Math.ceil(baseTimeline[requirement.category] * complexityMultiplier * mandatoryMultiplier);
  }

  /**
   * Estimate remediation cost
   */
  private estimateRemediationCost(
    requirement: ComplianceRequirement,
    result: ComplianceRequirementResult
  ): 'low' | 'medium' | 'high' {
    if (requirement.category === 'physical' || result.score < 30) return 'high';
    if (requirement.category === 'technical' || result.score < 60) return 'medium';
    return 'low';
  }

  /**
   * Calculate remediation priority
   */
  private calculatePriority(
    requirement: ComplianceRequirement,
    result: ComplianceRequirementResult
  ): number {
    let priority = 5; // Base priority

    // Increase priority for mandatory requirements
    if (requirement.mandatory) priority += 3;

    // Increase priority based on score
    if (result.score < 30) priority += 2;
    else if (result.score < 60) priority += 1;

    // Increase priority for technical requirements
    if (requirement.category === 'technical') priority += 1;

    return Math.min(10, priority);
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(
    assessments: ComplianceAssessment[],
    options: {
      includeEvidence?: boolean;
      includeTechnicalDetails?: boolean;
      format?: 'json' | 'html' | 'pdf';
    } = {}
  ): Promise<string> {
    const reportPath = path.join(
      process.cwd(),
      'compliance-reports',
      `compliance-report-${Date.now()}.${options.format || 'json'}`
    );

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalAssessments: assessments.length,
        compliantProviders: assessments.filter(a => a.overallStatus === 'compliant').length,
        averageScore: assessments.reduce((sum, a) => sum + a.overallScore, 0) / assessments.length,
        criticalGaps: assessments.reduce((sum, a) => sum + a.gaps.filter(g => g.severity === 'critical').length, 0),
        certificationStatus: {
          certified: assessments.filter(a => a.certificationStatus === 'certified').length,
          pending: assessments.filter(a => a.certificationStatus === 'pending').length,
          expired: assessments.filter(a => a.certificationStatus === 'expired').length
        }
      },
      assessments: options.includeTechnicalDetails ? assessments : assessments.map(a => ({
        frameworkId: a.frameworkId,
        providerId: a.providerId,
        timestamp: a.timestamp,
        overallStatus: a.overallStatus,
        overallScore: a.overallScore,
        certificationStatus: a.certificationStatus,
        gapCount: a.gaps.length
      })),
      recommendations: this.consolidateRecommendations(assessments),
      nextSteps: this.generateNextSteps(assessments)
    };

    // Ensure directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });

    // Write report based on format
    if (options.format === 'html') {
      await this.generateHtmlReport(report, reportPath);
    } else {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    }

    this.emit('report-generated', { reportPath, summary: report.summary });

    return reportPath;
  }

  /**
   * Generate HTML compliance report
   */
  private async generateHtmlReport(report: any, reportPath: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Compliance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .assessment { border: 1px solid #ddd; margin: 10px 0; padding: 15px; }
        .compliant { border-left: 5px solid #4CAF50; }
        .non-compliant { border-left: 5px solid #f44336; }
        .partially-compliant { border-left: 5px solid #ff9800; }
        .gap { background: #ffebee; padding: 10px; margin: 5px 0; }
        .critical { border-left: 3px solid #f44336; }
        .high { border-left: 3px solid #ff9800; }
        .medium { border-left: 3px solid #2196F3; }
        .low { border-left: 3px solid #4CAF50; }
    </style>
</head>
<body>
    <h1>Compliance Assessment Report</h1>
    <div class="summary">
        <h2>Executive Summary</h2>
        <p><strong>Generated:</strong> ${report.generatedAt}</p>
        <p><strong>Total Assessments:</strong> ${report.summary.totalAssessments}</p>
        <p><strong>Compliant Providers:</strong> ${report.summary.compliantProviders}</p>
        <p><strong>Average Score:</strong> ${report.summary.averageScore.toFixed(2)}%</p>
        <p><strong>Critical Gaps:</strong> ${report.summary.criticalGaps}</p>
    </div>
    
    <h2>Assessment Details</h2>
    ${report.assessments.map((assessment: ComplianceAssessment) => `
        <div class="assessment ${assessment.overallStatus}">
            <h3>${assessment.frameworkId} - ${assessment.providerId}</h3>
            <p><strong>Status:</strong> ${assessment.overallStatus}</p>
            <p><strong>Score:</strong> ${assessment.overallScore.toFixed(2)}%</p>
            <p><strong>Certification:</strong> ${assessment.certificationStatus}</p>
            ${assessment.gaps && assessment.gaps.length > 0 ? `
                <h4>Compliance Gaps</h4>
                ${assessment.gaps.map((gap: ComplianceGap) => `
                    <div class="gap ${gap.severity}">
                        <strong>${gap.requirementId}:</strong> ${gap.description}
                        <br><em>Impact:</em> ${gap.impact}
                    </div>
                `).join('')}
            ` : ''}
        </div>
    `).join('')}
    
    <h2>Recommendations</h2>
    <ul>
        ${report.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
    </ul>
</body>
</html>`;

    await fs.writeFile(reportPath, html);
  }

  /**
   * Consolidate recommendations across assessments
   */
  private consolidateRecommendations(assessments: ComplianceAssessment[]): string[] {
    const recommendations = new Set<string>();

    assessments.forEach(assessment => {
      assessment.gaps.forEach(gap => {
        gap.remediation.steps.forEach(step => recommendations.add(step));
      });
    });

    return Array.from(recommendations).sort();
  }

  /**
   * Generate next steps for compliance improvement
   */
  private generateNextSteps(assessments: ComplianceAssessment[]): string[] {
    const steps: string[] = [];

    // Critical gaps first
    const criticalGaps = assessments.flatMap(a => a.gaps.filter(g => g.severity === 'critical'));
    if (criticalGaps.length > 0) {
      steps.push(`Address ${criticalGaps.length} critical compliance gaps immediately`);
    }

    // High priority gaps
    const highPriorityGaps = assessments.flatMap(a => a.gaps.filter(g => g.remediation.priority >= 8));
    if (highPriorityGaps.length > 0) {
      steps.push(`Plan remediation for ${highPriorityGaps.length} high-priority gaps`);
    }

    // Certification improvements
    const pendingCertifications = assessments.filter(a => a.certificationStatus === 'pending');
    if (pendingCertifications.length > 0) {
      steps.push(`Complete certification requirements for ${pendingCertifications.length} frameworks`);
    }

    steps.push('Schedule regular compliance assessments');
    steps.push('Implement continuous compliance monitoring');
    steps.push('Update compliance documentation and procedures');

    return steps;
  }

  /**
   * Get compliance framework by ID
   */
  getFramework(frameworkId: string): ComplianceFramework | undefined {
    return this.frameworks.get(frameworkId);
  }

  /**
   * Get all available frameworks
   */
  getAllFrameworks(): ComplianceFramework[] {
    return Array.from(this.frameworks.values());
  }

  /**
   * Get assessment history
   */
  getAssessmentHistory(providerId?: string, frameworkId?: string): ComplianceAssessment[] {
    return this.assessmentHistory.filter(assessment => {
      if (providerId && assessment.providerId !== providerId) return false;
      if (frameworkId && assessment.frameworkId !== frameworkId) return false;
      return true;
    });
  }

  /**
   * Add custom compliance framework
   */
  addCustomFramework(framework: ComplianceFramework): void {
    this.frameworks.set(framework.id, framework);
    this.emit('framework-added', framework);
  }

  /**
   * Update compliance framework
   */
  updateFramework(frameworkId: string, updates: Partial<ComplianceFramework>): boolean {
    const existing = this.frameworks.get(frameworkId);
    if (existing) {
      this.frameworks.set(frameworkId, { ...existing, ...updates });
      this.emit('framework-updated', { frameworkId, updates });
      return true;
    }
    return false;
  }

  /**
   * Remove compliance framework
   */
  removeFramework(frameworkId: string): boolean {
    const removed = this.frameworks.delete(frameworkId);
    if (removed) {
      this.emit('framework-removed', frameworkId);
    }
    return removed;
  }
}