/**
 * Provider Setup Wizard
 * 
 * Main wizard component for setting up providers in the RSVP platform.
 * Integrates with the backend automated setup system and provides
 * step-by-step configuration for all provider types.
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Steps, Step } from '@/components/ui/steps';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Import step components
import { ProviderTypeSelectionStep } from './steps/provider-type-selection-step';
import { DatabaseConfigurationStep } from './steps/database-configuration-step';
import { AuthenticationConfigurationStep } from './steps/authentication-configuration-step';
import { EmailConfigurationStep } from './steps/email-configuration-step';
import { StorageConfigurationStep } from './steps/storage-configuration-step';
import { ReviewAndConfirmStep } from './steps/review-and-confirm-step';
import { SetupProgressStep } from './steps/setup-progress-step';

// API integration
import { post, get } from '@/lib/api-utils';

// Types
export type ProviderType = 
  | 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'supabase-db' | 'pocketbase-db'
  | 'local-auth' | 'jwt-local-auth' | 'oauth2-auth' | 'supabase-auth' | 'pocketbase-auth'
  | 'smtp-email' | 'sendgrid-email' | 'resend-email' | 'gmail-oauth-email' | 'pocketbase-email'
  | 'local-file-storage' | 'aws-s3-storage' | 'supabase-storage' | 'pocketbase-storage'
  | 'pocketbase-all-in-one' | 'supabase-all-in-one' | 'firebase-all-in-one';

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<WizardStepProps>;
  isRequired: boolean;
  dependencies?: string[];
  estimatedTime?: number; // in minutes
}

export interface WizardStepProps {
  data: Record<string, unknown>;
  onDataChange: (stepId: string, data: Record<string, unknown>) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isActive: boolean;
  providerType?: ProviderType;
}

export interface SetupProgress {
  setupId: string;
  providerType: ProviderType;
  providerName: string;
  totalSteps: number;
  completedSteps: number;
  currentStep?: {
    id: string;
    name: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  };
  status: 'initializing' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  estimatedTotalTime: number;
  actualTotalTime?: number;
  errors: string[];
  warnings: string[];
}

const wizardSchema = z.object({
  providerType: z.string().min(1, 'Provider type is required'),
  configuration: z.record(z.record(z.unknown())).default({}),
});

type WizardFormData = z.infer<typeof wizardSchema>;

interface ProviderSetupWizardProps {
  onComplete?: (result: SetupProgress) => void;
  onCancel?: () => void;
  initialProviderType?: ProviderType;
  className?: string;
}

export function ProviderSetupWizard({
  onComplete,
  onCancel,
  initialProviderType,
  className
}: ProviderSetupWizardProps) {
  const { toast } = useToast();
  
  // Wizard state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedProviderType, setSelectedProviderType] = useState<ProviderType | null>(
    initialProviderType || null
  );
  const [wizardSteps, setWizardSteps] = useState<WizardStep[]>([]);
  const [stepData, setStepData] = useState<Record<string, Record<string, unknown>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(null);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);

  // Form
  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      providerType: initialProviderType || '',
      configuration: {},
    },
  });

  // Base wizard steps (always present)
  const baseSteps: WizardStep[] = [
    {
      id: 'provider-type',
      title: 'Provider Type',
      description: 'Select the type of provider to configure',
      component: ProviderTypeSelectionStep,
      isRequired: true,
      estimatedTime: 2,
    },
    {
      id: 'review-confirm',
      title: 'Review & Confirm',
      description: 'Review your configuration and start setup',
      component: ReviewAndConfirmStep,
      isRequired: true,
      estimatedTime: 3,
    },
    {
      id: 'setup-progress',
      title: 'Setup Progress',
      description: 'Monitor the automated setup process',
      component: SetupProgressStep,
      isRequired: true,
      estimatedTime: 5,
    },
  ];

  // Load wizard steps based on provider type
  useEffect(() => {
    if (!selectedProviderType) {
      setWizardSteps(baseSteps);
      return;
    }

    const loadWizardSteps = async () => {
      try {
        setIsLoading(true);
        
        // Get wizard steps from backend
        const response = await get(`/api/providers/wizard-steps/${selectedProviderType}`);
        const providerSteps = response.data || [];

        // Create dynamic steps based on provider requirements
        const dynamicSteps: WizardStep[] = [];

        // Add configuration steps based on provider type
        if (selectedProviderType.includes('db') || 
            ['postgresql', 'mysql', 'sqlite', 'mongodb'].includes(selectedProviderType)) {
          dynamicSteps.push({
            id: 'database-config',
            title: 'Database Configuration',
            description: 'Configure database connection settings',
            component: DatabaseConfigurationStep,
            isRequired: true,
            estimatedTime: 5,
          });
        }

        // Add authentication configuration for all setups (not just auth-specific providers)
        // This enables the modular authentication method selection
        if (selectedProviderType.includes('auth') || 
            ['postgresql', 'mysql', 'sqlite', 'mongodb', 'local-auth', 'jwt-local-auth'].includes(selectedProviderType) ||
            !selectedProviderType.includes('all-in-one')) {
          dynamicSteps.push({
            id: 'auth-config',
            title: 'Authentication Configuration',
            description: 'Configure authentication settings and method',
            component: AuthenticationConfigurationStep,
            isRequired: true,
            estimatedTime: 4,
          });
        }

        if (selectedProviderType.includes('email')) {
          dynamicSteps.push({
            id: 'email-config',
            title: 'Email Configuration',
            description: 'Configure email service settings',
            component: EmailConfigurationStep,
            isRequired: true,
            estimatedTime: 3,
          });
        }

        if (selectedProviderType.includes('storage')) {
          dynamicSteps.push({
            id: 'storage-config',
            title: 'Storage Configuration',
            description: 'Configure file storage settings',
            component: StorageConfigurationStep,
            isRequired: true,
            estimatedTime: 3,
          });
        }

        // All-in-one providers get multiple configuration steps
        if (selectedProviderType.includes('all-in-one')) {
          if (selectedProviderType === 'pocketbase-all-in-one') {
            dynamicSteps.push(
              {
                id: 'pocketbase-general',
                title: 'PocketBase Configuration',
                description: 'Configure PocketBase server settings',
                component: DatabaseConfigurationStep,
                isRequired: true,
                estimatedTime: 5,
              },
              {
                id: 'pocketbase-auth',
                title: 'Authentication Settings',
                description: 'Configure PocketBase authentication',
                component: AuthenticationConfigurationStep,
                isRequired: false,
                estimatedTime: 3,
              }
            );
          } else if (selectedProviderType === 'supabase-all-in-one') {
            dynamicSteps.push(
              {
                id: 'supabase-project',
                title: 'Supabase Project',
                description: 'Configure Supabase project connection',
                component: DatabaseConfigurationStep,
                isRequired: true,
                estimatedTime: 4,
              },
              {
                id: 'supabase-auth',
                title: 'Supabase Auth',
                description: 'Configure Supabase authentication',
                component: AuthenticationConfigurationStep,
                isRequired: false,
                estimatedTime: 3,
              }
            );
          }
        }

        // Build final step list
        const finalSteps: WizardStep[] = [
          baseSteps[0], // provider-type
          ...dynamicSteps,
          baseSteps[1], // review-confirm
          baseSteps[2], // setup-progress
        ];

        setWizardSteps(finalSteps);
      } catch (error) {
        console.error('Error loading wizard steps:', error);
        toast({
          title: 'Error',
          description: 'Failed to load wizard configuration. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadWizardSteps();
  }, [selectedProviderType, toast]);

  // Handle step data changes
  const handleStepDataChange = (stepId: string, data: Record<string, unknown>) => {
    setStepData(prev => ({
      ...prev,
      [stepId]: data,
    }));

    // Clear validation errors for this step
    if (validationErrors[stepId]) {
      const newErrors = { ...validationErrors };
      delete newErrors[stepId];
      setValidationErrors(newErrors);
    }
  };

  // Validate current step
  const validateCurrentStep = async (): Promise<boolean> => {
    const currentStep = wizardSteps[currentStepIndex];
    if (!currentStep) return false;

    try {
      setIsLoading(true);

      // For provider type step, just check if type is selected
      if (currentStep.id === 'provider-type') {
        return !!selectedProviderType;
      }

      // For other steps, validate with backend
      if (selectedProviderType && stepData[currentStep.id]) {
        const response = await post('/api/providers/validate-wizard-step', {
          providerType: selectedProviderType,
          stepId: currentStep.id,
          stepData: stepData[currentStep.id],
        });

        if (!response.data.valid) {
          setValidationErrors(prev => ({
            ...prev,
            [currentStep.id]: response.data.errors || [],
          }));
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Step validation error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle next step
  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before continuing.',
        variant: 'destructive',
      });
      return;
    }

    if (currentStepIndex < wizardSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Handle provider type selection
  const handleProviderTypeChange = (providerType: ProviderType) => {
    setSelectedProviderType(providerType);
    form.setValue('providerType', providerType);
    
    // Reset step data when changing provider type
    setStepData({});
    setValidationErrors({});
  };

  // Handle setup execution
  const handleStartSetup = async () => {
    if (!selectedProviderType) return;

    try {
      setIsSetupInProgress(true);
      setIsLoading(true);

      // Start automated setup
      const response = await post('/api/providers/setup', {
        providerType: selectedProviderType,
        wizardData: stepData,
        options: {
          validateOnly: false,
          continueOnWarnings: true,
          backup: true,
          rollbackOnFailure: true,
        },
      });

      setSetupProgress(response.data);

      // Poll for progress updates
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await get(`/api/providers/setup-progress/${response.data.setupId}`);
          const progress = progressResponse.data;
          
          setSetupProgress(progress);

          if (progress.status === 'completed' || progress.status === 'failed') {
            clearInterval(pollInterval);
            setIsSetupInProgress(false);
            setIsLoading(false);

            if (progress.status === 'completed') {
              toast({
                title: 'Setup Complete',
                description: `${progress.providerName} has been successfully configured.`,
              });
              onComplete?.(progress);
            } else {
              toast({
                title: 'Setup Failed',
                description: progress.errors.join(', '),
                variant: 'destructive',
              });
            }
          }
        } catch (error) {
          console.error('Error polling setup progress:', error);
          clearInterval(pollInterval);
          setIsSetupInProgress(false);
          setIsLoading(false);
        }
      }, 2000);

    } catch (error) {
      console.error('Setup execution error:', error);
      setIsSetupInProgress(false);
      setIsLoading(false);
      toast({
        title: 'Setup Error',
        description: 'Failed to start provider setup. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Cancel setup
  const handleCancel = async () => {
    if (setupProgress && isSetupInProgress) {
      try {
        await post(`/api/providers/cancel-setup/${setupProgress.setupId}`);
        toast({
          title: 'Setup Cancelled',
          description: 'Provider setup has been cancelled.',
        });
      } catch (error) {
        console.error('Error cancelling setup:', error);
      }
    }
    
    onCancel?.();
  };

  // Generate step components for Steps UI
  const stepsForUI: Step[] = wizardSteps.map((step, index) => ({
    id: step.id,
    label: step.title,
    isCompleted: index < currentStepIndex,
    isActive: index === currentStepIndex,
  }));

  const currentStep = wizardSteps[currentStepIndex];
  const StepComponent = currentStep?.component;

  const canGoNext = currentStepIndex < wizardSteps.length - 1;
  const canGoPrevious = currentStepIndex > 0;

  // Calculate total estimated time
  const totalEstimatedTime = wizardSteps.reduce((sum, step) => sum + (step.estimatedTime || 0), 0);

  if (isLoading && wizardSteps.length === 0) {
    return (
      <Card className={cn('w-full max-w-4xl mx-auto', className)}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Spinner />
            <span>Loading wizard configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full max-w-4xl mx-auto', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Provider Setup Wizard</CardTitle>
            <CardDescription>
              Configure providers for your RSVP platform
              {totalEstimatedTime > 0 && (
                <span className="ml-2">
                  • Estimated time: {totalEstimatedTime} minutes
                </span>
              )}
            </CardDescription>
          </div>
          {selectedProviderType && (
            <Badge variant="outline" className="text-sm">
              {selectedProviderType}
            </Badge>
          )}
        </div>

        {/* Progress indicator */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Step {currentStepIndex + 1} of {wizardSteps.length}</span>
            <span>{Math.round(((currentStepIndex + 1) / wizardSteps.length) * 100)}% complete</span>
          </div>
          <Progress value={((currentStepIndex + 1) / wizardSteps.length) * 100} className="h-2" />
        </div>

        {/* Steps navigation */}
        <Steps
          steps={stepsForUI}
          onStepClick={(stepId) => {
            const stepIndex = wizardSteps.findIndex(s => s.id === stepId);
            if (stepIndex !== -1 && stepIndex <= currentStepIndex) {
              setCurrentStepIndex(stepIndex);
            }
          }}
          orientation="horizontal"
          className="mt-4"
        />
      </CardHeader>

      <CardContent className="p-6">
        {/* Current step content */}
        {currentStep && StepComponent && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{currentStep.title}</h3>
              <p className="text-muted-foreground">{currentStep.description}</p>
              {currentStep.estimatedTime && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>Estimated time: {currentStep.estimatedTime} minutes</span>
                </div>
              )}
            </div>

            {/* Validation errors */}
            {validationErrors[currentStep.id] && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {validationErrors[currentStep.id].join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {/* Step component */}
            <StepComponent
              data={stepData[currentStep.id] || {}}
              onDataChange={handleStepDataChange}
              onNext={handleNext}
              onPrevious={handlePrevious}
              canGoNext={canGoNext}
              canGoPrevious={canGoPrevious}
              isActive={true}
              providerType={selectedProviderType || undefined}
            />
          </div>
        )}
      </CardContent>

      {/* Footer with navigation */}
      <div className="border-t p-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={canGoPrevious ? handlePrevious : handleCancel}
            disabled={isLoading || isSetupInProgress}
          >
            {canGoPrevious ? (
              <>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </>
            ) : (
              'Cancel'
            )}
          </Button>

          <div className="flex items-center gap-2">
            {currentStep?.id === 'review-confirm' && !isSetupInProgress && (
              <Button
                onClick={handleStartSetup}
                disabled={isLoading || !selectedProviderType}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    Starting Setup...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Start Setup
                  </>
                )}
              </Button>
            )}

            {canGoNext && currentStep?.id !== 'review-confirm' && (
              <Button
                onClick={handleNext}
                disabled={isLoading || isSetupInProgress}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}