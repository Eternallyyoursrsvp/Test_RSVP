/**
 * Provider Management Component
 * 
 * Allows administrators to view, switch, and manage providers after initial setup.
 * Provides validation, migration, and rollback capabilities for safe provider switching.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Settings,
  Database,
  Shield,
  Mail,
  HardDrive,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  Upload,
  Loader2,
  Info,
  ExternalLink,
  Eye,
  EyeOff,
  Zap,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { post, get } from '@/lib/api-utils';

// Types
interface ProviderInfo {
  id: string;
  name: string;
  type: 'database' | 'authentication' | 'email' | 'storage' | 'all-in-one';
  category: string;
  status: 'active' | 'inactive' | 'error' | 'migrating';
  isDefault: boolean;
  lastChecked: string;
  configuration: Record<string, any>;
  capabilities: string[];
  version?: string;
  healthScore: number;
  performance: {
    responseTime: number;
    uptime: number;
    errorRate: number;
  };
  dependencies: string[];
}

interface MigrationPlan {
  id: string;
  fromProvider: string;
  toProvider: string;
  estimatedTime: number;
  dataSize: number;
  steps: Array<{
    id: string;
    name: string;
    description: string;
    estimatedTime: number;
    dependencies: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  backupRequired: boolean;
  rollbackSupported: boolean;
  warnings: string[];
  requirements: string[];
}

interface ValidationResult {
  isValid: boolean;
  providerId: string;
  checks: Array<{
    name: string;
    status: 'passed' | 'failed' | 'warning';
    message: string;
    details?: string;
  }>;
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
  compatibility: {
    isCompatible: boolean;
    issues: string[];
    recommendations: string[];
  };
}

export function ProviderManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});

  // Fetch current providers
  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ['admin', 'providers'],
    queryFn: async (): Promise<ProviderInfo[]> => {
      const response = await get('/api/admin/providers');
      return response.data;
    },
    refetchInterval: 30000, // 30 seconds
  });

  // Fetch available provider types for switching
  const { data: availableProviders } = useQuery({
    queryKey: ['admin', 'providers', 'available'],
    queryFn: async () => {
      const response = await get('/api/admin/providers/available');
      return response.data;
    },
  });

  // Provider validation mutation
  const validateProviderMutation = useMutation({
    mutationFn: async ({ providerId, config }: { providerId: string; config?: any }) => {
      const response = await post('/api/admin/providers/validate', {
        providerId,
        configuration: config,
      });
      return response.data;
    },
    onSuccess: (result, { providerId }) => {
      setValidationResults(prev => ({
        ...prev,
        [providerId]: result,
      }));
      toast({
        title: 'Validation Complete',
        description: `Provider ${providerId} validation ${result.isValid ? 'passed' : 'failed'}`,
        variant: result.isValid ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      toast({
        title: 'Validation Failed',
        description: 'Unable to validate provider configuration',
        variant: 'destructive',
      });
    },
  });

  // Provider switching mutation
  const switchProviderMutation = useMutation({
    mutationFn: async ({ fromProvider, toProvider, config }: { 
      fromProvider: string; 
      toProvider: string; 
      config: any; 
    }) => {
      const response = await post('/api/admin/providers/switch', {
        fromProvider,
        toProvider,
        configuration: config,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'providers'] });
      toast({
        title: 'Provider Switch Initiated',
        description: 'Provider switching process has started',
      });
    },
    onError: (error) => {
      toast({
        title: 'Switch Failed',
        description: 'Unable to initiate provider switch',
        variant: 'destructive',
      });
    },
  });

  // Get migration plan
  const getMigrationPlan = async (fromProvider: string, toProvider: string): Promise<MigrationPlan> => {
    const response = await post('/api/admin/providers/migration-plan', {
      fromProvider,
      toProvider,
    });
    return response.data;
  };

  // Validate all providers
  const validateAllProviders = async () => {
    if (!providers) return;

    for (const provider of providers) {
      validateProviderMutation.mutate({
        providerId: provider.id,
        config: provider.configuration,
      });
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
      case 'all-in-one':
        return Settings;
      default:
        return Settings;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-gray-600 bg-gray-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'migrating':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Format performance score
  const formatPerformanceScore = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'text-green-600' };
    if (score >= 80) return { label: 'Good', color: 'text-blue-600' };
    if (score >= 70) return { label: 'Fair', color: 'text-yellow-600' };
    return { label: 'Poor', color: 'text-red-600' };
  };

  // Mask sensitive data
  const maskSensitiveValue = (key: string, value: any) => {
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential'];
    const isSensitive = sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
    
    if (isSensitive && !showSensitiveData) {
      return '••••••••';
    }
    
    return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  };

  if (providersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Provider Management</h2>
          <p className="text-muted-foreground">
            Manage and switch between different service providers
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={validateAllProviders}
            disabled={validateProviderMutation.isPending}
          >
            {validateProviderMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Validate All
          </Button>
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'providers'] })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Providers Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {providers?.map((provider) => {
          const Icon = getProviderTypeIcon(provider.type);
          const performance = formatPerformanceScore(provider.healthScore);
          const validation = validationResults[provider.id];

          return (
            <Card key={provider.id} className={cn(
              "cursor-pointer transition-all",
              selectedProvider === provider.id && "ring-2 ring-primary",
              provider.status === 'error' && "border-red-200 bg-red-50"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {provider.isDefault && (
                      <Badge variant="default" className="text-xs">Default</Badge>
                    )}
                    <Badge className={cn("text-xs", getStatusColor(provider.status))}>
                      {provider.status}
                    </Badge>
                  </div>
                </div>
                <CardDescription>{provider.category}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Health Score */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Health Score</span>
                    <span className={performance.color}>{performance.label}</span>
                  </div>
                  <Progress value={provider.healthScore} className="h-2" />
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Response</span>
                    <p className="font-medium">{provider.performance.responseTime}ms</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Uptime</span>
                    <p className="font-medium">{provider.performance.uptime}%</p>
                  </div>
                </div>

                {/* Validation Status */}
                {validation && (
                  <Alert className={cn(
                    "py-2",
                    validation.isValid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  )}>
                    {validation.isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className="text-xs">
                      Validation {validation.isValid ? 'passed' : 'failed'}
                      {!validation.isValid && validation.checks.length > 0 && (
                        <span className="block mt-1">
                          {validation.checks.filter(c => c.status === 'failed').length} issues found
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedProvider(
                      selectedProvider === provider.id ? null : provider.id
                    )}
                    className="flex-1"
                  >
                    {selectedProvider === provider.id ? (
                      <>
                        <EyeOff className="w-3 h-3 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3 mr-1" />
                        Details
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => validateProviderMutation.mutate({
                      providerId: provider.id,
                      config: provider.configuration,
                    })}
                    disabled={validateProviderMutation.isPending}
                  >
                    <CheckCircle className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Provider Details */}
      {selectedProvider && (
        <ProviderDetails
          provider={providers?.find(p => p.id === selectedProvider)!}
          availableProviders={availableProviders}
          validationResult={validationResults[selectedProvider]}
          showSensitive={showSensitiveData}
          onShowSensitiveToggle={() => setShowSensitiveData(!showSensitiveData)}
          onValidate={(config) => validateProviderMutation.mutate({
            providerId: selectedProvider,
            config,
          })}
          onSwitch={(toProvider, config) => {
            // Implementation for provider switching
            console.log('Switch from', selectedProvider, 'to', toProvider, 'with config', config);
          }}
          getMigrationPlan={getMigrationPlan}
        />
      )}

      {/* Migration Status */}
      {migrationInProgress && (
        <MigrationStatus
          onComplete={() => {
            setMigrationInProgress(false);
            queryClient.invalidateQueries({ queryKey: ['admin', 'providers'] });
          }}
        />
      )}
    </div>
  );
}

// Provider Details Component
interface ProviderDetailsProps {
  provider: ProviderInfo;
  availableProviders: any[];
  validationResult?: ValidationResult;
  showSensitive: boolean;
  onShowSensitiveToggle: () => void;
  onValidate: (config: any) => void;
  onSwitch: (toProvider: string, config: any) => void;
  getMigrationPlan: (from: string, to: string) => Promise<MigrationPlan>;
}

function ProviderDetails({
  provider,
  availableProviders,
  validationResult,
  showSensitive,
  onShowSensitiveToggle,
  onValidate,
  onSwitch,
  getMigrationPlan,
}: ProviderDetailsProps) {
  const [migrationPlan, setMigrationPlan] = useState<MigrationPlan | null>(null);
  const [selectedTargetProvider, setSelectedTargetProvider] = useState<string>('');

  // Mask sensitive data
  const maskSensitiveValue = (key: string, value: any) => {
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential'];
    const isSensitive = sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
    
    if (isSensitive && !showSensitive) {
      return '••••••••';
    }
    
    return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          {provider.name} Details
        </CardTitle>
        <CardDescription>
          Detailed configuration and management options
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="switch">Switch Provider</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Basic Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span>{provider.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span>{provider.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span>{provider.version || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Checked:</span>
                    <span>{new Date(provider.lastChecked).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Performance</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Response Time:</span>
                    <span>{provider.performance.responseTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uptime:</span>
                    <span>{provider.performance.uptime}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Error Rate:</span>
                    <span>{provider.performance.errorRate}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Capabilities</h4>
              <div className="flex flex-wrap gap-1">
                {provider.capabilities.map((capability) => (
                  <Badge key={capability} variant="outline" className="text-xs">
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>

            {provider.dependencies.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Dependencies</h4>
                <div className="flex flex-wrap gap-1">
                  {provider.dependencies.map((dependency) => (
                    <Badge key={dependency} variant="secondary" className="text-xs">
                      {dependency}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="configuration" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Configuration Data</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={onShowSensitiveToggle}
              >
                {showSensitive ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Sensitive
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show Sensitive
                  </>
                )}
              </Button>
            </div>
            <ScrollArea className="h-64 w-full">
              <div className="space-y-2">
                {Object.entries(provider.configuration).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-2 bg-muted rounded">
                    <span className="font-medium text-sm">{key}:</span>
                    <span className="text-sm font-mono">
                      {maskSensitiveValue(key, value)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            {validationResult ? (
              <div className="space-y-4">
                <Alert className={cn(
                  validationResult.isValid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                )}>
                  {validationResult.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription>
                    Provider validation {validationResult.isValid ? 'passed' : 'failed'}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-semibold">Validation Checks</h4>
                  {validationResult.checks.map((check, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {check.status === 'passed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {check.status === 'failed' && <XCircle className="w-4 h-4 text-red-600" />}
                        {check.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                        <span className="text-sm font-medium">{check.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{check.message}</span>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2">Performance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Response Time:</span>
                        <span>{validationResult.performance.responseTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Throughput:</span>
                        <span>{validationResult.performance.throughput} req/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Error Rate:</span>
                        <span>{validationResult.performance.errorRate}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Compatibility</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        {validationResult.compatibility.isCompatible ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span>
                          {validationResult.compatibility.isCompatible ? 'Compatible' : 'Incompatible'}
                        </span>
                      </div>
                      {validationResult.compatibility.issues.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Issues:</span>
                          <ul className="list-disc list-inside ml-2">
                            {validationResult.compatibility.issues.map((issue, index) => (
                              <li key={index} className="text-xs">{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No validation results available</p>
                <Button onClick={() => onValidate(provider.configuration)}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Run Validation
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="switch" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Switching providers will migrate your data and configuration. This process may take several minutes
                and requires careful planning to avoid data loss.
              </AlertDescription>
            </Alert>

            <div>
              <h4 className="font-semibold mb-2">Available Providers</h4>
              <div className="grid gap-2">
                {availableProviders?.filter(p => p.type === provider.type && p.id !== provider.id).map((available) => (
                  <div
                    key={available.id}
                    className={cn(
                      "p-3 border rounded cursor-pointer transition-colors",
                      selectedTargetProvider === available.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => setSelectedTargetProvider(available.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{available.name}</p>
                        <p className="text-sm text-muted-foreground">{available.description}</p>
                      </div>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedTargetProvider && (
              <div className="space-y-4">
                <Button
                  onClick={async () => {
                    const plan = await getMigrationPlan(provider.id, selectedTargetProvider);
                    setMigrationPlan(plan);
                  }}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Migration Plan
                </Button>

                {migrationPlan && (
                  <MigrationPlanDisplay
                    plan={migrationPlan}
                    onExecute={() => {
                      // Implementation for executing migration
                      console.log('Execute migration plan', migrationPlan);
                    }}
                  />
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Migration Plan Display Component
interface MigrationPlanDisplayProps {
  plan: MigrationPlan;
  onExecute: () => void;
}

function MigrationPlanDisplay({ plan, onExecute }: MigrationPlanDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Migration Plan</CardTitle>
        <CardDescription>
          {plan.fromProvider} → {plan.toProvider}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center">
            <Clock className="w-6 h-6 mx-auto mb-1" />
            <p className="text-sm text-muted-foreground">Estimated Time</p>
            <p className="font-semibold">{Math.round(plan.estimatedTime / 60)} minutes</p>
          </div>
          <div className="text-center">
            <Database className="w-6 h-6 mx-auto mb-1" />
            <p className="text-sm text-muted-foreground">Data Size</p>
            <p className="font-semibold">{Math.round(plan.dataSize / 1024 / 1024)} MB</p>
          </div>
          <div className="text-center">
            <ArrowLeft className="w-6 h-6 mx-auto mb-1" />
            <p className="text-sm text-muted-foreground">Rollback</p>
            <p className="font-semibold">{plan.rollbackSupported ? 'Supported' : 'Not Supported'}</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Migration Steps</h4>
          <div className="space-y-2">
            {plan.steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3 p-2 border rounded">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{step.name}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{Math.round(step.estimatedTime / 60)}m</p>
                  <Badge
                    variant={step.riskLevel === 'high' ? 'destructive' : 
                           step.riskLevel === 'medium' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {step.riskLevel}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {plan.warnings.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              <p className="font-medium mb-1">Warnings:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                {plan.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button onClick={onExecute} className="flex-1">
            <ArrowRight className="w-4 h-4 mr-2" />
            Execute Migration
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Migration Status Component
interface MigrationStatusProps {
  onComplete: () => void;
}

function MigrationStatus({ onComplete }: MigrationStatusProps) {
  const [migrationProgress, setMigrationProgress] = useState({
    currentStep: 'Initializing migration...',
    progress: 0,
    stepProgress: 0,
    eta: 300, // seconds
  });

  useEffect(() => {
    // Simulate migration progress
    const interval = setInterval(() => {
      setMigrationProgress(prev => {
        if (prev.progress >= 100) {
          clearInterval(interval);
          onComplete();
          return prev;
        }
        return {
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 5, 100),
          stepProgress: Math.min(prev.stepProgress + Math.random() * 10, 100),
          eta: Math.max(prev.eta - 5, 0),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Loader2 className="w-5 h-5 animate-spin" />
          Migration in Progress
        </CardTitle>
        <CardDescription className="text-blue-700">
          Please do not close this window during the migration process
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Overall Progress</span>
            <span>{Math.round(migrationProgress.progress)}%</span>
          </div>
          <Progress value={migrationProgress.progress} className="w-full" />
        </div>

        <div>
          <p className="text-sm font-medium mb-2">{migrationProgress.currentStep}</p>
          <Progress value={migrationProgress.stepProgress} className="w-full h-2" />
        </div>

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Estimated time remaining: {Math.round(migrationProgress.eta / 60)} minutes</span>
          <span>Do not refresh or close this page</span>
        </div>
      </CardContent>
    </Card>
  );
}