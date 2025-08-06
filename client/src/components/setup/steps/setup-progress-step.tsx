/**
 * Setup Progress Step
 * 
 * Final step that shows real-time progress of the automated setup process.
 * Integrates with the backend setup system to provide live updates as the
 * setup proceeds through its various stages.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play,
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  Clock,
  Settings,
  Database,
  Shield,
  Mail,
  HardDrive,
  RefreshCw,
  Download,
  Upload,
  Wrench,
  Zap,
  Home,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepProps, ProviderType } from '../provider-setup-wizard';
import { post } from '@/lib/api-utils';
import { useToast } from '@/hooks/use-toast';

interface SetupProgressStepProps extends WizardStepProps {
  providerType?: ProviderType;
  onSetupComplete?: () => void;
}

interface SetupStage {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  progress: number;
  message?: string;
  startTime?: Date;
  endTime?: Date;
  logs?: string[];
}

interface SetupProgress {
  currentStage: string;
  overallProgress: number;
  stages: SetupStage[];
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  estimatedTimeRemaining: number;
  totalElapsedTime: number;
  setupId: string;
}

export function SetupProgressStep({
  data,
  providerType,
  onSetupComplete,
}: SetupProgressStepProps) {
  const { toast } = useToast();
  const [setupProgress, setSetupProgress] = useState<SetupProgress | null>(null);
  const [isSetupRunning, setIsSetupRunning] = useState(false);
  const [selectedLogStage, setSelectedLogStage] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Initialize setup stages based on provider type
  const initializeSetupStages = (): SetupStage[] => {
    const baseStages: SetupStage[] = [
      {
        id: 'init',
        name: 'Initialize Setup',
        description: 'Preparing setup environment and validating configuration',
        icon: Settings,
        status: 'pending',
        progress: 0,
        logs: [],
      },
      {
        id: 'backup',
        name: 'Create Backup',
        description: 'Creating backup of existing configuration',
        icon: Download,
        status: 'pending',
        progress: 0,
        logs: [],
      },
    ];

    // Add provider-specific stages
    if (providerType?.includes('db') || ['postgresql', 'mysql', 'sqlite'].includes(providerType || '')) {
      baseStages.push({
        id: 'database',
        name: 'Setup Database',
        description: 'Configuring database connection and schema',
        icon: Database,
        status: 'pending',
        progress: 0,
        logs: [],
      });
    }

    if (providerType?.includes('auth')) {
      baseStages.push({
        id: 'authentication',
        name: 'Setup Authentication',
        description: 'Configuring authentication system and security',
        icon: Shield,
        status: 'pending',
        progress: 0,
        logs: [],
      });
    }

    if (providerType?.includes('email')) {
      baseStages.push({
        id: 'email',
        name: 'Setup Email',
        description: 'Configuring email service and templates',
        icon: Mail,
        status: 'pending',
        progress: 0,
        logs: [],
      });
    }

    if (providerType?.includes('storage')) {
      baseStages.push({
        id: 'storage',
        name: 'Setup Storage',
        description: 'Configuring file storage and upload handling',
        icon: HardDrive,
        status: 'pending',
        progress: 0,
        logs: [],
      });
    }

    // Handle all-in-one providers
    if (providerType?.includes('all-in-one')) {
      baseStages.push(
        {
          id: 'database',
          name: 'Setup Database',
          description: 'Configuring database connection and schema',
          icon: Database,
          status: 'pending',
          progress: 0,
          logs: [],
        },
        {
          id: 'authentication',
          name: 'Setup Authentication',
          description: 'Configuring authentication system and security',
          icon: Shield,
          status: 'pending',
          progress: 0,
          logs: [],
        },
        {
          id: 'email',
          name: 'Setup Email',
          description: 'Configuring email service and templates',
          icon: Mail,
          status: 'pending',
          progress: 0,
          logs: [],
        },
        {
          id: 'storage',
          name: 'Setup Storage',
          description: 'Configuring file storage and upload handling',  
          icon: HardDrive,
          status: 'pending',
          progress: 0,
          logs: [],
        }
      );
    }

    // Final stages
    baseStages.push(
      {
        id: 'migration',
        name: 'Run Migrations',
        description: 'Running database migrations and initializing data',
        icon: Upload,
        status: 'pending',
        progress: 0,
        logs: [],
      },
      {
        id: 'testing',
        name: 'Test Configuration',
        description: 'Verifying all components are working correctly',
        icon: Wrench,
        status: 'pending',
        progress: 0,
        logs: [],
      },
      {
        id: 'finalization',
        name: 'Finalize Setup',
        description: 'Completing setup and preparing application for use',
        icon: Zap,
        status: 'pending',
        progress: 0,
        logs: [],
      }
    );

    return baseStages;
  };

  // Start the automated setup process
  const startSetup = async () => {
    try {
      setIsSetupRunning(true);
      
      const stages = initializeSetupStages();
      const initialProgress: SetupProgress = {
        currentStage: stages[0].id,
        overallProgress: 0,
        stages,
        status: 'running',
        estimatedTimeRemaining: 300, // Default 5 minutes
        totalElapsedTime: 0,
        setupId: `setup_${Date.now()}`,
      };

      setSetupProgress(initialProgress);

      // Start the setup process on the backend
      const response = await post('/api/providers/start-setup', {
        providerType,
        configuration: data,
        setupId: initialProgress.setupId,
      });

      if (response.data.success) {
        toast({
          title: 'Setup Started',
          description: 'Automated setup process has begun. This may take several minutes.',
        });

        // Start polling for progress updates
        pollSetupProgress(initialProgress.setupId);
      } else {
        throw new Error(response.data.message || 'Failed to start setup');
      }
    } catch (error) {
      console.error('Setup start error:', error);
      setIsSetupRunning(false);
      toast({
        title: 'Setup Failed to Start',
        description: 'Unable to begin the automated setup process.',
        variant: 'destructive',
      });
    }
  };

  // Poll for setup progress updates
  const pollSetupProgress = async (setupId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await post('/api/providers/setup-progress', { setupId });
        const progressData = response.data;

        setSetupProgress(prev => {
          if (!prev) return null;

          const updatedStages = prev.stages.map(stage => {
            const stageUpdate = progressData.stages?.find((s: any) => s.id === stage.id);
            if (stageUpdate) {
              return {
                ...stage,
                ...stageUpdate,
                logs: stageUpdate.logs || stage.logs,
              };
            }
            return stage;
          });

          return {
            ...prev,
            currentStage: progressData.currentStage || prev.currentStage,
            overallProgress: progressData.overallProgress || prev.overallProgress,
            stages: updatedStages,
            status: progressData.status || prev.status,
            estimatedTimeRemaining: progressData.estimatedTimeRemaining || prev.estimatedTimeRemaining,
            totalElapsedTime: progressData.totalElapsedTime || prev.totalElapsedTime,
          };
        });

        // Check if setup is complete
        if (progressData.status === 'completed') {
          clearInterval(pollInterval);
          setIsSetupRunning(false);
          toast({
            title: 'Setup Complete!',
            description: 'Your RSVP platform has been successfully configured.',
          });
          onSetupComplete?.();
        } else if (progressData.status === 'failed') {
          clearInterval(pollInterval);
          setIsSetupRunning(false);
          toast({
            title: 'Setup Failed',
            description: 'The setup process encountered an error. Please check the logs for details.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Progress polling error:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup polling on component unmount or setup completion
    return () => clearInterval(pollInterval);
  };

  // Cancel the setup process
  const cancelSetup = async () => {
    if (!setupProgress) return;

    try {
      await post('/api/providers/cancel-setup', { setupId: setupProgress.setupId });
      setSetupProgress(prev => prev ? { ...prev, status: 'cancelled' } : null);
      setIsSetupRunning(false);
      toast({
        title: 'Setup Cancelled',
        description: 'The setup process has been cancelled.',
      });
    } catch (error) {
      console.error('Setup cancellation error:', error);
      toast({
        title: 'Cancellation Failed',
        description: 'Unable to cancel the setup process.',
        variant: 'destructive',
      });
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  // Get status icon and color
  const getStatusDisplay = (status: SetupStage['status']) => {
    switch (status) {
      case 'running':
        return { icon: Loader2, className: 'text-blue-600 animate-spin' };
      case 'completed':
        return { icon: CheckCircle, className: 'text-green-600' };
      case 'failed':
        return { icon: XCircle, className: 'text-red-600' };
      case 'skipped':
        return { icon: AlertTriangle, className: 'text-amber-600' };
      default:
        return { icon: Clock, className: 'text-gray-400' };
    }
  };

  if (!setupProgress) {
    return (
      <div className="space-y-6">
        {/* Ready to start */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Play className="w-5 h-5" />
              Ready to Start Setup
            </CardTitle>
            <CardDescription>
              All configuration is complete. Click "Start Automated Setup" to begin the process.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <span>Provider: {providerType}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>Est. Time: 3-8 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Fully Automated</span>
              </div>
            </div>

            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                The setup process will configure your providers, run database migrations, and test all connections.
                You can monitor progress in real-time and cancel if needed.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={startSetup}
                disabled={isSetupRunning}
                className="flex-1"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Automated Setup
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Setup overview */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Process Overview</CardTitle>
            <CardDescription>
              The automated setup will perform the following steps in sequence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {initializeSetupStages().map((stage, index) => {
                const Icon = stage.icon;
                return (
                  <div key={stage.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                      <span className="text-sm font-medium text-primary">{index + 1}</span>
                    </div>
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{stage.name}</p>
                      <p className="text-sm text-muted-foreground">{stage.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Setup Progress
                <Badge variant={setupProgress.status === 'completed' ? 'default' : 'secondary'}>
                  {setupProgress.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                Automated setup is {setupProgress.status === 'running' ? 'in progress' : setupProgress.status}
              </CardDescription>
            </div>
            {isSetupRunning && (
              <Button variant="outline" onClick={cancelSetup} size="sm">
                Cancel Setup
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(setupProgress.overallProgress)}%</span>
            </div>
            <Progress value={setupProgress.overallProgress} className="w-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Elapsed: {formatTime(setupProgress.totalElapsedTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span>Remaining: {formatTime(setupProgress.estimatedTimeRemaining)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>Current: {setupProgress.stages.find(s => s.id === setupProgress.currentStage)?.name}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup stages */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Stages</CardTitle>
          <CardDescription>
            Detailed progress for each setup stage. Click on a stage to view logs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {setupProgress.stages.map((stage, index) => {
              const Icon = stage.icon;
              const statusDisplay = getStatusDisplay(stage.status);
              const StatusIcon = statusDisplay.icon;

              return (
                <div
                  key={stage.id}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-colors",
                    stage.status === 'running' && "border-blue-200 bg-blue-50",
                    stage.status === 'completed' && "border-green-200 bg-green-50",
                    stage.status === 'failed' && "border-red-200 bg-red-50",
                    selectedLogStage === stage.id && "ring-2 ring-primary/50"
                  )}
                  onClick={() => setSelectedLogStage(selectedLogStage === stage.id ? null : stage.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <Icon className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{stage.name}</p>
                        <p className="text-sm text-muted-foreground">{stage.description}</p>
                        {stage.message && (
                          <p className={cn(
                            "text-sm mt-1",
                            stage.status === 'failed' && "text-red-700",
                            stage.status === 'completed' && "text-green-700",
                            stage.status === 'running' && "text-blue-700"
                          )}>
                            {stage.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {stage.status === 'running' && (
                        <div className="text-sm text-muted-foreground">
                          {Math.round(stage.progress)}%
                        </div>
                      )}
                      <StatusIcon className={cn("w-5 h-5", statusDisplay.className)} />
                    </div>
                  </div>

                  {stage.status === 'running' && (
                    <div className="mt-3">
                      <Progress value={stage.progress} className="w-full" />
                    </div>
                  )}

                  {/* Stage logs */}
                  {selectedLogStage === stage.id && stage.logs && stage.logs.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Logs</h4>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={autoScroll}
                              onChange={(e) => setAutoScroll(e.target.checked)}
                              className="w-3 h-3"
                            />
                            Auto-scroll
                          </label>
                        </div>
                      </div>
                      <ScrollArea className="h-32 w-full">
                        <div className="text-xs font-mono space-y-1 p-2 bg-muted rounded">
                          {stage.logs.map((log, logIndex) => (
                            <div key={logIndex} className="whitespace-pre-wrap">
                              {log}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Setup completion */}
      {setupProgress.status === 'completed' && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              Setup Complete!
            </CardTitle>
            <CardDescription className="text-green-700">
              Your RSVP platform has been successfully configured and is ready to use.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-100">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                All components have been configured and tested successfully. You can now start using your RSVP platform.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => window.location.href = '/dashboard'}>
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={() => window.open('/admin', '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Admin Panel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup failure */}
      {setupProgress.status === 'failed' && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <XCircle className="w-5 h-5" />
              Setup Failed
            </CardTitle>
            <CardDescription className="text-red-700">
              The setup process encountered an error. Please review the logs and try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                One or more setup stages failed. Check the detailed logs above for specific error information.
                You may need to adjust your configuration and restart the setup process.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSetupProgress(null)} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}