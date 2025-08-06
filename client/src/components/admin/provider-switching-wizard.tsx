/**
 * Provider Switching Wizard
 * 
 * Step-by-step wizard for safely switching between providers with
 * validation, backup, migration, and rollback capabilities.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Database,
  Shield,
  Mail,
  HardDrive,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Clock,
  Info,
  Loader2,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { post } from '@/lib/api-utils';

// Import reusable step components from setup wizard
import { DatabaseConfigurationStep } from '../setup/steps/database-configuration-step';
import { AuthenticationConfigurationStep } from '../setup/steps/authentication-configuration-step';
import { EmailConfigurationStep } from '../setup/steps/email-configuration-step';
import { StorageConfigurationStep } from '../setup/steps/storage-configuration-step';

interface SwitchingWizardProps {
  fromProvider: {
    id: string;
    name: string;
    type: string;
    configuration: Record<string, any>;
  };
  toProvider: {
    id: string;
    name: string;
    type: string;
  };
  onComplete: (result: SwitchingResult) => void;
  onCancel: () => void;
}

interface SwitchingResult {
  success: boolean;
  fromProvider: string;
  toProvider: string;
  backupId?: string;
  rollbackAvailable: boolean;
  duration: number;
  errors: string[];
  warnings: string[];
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  canSkip: boolean;
}

interface ValidationResult {
  isValid: boolean;
  checks: Array<{
    name: string;
    status: 'passed' | 'failed' | 'warning';
    message: string;
  }>;
  compatibility: {
    isCompatible: boolean;
    issues: string[];
    migrationRequired: boolean;
  };
}

interface BackupResult {
  success: boolean;
  backupId: string;
  size: number;
  location: string;
  checksum: string;
}

interface MigrationProgress {
  stage: string;
  progress: number;
  currentOperation: string;
  estimatedTimeRemaining: number;
  warnings: string[];
  errors: string[];
}

export function ProviderSwitchingWizard({
  fromProvider,
  toProvider,
  onComplete,
  onCancel,
}: SwitchingWizardProps) {
  const { toast } = useToast();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  const steps: WizardStep[] = [
    {
      id: 'pre-validation',
      title: 'Pre-Validation',
      description: 'Validate current provider and prepare for switching',
      isCompleted: false,
      isActive: true,
      canSkip: false,
    },
    {
      id: 'new-configuration',
      title: 'New Configuration',
      description: 'Configure the new provider settings',
      isCompleted: false,
      isActive: false,
      canSkip: false,
    },
    {
      id: 'compatibility-check',
      title: 'Compatibility Check',
      description: 'Verify compatibility and migration requirements',
      isCompleted: false,
      isActive: false,
      canSkip: false,
    },
    {
      id: 'backup-creation',
      title: 'Backup Creation',
      description: 'Create backup of current configuration and data',
      isCompleted: false,
      isActive: false,
      canSkip: false,
    },
    {
      id: 'migration-execution',
      title: 'Migration Execution',
      description: 'Execute the provider switching process',
      isCompleted: false,
      isActive: false,
      canSkip: false,
    },
    {
      id: 'verification',
      title: 'Verification',
      description: 'Verify the new provider is working correctly',
      isCompleted: false,
      isActive: false,
      canSkip: false,
    },
  ];

  const [wizardSteps, setWizardSteps] = useState(steps);

  // Update step status
  const updateStepStatus = (stepId: string, updates: Partial<WizardStep>) => {
    setWizardSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  // Go to next step
  const goToNextStep = () => {
    if (currentStepIndex < wizardSteps.length - 1) {
      // Mark current step as completed
      updateStepStatus(wizardSteps[currentStepIndex].id, {
        isCompleted: true,
        isActive: false,
      });

      // Activate next step
      const nextIndex = currentStepIndex + 1;
      updateStepStatus(wizardSteps[nextIndex].id, {
        isActive: true,
      });

      setCurrentStepIndex(nextIndex);
    }
  };

  // Go to previous step
  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      // Deactivate current step
      updateStepStatus(wizardSteps[currentStepIndex].id, {
        isActive: false,
      });

      // Activate previous step
      const prevIndex = currentStepIndex - 1;
      updateStepStatus(wizardSteps[prevIndex].id, {
        isCompleted: false,
        isActive: true,
      });

      setCurrentStepIndex(prevIndex);
    }
  };

  // Run pre-validation
  const runPreValidation = async () => {
    setIsProcessing(true);
    try {
      const response = await post('/api/admin/providers/pre-validation', {
        fromProvider: fromProvider.id,
        toProvider: toProvider.id,
      });

      setValidationResult(response.data);
      
      if (response.data.isValid) {
        toast({
          title: 'Pre-validation Passed',
          description: 'Provider switching can proceed safely',
        });
        goToNextStep();
      } else {
        toast({
          title: 'Pre-validation Failed',
          description: 'Issues found that must be resolved before switching',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: 'Unable to validate provider switching compatibility',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Validate new configuration
  const validateNewConfiguration = async () => {
    setIsProcessing(true);
    try {
      const response = await post('/api/admin/providers/validate-configuration', {
        providerType: toProvider.type,
        configuration: stepData[toProvider.type],
      });

      if (response.data.isValid) {
        toast({
          title: 'Configuration Valid',
          description: 'New provider configuration is valid',
        });
        goToNextStep();
      } else {
        toast({
          title: 'Configuration Invalid',
          description: 'Please fix the configuration issues',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Configuration Error',
        description: 'Unable to validate new configuration',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Run compatibility check
  const runCompatibilityCheck = async () => {
    setIsProcessing(true);
    try {
      const response = await post('/api/admin/providers/compatibility-check', {
        fromProvider: fromProvider.id,
        toProvider: toProvider.id,
        newConfiguration: stepData[toProvider.type],
      });

      setValidationResult(response.data);
      
      if (response.data.compatibility.isCompatible) {
        toast({
          title: 'Compatibility Check Passed',
          description: 'Providers are compatible for switching',
        });
        goToNextStep();
      } else {
        toast({
          title: 'Compatibility Issues Found',
          description: `${response.data.compatibility.issues.length} compatibility issues detected`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Compatibility Check Failed',
        description: 'Unable to verify provider compatibility',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Create backup
  const createBackup = async () => {
    setIsProcessing(true);
    try {
      const response = await post('/api/admin/providers/create-backup', {
        providerId: fromProvider.id,
        includeData: true,
        includeConfiguration: true,
      });

      setBackupResult(response.data);
      
      toast({
        title: 'Backup Created',
        description: `Backup created successfully (${Math.round(response.data.size / 1024 / 1024)}MB)`,
      });
      goToNextStep();
    } catch (error) {
      toast({
        title: 'Backup Failed',
        description: 'Unable to create backup - switching cancelled',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute migration
  const executeMigration = async () => {
    setIsProcessing(true);
    setStartTime(Date.now());
    
    try {
      const response = await post('/api/admin/providers/execute-migration', {
        fromProvider: fromProvider.id,
        toProvider: toProvider.id,
        newConfiguration: stepData[toProvider.type],
        backupId: backupResult?.backupId,
      });

      // Start polling for migration progress
      const migrationId = response.data.migrationId;
      pollMigrationProgress(migrationId);
      
    } catch (error) {
      toast({
        title: 'Migration Failed',
        description: 'Unable to start migration process',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  // Poll migration progress
  const pollMigrationProgress = async (migrationId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await post('/api/admin/providers/migration-progress', {
          migrationId,
        });

        const progress = response.data;
        setMigrationProgress(progress);

        if (progress.progress >= 100) {
          clearInterval(pollInterval);
          setIsProcessing(false);
          
          if (progress.errors.length === 0) {
            toast({
              title: 'Migration Complete',
              description: 'Provider switching completed successfully',
            });
            goToNextStep();
          } else {
            toast({
              title: 'Migration Failed',
              description: `Migration failed with ${progress.errors.length} errors`,
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        clearInterval(pollInterval);
        setIsProcessing(false);
        toast({
          title: 'Migration Monitoring Failed',
          description: 'Unable to monitor migration progress',
          variant: 'destructive',
        });
      }
    }, 2000);
  };

  // Run final verification
  const runFinalVerification = async () => {
    setIsProcessing(true);
    try {
      const response = await post('/api/admin/providers/final-verification', {
        providerId: toProvider.id,
        configuration: stepData[toProvider.type],
      });

      if (response.data.success) {
        const result: SwitchingResult = {
          success: true,
          fromProvider: fromProvider.id,
          toProvider: toProvider.id,
          backupId: backupResult?.backupId,
          rollbackAvailable: true,
          duration: Date.now() - startTime,
          errors: [],
          warnings: response.data.warnings || [],
        };

        toast({
          title: 'Switching Complete!',
          description: 'Provider has been successfully switched',
        });
        
        onComplete(result);
      } else {
        toast({
          title: 'Verification Failed',
          description: 'New provider is not working correctly',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Verification Error',
        description: 'Unable to verify new provider',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle step data change
  const handleStepDataChange = (stepId: string, data: any) => {
    setStepData(prev => ({
      ...prev,
      [stepId]: data,
    }));
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

  // Render current step content
  const renderStepContent = () => {
    const currentStep = wizardSteps[currentStepIndex];

    switch (currentStep.id) {
      case 'pre-validation':
        return (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Pre-validation checks the current provider status and ensures safe switching conditions.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Current Provider</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    {React.createElement(getProviderTypeIcon(fromProvider.type), { className: "w-5 h-5" })}
                    <span className="font-medium">{fromProvider.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Type: {fromProvider.type}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Target Provider</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    {React.createElement(getProviderTypeIcon(toProvider.type), { className: "w-5 h-5" })}
                    <span className="font-medium">{toProvider.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Type: {toProvider.type}</p>
                </CardContent>
              </Card>
            </div>

            {validationResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Validation Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
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
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
              <Button 
                onClick={runPreValidation}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Validation...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Run Pre-Validation
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'new-configuration':
        return (
          <div className="space-y-4">
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                Configure the new provider settings. All fields will be validated before proceeding.
              </AlertDescription>
            </Alert>

            {toProvider.type === 'database' && (
              <DatabaseConfigurationStep
                data={stepData[toProvider.type] || {}}
                onDataChange={(stepId, data) => handleStepDataChange(toProvider.type, data)}
                onNext={() => {}}
                onPrevious={() => {}}
                canGoNext={false}
                canGoPrevious={false}
                isActive={true}
                providerType={toProvider.id as any}
              />
            )}

            {toProvider.type === 'authentication' && (
              <AuthenticationConfigurationStep
                data={stepData[toProvider.type] || {}}
                onDataChange={(stepId, data) => handleStepDataChange(toProvider.type, data)}
                onNext={() => {}}
                onPrevious={() => {}}
                canGoNext={false}
                canGoPrevious={false}
                isActive={true}
                providerType={toProvider.id as any}
              />
            )}

            {toProvider.type === 'email' && (
              <EmailConfigurationStep
                data={stepData[toProvider.type] || {}}
                onDataChange={(stepId, data) => handleStepDataChange(toProvider.type, data)}
                onNext={() => {}}
                onPrevious={() => {}}
                canGoNext={false}
                canGoPrevious={false}
                isActive={true}
                providerType={toProvider.id as any}
              />
            )}

            {toProvider.type === 'storage' && (
              <StorageConfigurationStep
                data={stepData[toProvider.type] || {}}
                onDataChange={(stepId, data) => handleStepDataChange(toProvider.type, data)}
                onNext={() => {}}
                onPrevious={() => {}}
                canGoNext={false}
                canGoPrevious={false}
                isActive={true}
                providerType={toProvider.id as any}
              />
            )}

            <div className="flex justify-center">
              <Button 
                onClick={validateNewConfiguration}
                disabled={isProcessing || !stepData[toProvider.type]}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Validate Configuration
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'compatibility-check':
        return (
          <div className="space-y-4">
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                Checking compatibility between providers and identifying migration requirements.
              </AlertDescription>
            </Alert>

            {validationResult?.compatibility && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Compatibility Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {validationResult.compatibility.isCompatible ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium">
                        {validationResult.compatibility.isCompatible ? 'Compatible' : 'Incompatible'}
                      </span>
                    </div>

                    {validationResult.compatibility.issues.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Issues Found</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {validationResult.compatibility.issues.map((issue, index) => (
                            <li key={index} className="text-muted-foreground">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Migration Required:</span>
                      <Badge variant={validationResult.compatibility.migrationRequired ? 'secondary' : 'outline'}>
                        {validationResult.compatibility.migrationRequired ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
              <Button 
                onClick={runCompatibilityCheck}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking Compatibility...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Run Compatibility Check
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'backup-creation':
        return (
          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <Download className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Creating a backup is essential for safe provider switching. This backup can be used to rollback if needed.
              </AlertDescription>
            </Alert>

            {backupResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Backup Created</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Backup ID:</span>
                      <span className="font-mono">{backupResult.backupId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size:</span>
                      <span>{Math.round(backupResult.size / 1024 / 1024)} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-mono text-xs">{backupResult.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Checksum:</span>
                      <span className="font-mono text-xs">{backupResult.checksum.substring(0, 16)}...</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
              <Button 
                onClick={createBackup}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Create Backup
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'migration-execution':
        return (
          <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Upload className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                Migration is now in progress. Please do not close this window or interrupt the process.
              </AlertDescription>
            </Alert>

            {migrationProgress && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Migration Progress</CardTitle>
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
                    <p className="text-sm font-medium mb-1">{migrationProgress.stage}</p>
                    <p className="text-xs text-muted-foreground">{migrationProgress.currentOperation}</p>
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>ETA: {Math.round(migrationProgress.estimatedTimeRemaining / 60)} minutes</span>
                    <span>Elapsed: {Math.round((Date.now() - startTime) / 1000 / 60)} minutes</span>
                  </div>

                  {migrationProgress.warnings.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Warnings</h4>
                      <ul className="list-disc list-inside text-xs space-y-1 text-amber-700">
                        {migrationProgress.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!migrationProgress && (
              <div className="flex justify-center">
                <Button 
                  onClick={executeMigration}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting Migration...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Execute Migration
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        );

      case 'verification':
        return (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Final verification to ensure the new provider is working correctly.
              </AlertDescription>
            </Alert>

            <div className="flex justify-center">
              <Button 
                onClick={runFinalVerification}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Run Final Verification
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Provider Switching Wizard</h2>
        <p className="text-muted-foreground">
          Safely switch from {fromProvider.name} to {toProvider.name}
        </p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {wizardSteps.length}
            </span>
            <span className="text-sm text-muted-foreground">
              Progress: {Math.round(((currentStepIndex + 1) / wizardSteps.length) * 100)}%
            </span>
          </div>
          <Progress value={((currentStepIndex + 1) / wizardSteps.length) * 100} className="mb-6" />
          
          <div className="space-y-2">
            {wizardSteps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  step.isActive && "bg-primary/5 border border-primary/20",
                  step.isCompleted && "bg-green-50 border border-green-200"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                  step.isCompleted && "bg-green-100 text-green-700",
                  step.isActive && !step.isCompleted && "bg-primary text-primary-foreground",
                  !step.isActive && !step.isCompleted && "bg-muted text-muted-foreground"
                )}>
                  {step.isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="flex-1">
                  <p className={cn(
                    "font-medium",
                    step.isActive && "text-primary",
                    step.isCompleted && "text-green-700"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{wizardSteps[currentStepIndex].title}</CardTitle>
          <CardDescription>
            {wizardSteps[currentStepIndex].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
          disabled={currentStepIndex === 0 || isProcessing}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          
          {currentStepIndex < wizardSteps.length - 1 && (
            <Button
              onClick={goToNextStep}
              disabled={!wizardSteps[currentStepIndex].isCompleted || isProcessing}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}