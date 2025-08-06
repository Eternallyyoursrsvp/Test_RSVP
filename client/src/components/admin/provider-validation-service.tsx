/**
 * Provider Validation Service
 * 
 * Comprehensive validation service for providers including health checks,
 * performance monitoring, security validation, and compliance checking.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Shield,
  Zap,
  Database,
  Mail,
  HardDrive,
  Settings,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2,
  ExternalLink,
  Download,
  AlertCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { post } from '@/lib/api-utils';

interface ValidationTest {
  id: string;
  name: string;
  description: string;
  category: 'connectivity' | 'performance' | 'security' | 'compliance' | 'configuration';
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning' | 'skipped';
  duration: number;
  message?: string;
  details?: string;
  recommendations?: string[];
  metrics?: Record<string, number>;
}

interface ValidationSuite {
  id: string;
  name: string;
  providerId: string;
  providerType: string;
  tests: ValidationTest[];
  overallStatus: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  startTime?: Date;
  endTime?: Date;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
  };
  healthScore: number;
  performanceScore: number;
  securityScore: number;
}

interface ProviderValidationServiceProps {
  providers: Array<{
    id: string;
    name: string;
    type: string;
    configuration: Record<string, any>;
  }>;
  onValidationComplete?: (results: ValidationSuite[]) => void;
}

export function ProviderValidationService({
  providers,
  onValidationComplete,
}: ProviderValidationServiceProps) {
  const { toast } = useToast();
  const [validationSuites, setValidationSuites] = useState<ValidationSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Initialize validation suites
  useEffect(() => {
    const suites = providers.map(provider => createValidationSuite(provider));
    setValidationSuites(suites);
  }, [providers]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        runQuickHealthCheck();
      }, 30000); // 30 seconds
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  // Create validation suite for a provider
  const createValidationSuite = (provider: any): ValidationSuite => {
    const tests = generateValidationTests(provider);
    
    return {
      id: `suite_${provider.id}`,
      name: `${provider.name} Validation`,
      providerId: provider.id,
      providerType: provider.type,
      tests,
      overallStatus: 'pending',
      summary: {
        total: tests.length,
        passed: 0,
        failed: 0,
        warnings: 0,
        skipped: 0,
      },
      healthScore: 0,
      performanceScore: 0,
      securityScore: 0,
    };
  };

  // Generate validation tests based on provider type
  const generateValidationTests = (provider: any): ValidationTest[] => {
    const baseTests: ValidationTest[] = [
      {
        id: 'connectivity',
        name: 'Connectivity Test',
        description: 'Test basic connectivity to the provider service',
        category: 'connectivity',
        severity: 'critical',
        status: 'pending',
        duration: 0,
      },
      {
        id: 'authentication',
        name: 'Authentication Test',
        description: 'Verify authentication credentials and permissions',
        category: 'security',
        severity: 'critical',
        status: 'pending',
        duration: 0,
      },
      {
        id: 'configuration',
        name: 'Configuration Validation',
        description: 'Validate provider configuration parameters',
        category: 'configuration',
        severity: 'high',
        status: 'pending',
        duration: 0,
      },
      {
        id: 'performance',
        name: 'Performance Benchmark',
        description: 'Measure response times and throughput',
        category: 'performance',
        severity: 'medium',
        status: 'pending',
        duration: 0,
      },
      {
        id: 'security_scan',
        name: 'Security Scan',
        description: 'Scan for common security vulnerabilities',
        category: 'security',
        severity: 'high',
        status: 'pending',
        duration: 0,
      },
    ];

    // Add provider-specific tests
    switch (provider.type) {
      case 'database':
        baseTests.push(
          {
            id: 'schema_validation',
            name: 'Schema Validation',
            description: 'Validate database schema and constraints',
            category: 'configuration',
            severity: 'high',
            status: 'pending',
            duration: 0,
          },
          {
            id: 'query_performance',
            name: 'Query Performance',
            description: 'Test database query performance',
            category: 'performance',
            severity: 'medium',
            status: 'pending',
            duration: 0,
          },
          {
            id: 'backup_verification',
            name: 'Backup Verification',
            description: 'Verify backup and recovery capabilities',
            category: 'compliance',
            severity: 'high',
            status: 'pending',
            duration: 0,
          }
        );
        break;

      case 'email':
        baseTests.push(
          {
            id: 'email_delivery',
            name: 'Email Delivery Test',
            description: 'Test email sending and delivery',
            category: 'connectivity',
            severity: 'critical',
            status: 'pending',
            duration: 0,
          },
          {
            id: 'spam_check',
            name: 'Spam Filter Check',
            description: 'Check email deliverability and spam scores',
            category: 'compliance',
            severity: 'medium',
            status: 'pending',
            duration: 0,
          },
          {
            id: 'template_validation',
            name: 'Template Validation',
            description: 'Validate email templates and formatting',
            category: 'configuration',
            severity: 'medium',
            status: 'pending',
            duration: 0,
          }
        );
        break;

      case 'storage':
        baseTests.push(
          {
            id: 'file_upload',
            name: 'File Upload Test',
            description: 'Test file upload functionality',
            category: 'connectivity',
            severity: 'critical',
            status: 'pending',
            duration: 0,
          },
          {
            id: 'access_permissions',
            name: 'Access Permissions',
            description: 'Verify file access permissions and security',
            category: 'security',
            severity: 'high',
            status: 'pending',
            duration: 0,
          },
          {
            id: 'storage_limits',
            name: 'Storage Limits',
            description: 'Check storage quotas and limits',
            category: 'configuration',
            severity: 'medium',
            status: 'pending',
            duration: 0,
          }
        );
        break;

      case 'authentication':
        baseTests.push(
          {
            id: 'login_flow',
            name: 'Login Flow Test',
            description: 'Test complete authentication flow',
            category: 'connectivity',
            severity: 'critical',
            status: 'pending',
            duration: 0,
          },
          {
            id: 'session_management',
            name: 'Session Management',
            description: 'Test session creation and management',
            category: 'security',
            severity: 'high',
            status: 'pending',
            duration: 0,
          },
          {
            id: 'password_policy',
            name: 'Password Policy',
            description: 'Validate password policy enforcement',
            category: 'compliance',
            severity: 'medium',
            status: 'pending',
            duration: 0,
          }
        );
        break;
    }

    return baseTests;
  };

  // Run validation for a specific provider
  const runProviderValidation = async (providerId: string, testIds?: string[]) => {
    setIsRunning(true);
    
    try {
      const suite = validationSuites.find(s => s.providerId === providerId);
      if (!suite) return;

      // Update suite status
      updateValidationSuite(suite.id, {
        overallStatus: 'running',
        startTime: new Date(),
      });

      const testsToRun = testIds ? 
        suite.tests.filter(t => testIds.includes(t.id)) : 
        suite.tests;

      // Run tests sequentially
      for (const test of testsToRun) {
        await runSingleTest(suite.id, test.id);
      }

      // Calculate final scores and status
      const updatedSuite = validationSuites.find(s => s.id === suite.id);
      if (updatedSuite) {
        const scores = calculateScores(updatedSuite.tests);
        const summary = calculateSummary(updatedSuite.tests);
        const overallStatus = determineOverallStatus(summary);

        updateValidationSuite(suite.id, {
          overallStatus,
          endTime: new Date(),
          summary,
          healthScore: scores.health,
          performanceScore: scores.performance,
          securityScore: scores.security,
        });

        toast({
          title: 'Validation Complete',
          description: `${suite.name} validation completed with ${summary.failed} failures`,
          variant: summary.failed > 0 ? 'destructive' : 'default',
        });
      }

    } catch (error) {
      toast({
        title: 'Validation Failed',
        description: 'Unable to complete provider validation',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Run a single validation test
  const runSingleTest = async (suiteId: string, testId: string) => {
    const startTime = Date.now();
    
    // Update test status to running
    updateTestStatus(suiteId, testId, {
      status: 'running',
    });

    try {
      const suite = validationSuites.find(s => s.id === suiteId);
      const test = suite?.tests.find(t => t.id === testId);
      
      if (!suite || !test) return;

      const response = await post('/api/admin/providers/validate-test', {
        providerId: suite.providerId,
        testId: test.id,
        testConfig: {
          category: test.category,
          severity: test.severity,
        },
      });

      const duration = Date.now() - startTime;
      const result = response.data;

      updateTestStatus(suiteId, testId, {
        status: result.passed ? 'passed' : (result.warning ? 'warning' : 'failed'),
        duration,
        message: result.message,
        details: result.details,
        recommendations: result.recommendations,
        metrics: result.metrics,
      });

      // Add small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(suiteId, testId, {
        status: 'failed',
        duration,
        message: 'Test execution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Update validation suite
  const updateValidationSuite = (suiteId: string, updates: Partial<ValidationSuite>) => {
    setValidationSuites(prev => prev.map(suite => 
      suite.id === suiteId ? { ...suite, ...updates } : suite
    ));
  };

  // Update test status
  const updateTestStatus = (suiteId: string, testId: string, updates: Partial<ValidationTest>) => {
    setValidationSuites(prev => prev.map(suite => 
      suite.id === suiteId ? {
        ...suite,
        tests: suite.tests.map(test => 
          test.id === testId ? { ...test, ...updates } : test
        )
      } : suite
    ));
  };

  // Calculate scores
  const calculateScores = (tests: ValidationTest[]) => {
    const completedTests = tests.filter(t => t.status !== 'pending' && t.status !== 'running');
    if (completedTests.length === 0) return { health: 0, performance: 0, security: 0 };

    const passed = completedTests.filter(t => t.status === 'passed').length;
    const warnings = completedTests.filter(t => t.status === 'warning').length;
    
    const health = Math.round((passed / completedTests.length) * 100);
    
    const performanceTests = completedTests.filter(t => t.category === 'performance');
    const performance = performanceTests.length > 0 ? 
      Math.round((performanceTests.filter(t => t.status === 'passed').length / performanceTests.length) * 100) : 100;
    
    const securityTests = completedTests.filter(t => t.category === 'security');
    const security = securityTests.length > 0 ? 
      Math.round((securityTests.filter(t => t.status === 'passed').length / securityTests.length) * 100) : 100;

    return { health, performance, security };
  };

  // Calculate summary
  const calculateSummary = (tests: ValidationTest[]) => {
    return {
      total: tests.length,
      passed: tests.filter(t => t.status === 'passed').length,
      failed: tests.filter(t => t.status === 'failed').length,
      warnings: tests.filter(t => t.status === 'warning').length,
      skipped: tests.filter(t => t.status === 'skipped').length,
    };
  };

  // Determine overall status
  const determineOverallStatus = (summary: any): ValidationSuite['overallStatus'] => {
    if (summary.failed > 0) return 'failed';
    if (summary.warnings > 0) return 'warning';
    if (summary.passed > 0) return 'passed';
    return 'pending';
  };

  // Run quick health check for all providers
  const runQuickHealthCheck = async () => {
    for (const suite of validationSuites) {
      const connectivityTest = suite.tests.find(t => t.id === 'connectivity');
      if (connectivityTest) {
        await runSingleTest(suite.id, connectivityTest.id);
      }
    }
  };

  // Run full validation for all providers
  const runFullValidation = async () => {
    for (const suite of validationSuites) {
      await runProviderValidation(suite.providerId);
    }
    
    if (onValidationComplete) {
      onValidationComplete(validationSuites);
    }
  };

  // Get status icon and color
  const getStatusIcon = (status: ValidationTest['status']) => {
    switch (status) {
      case 'passed':
        return { icon: CheckCircle, className: 'text-green-600' };
      case 'failed':
        return { icon: XCircle, className: 'text-red-600' };
      case 'warning':
        return { icon: AlertTriangle, className: 'text-yellow-600' };
      case 'running':
        return { icon: Loader2, className: 'text-blue-600 animate-spin' };
      case 'skipped':
        return { icon: AlertCircle, className: 'text-gray-400' };
      default:
        return { icon: Clock, className: 'text-gray-400' };
    }
  };

  // Get provider type icon
  const getProviderTypeIcon = (type: string) => {
    switch (type) {
      case 'database':
        return Database;
      case 'authentication':
        return Shield;
      case 'email':
        return Mail;
      case 'storage':
        return HardDrive;
      default:
        return Settings;
    }
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.round(seconds / 60);
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Provider Validation</h3>
          <p className="text-muted-foreground">
            Comprehensive validation and monitoring of provider health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={cn("w-4 h-4 mr-2", autoRefresh && "animate-pulse")} />
            Auto Refresh: {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={runQuickHealthCheck}
            disabled={isRunning}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRunning && "animate-spin")} />
            Quick Check
          </Button>
          <Button
            onClick={runFullValidation}
            disabled={isRunning}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Run Full Validation
          </Button>
        </div>
      </div>

      {/* Validation Suites Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {validationSuites.map((suite) => {
          const ProviderIcon = getProviderTypeIcon(suite.providerType);
          const overallStatusIcon = getStatusIcon(suite.overallStatus);
          const OverallStatusIcon = overallStatusIcon.icon;

          return (
            <Card
              key={suite.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedProvider === suite.providerId && "ring-2 ring-primary",
                suite.overallStatus === 'failed' && "border-red-200 bg-red-50",
                suite.overallStatus === 'warning' && "border-yellow-200 bg-yellow-50",
                suite.overallStatus === 'passed' && "border-green-200 bg-green-50"
              )}
              onClick={() => setSelectedProvider(
                selectedProvider === suite.providerId ? null : suite.providerId
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ProviderIcon className="w-5 h-5" />
                    <CardTitle className="text-lg">{suite.name}</CardTitle>
                  </div>
                  <OverallStatusIcon className={cn("w-5 h-5", overallStatusIcon.className)} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Scores */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <p className="text-muted-foreground">Health</p>
                    <p className="font-semibold text-lg">{suite.healthScore}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Performance</p>
                    <p className="font-semibold text-lg">{suite.performanceScore}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Security</p>
                    <p className="font-semibold text-lg">{suite.securityScore}%</p>
                  </div>
                </div>

                {/* Test Summary */}
                <div className="flex justify-between text-xs">
                  <span className="text-green-600">{suite.summary.passed} Passed</span>
                  <span className="text-yellow-600">{suite.summary.warnings} Warnings</span>
                  <span className="text-red-600">{suite.summary.failed} Failed</span>
                </div>

                {/* Progress Bar */}
                <Progress 
                  value={(suite.summary.passed / suite.summary.total) * 100} 
                  className="h-2"
                />

                {/* Duration */}
                {suite.startTime && suite.endTime && (
                  <div className="text-xs text-muted-foreground text-center">
                    Duration: {formatDuration(suite.endTime.getTime() - suite.startTime.getTime())}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      runProviderValidation(suite.providerId);
                    }}
                    disabled={isRunning}
                    className="flex-1"
                  >
                    <RefreshCw className={cn("w-3 h-3 mr-1", isRunning && "animate-spin")} />
                    Validate
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed View */}
      {selectedProvider && (
        <ValidationDetails
          suite={validationSuites.find(s => s.providerId === selectedProvider)!}
          onRunTest={(testId) => runProviderValidation(selectedProvider, [testId])}
          onRunAll={() => runProviderValidation(selectedProvider)}
          isRunning={isRunning}
        />
      )}
    </div>
  );
}

