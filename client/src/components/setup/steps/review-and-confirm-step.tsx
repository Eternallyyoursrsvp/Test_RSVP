/**
 * Review and Confirm Step
 * 
 * Final step before starting the automated setup process.
 * Shows a summary of all configuration and allows user to review
 * and confirm before proceeding with the setup.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Clock, 
  Server, 
  Shield, 
  Mail, 
  HardDrive,
  Settings,
  Play,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepProps, ProviderType } from '../provider-setup-wizard';
import { post } from '@/lib/api-utils';
import { useToast } from '@/hooks/use-toast';

interface ReviewAndConfirmStepProps extends WizardStepProps {
  providerType?: ProviderType;
}

interface ConfigurationSummary {
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{
    label: string;
    value: string;
    sensitive?: boolean;
    warning?: string;
  }>;
}

interface PreflightCheck {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'warning' | 'failed';
  message?: string;
  critical: boolean;
}

export function ReviewAndConfirmStep({
  data,
  providerType,
}: ReviewAndConfirmStepProps) {
  const { toast } = useToast();
  const [preflightChecks, setPreflightChecks] = useState<PreflightCheck[]>([]);
  const [isRunningPreflight, setIsRunningPreflight] = useState(false);
  const [preflightCompleted, setPreflightCompleted] = useState(false);
  const [estimatedSetupTime, setEstimatedSetupTime] = useState(0);

  // Initialize preflight checks
  useEffect(() => {
    const initializePreflightChecks = () => {
      const checks: PreflightCheck[] = [
        {
          id: 'config-validation',
          name: 'Configuration Validation',
          description: 'Validate all configuration parameters',
          status: 'pending',
          critical: true,
        },
        {
          id: 'connectivity-test',
          name: 'Connectivity Test',
          description: 'Test connections to external services',
          status: 'pending',
          critical: true,
        },
        {
          id: 'permissions-check',
          name: 'Permissions Check',
          description: 'Verify system permissions and access rights',
          status: 'pending',
          critical: true,
        },
        {
          id: 'dependency-check',
          name: 'Dependency Check',
          description: 'Check for required system dependencies',
          status: 'pending',
          critical: false,
        },
        {
          id: 'disk-space-check',
          name: 'Disk Space Check',
          description: 'Verify sufficient disk space for installation',
          status: 'pending',
          critical: false,
        },
        {
          id: 'port-availability',
          name: 'Port Availability',
          description: 'Check if required ports are available',
          status: 'pending',
          critical: false,
        },
      ];

      // Add provider-specific checks
      if (providerType?.includes('db') || ['postgresql', 'mysql', 'sqlite'].includes(providerType || '')) {
        checks.push({
          id: 'database-schema',
          name: 'Database Schema Check',
          description: 'Verify database schema requirements',
          status: 'pending',
          critical: true,
        });
      }

      if (providerType?.includes('email')) {
        checks.push({
          id: 'email-deliverability',
          name: 'Email Deliverability Check',
          description: 'Test email configuration and deliverability',
          status: 'pending',
          critical: false,
        });
      }

      if (providerType?.includes('storage')) {
        checks.push({
          id: 'storage-permissions',
          name: 'Storage Permissions Check',
          description: 'Verify storage access and write permissions',
          status: 'pending',
          critical: true,
        });
      }

      setPreflightChecks(checks);
    };

    initializePreflightChecks();
  }, [providerType]);

  // Run preflight checks
  const runPreflightChecks = async () => {
    setIsRunningPreflight(true);
    setPreflightCompleted(false);

    try {
      // Reset all checks to pending
      setPreflightChecks(prev => 
        prev.map(check => ({ ...check, status: 'pending', message: undefined }))
      );

      // Run checks sequentially with delay for better UX
      for (let i = 0; i < preflightChecks.length; i++) {
        const check = preflightChecks[i];
        
        // Update check status to running
        setPreflightChecks(prev => 
          prev.map(c => c.id === check.id ? { ...c, status: 'running' } : c)
        );

        try {
          // Call backend to run specific preflight check
          const response = await post('/api/providers/preflight-check', {
            providerType,
            checkId: check.id,
            configuration: data,
          });

          const result = response.data;
          
          setPreflightChecks(prev => 
            prev.map(c => c.id === check.id ? {
              ...c,
              status: result.success ? 'passed' : (result.critical ? 'failed' : 'warning'),
              message: result.message,
            } : c)
          );

          // Add small delay for better UX
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`Preflight check ${check.id} failed:`, error);
          setPreflightChecks(prev => 
            prev.map(c => c.id === check.id ? {
              ...c,
              status: check.critical ? 'failed' : 'warning',
              message: 'Check failed to execute',
            } : c)
          );
        }
      }

      // Get estimated setup time
      try {
        const timeResponse = await post('/api/providers/estimate-setup-time', {
          providerType,
          configuration: data,
        });
        setEstimatedSetupTime(timeResponse.data.estimatedTime || 300); // Default 5 minutes
      } catch (error) {
        console.error('Failed to get setup time estimate:', error);
        setEstimatedSetupTime(300); // Default 5 minutes
      }

      setPreflightCompleted(true);
      toast({
        title: 'Preflight Checks Complete',
        description: 'All preflight checks have been completed.',
      });

    } catch (error) {
      console.error('Preflight checks failed:', error);
      toast({
        title: 'Preflight Checks Failed',
        description: 'Some preflight checks could not be completed.',
        variant: 'destructive',
      });
    } finally {
      setIsRunningPreflight(false);
    }
  };

  // Generate configuration summary
  const generateConfigurationSummary = (): ConfigurationSummary[] => {
    const summaries: ConfigurationSummary[] = [];

    // Provider type summary
    summaries.push({
      category: 'Provider Information',
      icon: Server,
      items: [
        {
          label: 'Provider Type',
          value: providerType || 'Unknown',
        },
        {
          label: 'Configuration Mode',
          value: 'Automated Setup',
        },
      ],
    });

    // Database configuration summary
    if (data['database-config']) {
      const dbConfig = data['database-config'] as Record<string, any>;
      const items = [];

      if (dbConfig.host) {
        items.push({ label: 'Host', value: dbConfig.host });
      }
      if (dbConfig.port) {
        items.push({ label: 'Port', value: String(dbConfig.port) });
      }
      if (dbConfig.database) {
        items.push({ label: 'Database', value: dbConfig.database });
      }
      if (dbConfig.username) {
        items.push({ label: 'Username', value: dbConfig.username });
      }
      if (dbConfig.password) {
        items.push({ label: 'Password', value: '••••••••', sensitive: true });
      }
      if (dbConfig.ssl !== undefined) {
        items.push({ 
          label: 'SSL Enabled', 
          value: dbConfig.ssl ? 'Yes' : 'No',
          warning: !dbConfig.ssl ? 'Consider enabling SSL for production' : undefined,
        });
      }
      if (dbConfig.supabaseUrl) {
        items.push({ label: 'Supabase URL', value: dbConfig.supabaseUrl });
      }
      if (dbConfig.supabaseKey) {
        items.push({ label: 'Supabase Key', value: '••••••••', sensitive: true });
      }
      if (dbConfig.url) {
        items.push({ label: 'PocketBase URL', value: dbConfig.url });
      }

      if (items.length > 0) {
        summaries.push({
          category: 'Database Configuration',
          icon: Server,
          items,
        });
      }
    }

    // Authentication configuration summary
    if (data['auth-config']) {
      const authConfig = data['auth-config'] as Record<string, any>;
      const items = [];

      if (authConfig.passwordMinLength) {
        items.push({ label: 'Min Password Length', value: String(authConfig.passwordMinLength) });
      }
      if (authConfig.maxLoginAttempts) {
        items.push({ label: 'Max Login Attempts', value: String(authConfig.maxLoginAttempts) });
      }
      if (authConfig.sessionTimeout) {
        items.push({ label: 'Session Timeout', value: `${authConfig.sessionTimeout}s` });
      }
      if (authConfig.jwtSecret) {
        items.push({ label: 'JWT Secret', value: '••••••••', sensitive: true });
      }
      if (authConfig.enableTwoFactor !== undefined) {
        items.push({ label: '2FA Enabled', value: authConfig.enableTwoFactor ? 'Yes' : 'No' });
      }

      if (items.length > 0) {
        summaries.push({
          category: 'Authentication Configuration',
          icon: Shield,
          items,
        });
      }
    }

    // Email configuration summary
    if (data['email-config']) {
      const emailConfig = data['email-config'] as Record<string, any>;
      const items = [];

      if (emailConfig.host) {
        items.push({ label: 'SMTP Host', value: emailConfig.host });
      }
      if (emailConfig.port) {
        items.push({ label: 'SMTP Port', value: String(emailConfig.port) });
      }
      if (emailConfig.fromEmail) {
        items.push({ label: 'From Email', value: emailConfig.fromEmail });
      }
      if (emailConfig.fromName) {
        items.push({ label: 'From Name', value: emailConfig.fromName });
      }
      if (emailConfig.apiKey) {
        items.push({ label: 'API Key', value: '••••••••', sensitive: true });
      }
      if (emailConfig.secure !== undefined) {
        items.push({ 
          label: 'Secure Connection', 
          value: emailConfig.secure ? 'Yes' : 'No',
          warning: !emailConfig.secure ? 'Consider enabling secure connection' : undefined,
        });
      }

      if (items.length > 0) {
        summaries.push({
          category: 'Email Configuration',
          icon: Mail,
          items,
        });
      }
    }

    // Storage configuration summary
    if (data['storage-config']) {
      const storageConfig = data['storage-config'] as Record<string, any>;
      const items = [];

      if (storageConfig.storageDirectory) {
        items.push({ label: 'Storage Directory', value: storageConfig.storageDirectory });
      }
      if (storageConfig.bucketName) {
        items.push({ label: 'Bucket Name', value: storageConfig.bucketName });
      }
      if (storageConfig.region) {
        items.push({ label: 'Region', value: storageConfig.region });
      }
      if (storageConfig.maxFileSize) {
        items.push({ 
          label: 'Max File Size', 
          value: `${Math.round(storageConfig.maxFileSize / 1024 / 1024)}MB` 
        });
      }
      if (storageConfig.accessKeyId) {
        items.push({ label: 'Access Key ID', value: '••••••••', sensitive: true });
      }
      if (storageConfig.secretAccessKey) {
        items.push({ label: 'Secret Access Key', value: '••••••••', sensitive: true });
      }

      if (items.length > 0) {
        summaries.push({
          category: 'Storage Configuration',
          icon: HardDrive,
          items,
        });
      }
    }

    return summaries;
  };

  const configurationSummary = generateConfigurationSummary();

  // Check if preflight checks can proceed
  const canRunPreflight = Object.keys(data).length > 1; // More than just provider-type

  // Check preflight status
  const criticalChecksFailed = preflightChecks.some(check => check.critical && check.status === 'failed');
  const allChecksCompleted = preflightChecks.every(check => check.status !== 'pending' && check.status !== 'running');
  const hasWarnings = preflightChecks.some(check => check.status === 'warning');

  // Format estimated time
  const formatEstimatedTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `${minutes} minutes`;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration Summary
          </CardTitle>
          <CardDescription>
            Review your provider configuration before starting the automated setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed Configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Provider Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline">{providerType}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span>{providerType?.includes('all-in-one') ? 'All-in-One' : 'Specialized'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Setup Mode:</span>
                      <span>Automated</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Setup Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated Time:</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {estimatedSetupTime > 0 ? formatEstimatedTime(estimatedSetupTime) : 'Calculating...'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Configuration Steps:</span>
                      <span>{Object.keys(data).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Backup Created:</span>
                      <span>Yes</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-4">
              {configurationSummary.map((summary, index) => {
                const Icon = summary.icon;
                return (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="w-5 h-5" />
                        {summary.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {summary.items.map((item, itemIndex) => (
                          <div key={itemIndex}>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">{item.label}:</span>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  item.sensitive && "font-mono text-sm"
                                )}>
                                  {item.value}
                                </span>
                                {item.sensitive && (
                                  <Badge variant="secondary" className="text-xs">
                                    Encrypted
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {item.warning && (
                              <Alert className="mt-2 border-amber-200 bg-amber-50">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-amber-700">
                                  {item.warning}
                                </AlertDescription>
                              </Alert>
                            )}
                            {itemIndex < summary.items.length - 1 && <Separator className="my-2" />}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preflight Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Preflight Checks
          </CardTitle>
          <CardDescription>
            Verify system requirements and configuration before starting setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canRunPreflight ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Complete the configuration steps to run preflight checks.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Run preflight checks to verify your configuration and system readiness.
                  </p>
                </div>
                <Button
                  onClick={runPreflightChecks}
                  disabled={isRunningPreflight}
                  variant={preflightCompleted ? "outline" : "default"}
                >
                  {isRunningPreflight ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running Checks...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      {preflightCompleted ? 'Rerun Checks' : 'Run Preflight Checks'}
                    </>
                  )}
                </Button>
              </div>

              {preflightChecks.length > 0 && (
                <div className="space-y-2">
                  {preflightChecks.map((check) => (
                    <div
                      key={check.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        check.status === 'passed' && "border-green-200 bg-green-50",
                        check.status === 'warning' && "border-amber-200 bg-amber-50",
                        check.status === 'failed' && "border-red-200 bg-red-50",
                        check.status === 'running' && "border-blue-200 bg-blue-50",
                        check.status === 'pending' && "border-gray-200 bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6">
                          {check.status === 'running' && (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          )}
                          {check.status === 'passed' && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                          {check.status === 'warning' && (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          )}
                          {check.status === 'failed' && (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                          {check.status === 'pending' && (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{check.name}</p>
                          <p className="text-sm text-muted-foreground">{check.description}</p>
                          {check.message && (
                            <p className={cn(
                              "text-sm mt-1",
                              check.status === 'passed' && "text-green-700",
                              check.status === 'warning' && "text-amber-700",
                              check.status === 'failed' && "text-red-700"
                            )}>
                              {check.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {check.critical && (
                          <Badge variant={check.status === 'failed' ? 'destructive' : 'secondary'}>
                            Critical
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Preflight Results Summary */}
              {preflightCompleted && (
                <div className="mt-4">
                  {criticalChecksFailed ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Critical preflight checks failed. Please resolve the issues before proceeding with setup.
                      </AlertDescription>
                    </Alert>
                  ) : hasWarnings ? (
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700">
                        Some preflight checks have warnings. Setup can continue, but consider addressing these issues.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700">
                        All preflight checks passed successfully. Ready to start setup!
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Setup Summary */}
      {preflightCompleted && !criticalChecksFailed && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-primary">Ready to Start Setup</CardTitle>
            <CardDescription>
              All preflight checks have passed. Click "Start Setup" to begin the automated configuration process.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>Estimated Time: {formatEstimatedTime(estimatedSetupTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Automated Process</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>Backup Created</span>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                The setup process will configure your provider automatically. You can monitor progress in the next step.
                Setup can be cancelled at any time if needed.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}