// Validation Details Component
interface ValidationDetailsProps {
  suite: ValidationSuite;
  onRunTest: (testId: string) => void;
  onRunAll: () => void;
  isRunning: boolean;
}

function ValidationDetails({ suite, onRunTest, onRunAll, isRunning }: ValidationDetailsProps) {
  const getStatusIcon = (status: ValidationTest['status']) => {
    switch (status) {
      case 'passed':
        return { icon: CheckCircle, className: 'text-green-600' };
      case 'failed':
        return { icon: XCircle, className: 'text-red-600' };
      case 'warning':
        return { icon: AlertTriangle, className: 'text-yellow-600' };
      case 'running':
        return { icon: Loader2, className: 'text-blue-600 animate-spin' };
      case 'skipped':
        return { icon: AlertCircle, className: 'text-gray-400' };
      default:
        return { icon: Clock, className: 'text-gray-400' };
    }
  };

  const getCategoryIcon = (category: ValidationTest['category']) => {
    switch (category) {
      case 'connectivity':
        return Activity;
      case 'performance':
        return TrendingUp;
      case 'security':
        return Shield;
      case 'compliance':
        return CheckCircle;
      case 'configuration':
        return Settings;
      default:
        return Settings;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.round(seconds / 60);
    return `${minutes}m`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{suite.name} - Detailed Results</CardTitle>
            <CardDescription>
              Comprehensive validation results and recommendations
            </CardDescription>
          </div>
          <Button onClick={onRunAll} disabled={isRunning}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isRunning && "animate-spin")} />
            Run All Tests
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tests">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tests">Test Results</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="tests" className="space-y-4">
            <div className="space-y-3">
              {suite.tests.map((test) => {
                const statusIcon = getStatusIcon(test.status);
                const StatusIcon = statusIcon.icon;
                const CategoryIcon = getCategoryIcon(test.category);

                return (
                  <Card key={test.id} className={cn(
                    "transition-colors",
                    test.status === 'failed' && "border-red-200 bg-red-50",
                    test.status === 'warning' && "border-yellow-200 bg-yellow-50",
                    test.status === 'passed' && "border-green-200 bg-green-50"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <CategoryIcon className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{test.name}</h4>
                            <p className="text-sm text-muted-foreground">{test.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={test.severity === 'critical' ? 'destructive' : 
                                   test.severity === 'high' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {test.severity}
                          </Badge>
                          <StatusIcon className={cn("w-5 h-5", statusIcon.className)} />
                        </div>
                      </div>

                      {test.message && (
                        <Alert className="mb-3">
                          <AlertDescription className="text-sm">
                            {test.message}
                          </AlertDescription>
                        </Alert>
                      )}

                      {test.details && (
                        <div className="mb-3">
                          <h5 className="font-semibold text-sm mb-1">Details</h5>
                          <p className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono">
                            {test.details}
                          </p>
                        </div>
                      )}

                      {test.recommendations && test.recommendations.length > 0 && (
                        <div className="mb-3">
                          <h5 className="font-semibold text-sm mb-1">Recommendations</h5>
                          <ul className="list-disc list-inside text-xs space-y-1">
                            {test.recommendations.map((rec, index) => (
                              <li key={index} className="text-muted-foreground">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {test.duration > 0 && `Duration: ${formatDuration(test.duration)}`}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onRunTest(test.id)}
                          disabled={isRunning || test.status === 'running'}
                        >
                          {test.status === 'running' ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Running...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Rerun
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Health Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-3xl font-bold">{suite.healthScore}%</span>
                    {suite.healthScore >= 90 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <Progress value={suite.healthScore} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-3xl font-bold">{suite.performanceScore}%</span>
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <Progress value={suite.performanceScore} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Security</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-3xl font-bold">{suite.securityScore}%</span>
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <Progress value={suite.securityScore} className="h-2" />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suite.tests.filter(t => t.metrics).map((test) => (
                    <div key={test.id} className="border-b pb-3 last:border-b-0">
                      <h4 className="font-medium mb-2">{test.name}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {Object.entries(test.metrics || {}).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <div className="space-y-4">
              {suite.tests.filter(t => t.recommendations && t.recommendations.length > 0).map((test) => (
                <Card key={test.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {React.createElement(getCategoryIcon(test.category), { className: "w-5 h-5" })}
                      {test.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {test.recommendations!.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}

              {suite.tests.filter(t => t.recommendations && t.recommendations.length > 0).length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                    <h3 className="font-semibold mb-2">No Recommendations</h3>
                    <p className="text-muted-foreground">
                      All tests are passing without any recommendations for improvement.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}