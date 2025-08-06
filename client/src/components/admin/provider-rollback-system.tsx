/**
 * Provider Rollback System
 * 
 * Handles rollback operations when provider switching fails or needs to be undone.
 * Provides safe restoration of previous provider configuration and data.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Database,
  Shield,
  Mail,
  HardDrive,
  Settings,
  Loader2,
  FileText,
  Archive,
  Undo2,
  AlertCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { post, get } from '@/lib/api-utils';

interface BackupInfo {
  id: string;
  name: string;
  createdAt: string;
  providerType: string;
  providerName: string;
  size: number;
  checksum: string;
  isValid: boolean;
  canRestore: boolean;
  metadata: {
    version: string;
    configurationCount: number;
    dataRecordCount: number;
    dependencies: string[];
    originalConfiguration: Record<string, any>;
  };
  status: 'available' | 'corrupted' | 'expired' | 'incompatible';
}

interface RollbackOperation {
  id: string;
  backupId: string;
  fromProvider: string;
  toProvider: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStage: string;
  stages: Array<{
    id: string;
    name: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    progress: number;
    startTime?: Date;
    endTime?: Date;
    logs: string[];
    errors: string[];
  }>;
  startTime: Date;
  endTime?: Date;
  errors: string[];
  warnings: string[];
}

interface ProviderRollbackSystemProps {
  onRollbackComplete?: (result: { success: boolean; providerId: string }) => void;
  onClose?: () => void;
}

export function ProviderRollbackSystem({
  onRollbackComplete,
  onClose,
}: ProviderRollbackSystemProps) {
  const { toast } = useToast();
  const [availableBackups, setAvailableBackups] = useState<BackupInfo[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [rollbackOperation, setRollbackOperation] = useState<RollbackOperation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmRollback, setConfirmRollback] = useState(false);

  // Fetch available backups
  useEffect(() => {
    loadAvailableBackups();
  }, []);

  const loadAvailableBackups = async () => {
    setIsLoading(true);
    try {
      const response = await get('/api/admin/providers/backups');
      const backups = response.data.map((backup: any) => ({
        ...backup,
        createdAt: new Date(backup.createdAt).toISOString(),
      }));
      setAvailableBackups(backups);
    } catch (error) {
      toast({
        title: 'Failed to Load Backups',
        description: 'Unable to retrieve available backups',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Validate backup before rollback
  const validateBackup = async (backupId: string) => {
    try {
      const response = await post('/api/admin/providers/validate-backup', {
        backupId,
      });

      if (response.data.isValid) {
        toast({
          title: 'Backup Valid',
          description: 'Backup is valid and can be restored',
        });
        return true;
      } else {
        toast({
          title: 'Backup Invalid',
          description: response.data.reason || 'Backup cannot be restored',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Validation Failed',
        description: 'Unable to validate backup',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Start rollback operation
  const startRollback = async () => {
    if (!selectedBackup) return;

    // Validate backup first
    const isValid = await validateBackup(selectedBackup.id);
    if (!isValid) return;

    setIsLoading(true);
    try {
      const response = await post('/api/admin/providers/start-rollback', {
        backupId: selectedBackup.id,
        force: true, // Force rollback even if there are warnings
      });

      const operationId = response.data.operationId;
      
      // Initialize rollback operation state
      const operation: RollbackOperation = {
        id: operationId,
        backupId: selectedBackup.id,
        fromProvider: 'current',
        toProvider: selectedBackup.providerName,
        status: 'running',
        progress: 0,
        currentStage: 'Initializing rollback...',
        stages: [
          {
            id: 'preparation',
            name: 'Preparation',
            description: 'Preparing rollback environment',
            status: 'running',
            progress: 0,
            logs: [],
            errors: [],
          },
          {
            id: 'backup_validation',
            name: 'Backup Validation',
            description: 'Validating backup integrity',
            status: 'pending',
            progress: 0,
            logs: [],
            errors: [],
          },
          {
            id: 'current_backup',
            name: 'Current State Backup',
            description: 'Creating backup of current state',
            status: 'pending',
            progress: 0,
            logs: [],
            errors: [],
          },
          {
            id: 'data_restoration',
            name: 'Data Restoration',
            description: 'Restoring data from backup',
            status: 'pending',
            progress: 0,
            logs: [],
            errors: [],
          },
          {
            id: 'configuration_restoration',
            name: 'Configuration Restoration',
            description: 'Restoring provider configuration',
            status: 'pending',
            progress: 0,
            logs: [],
            errors: [],
          },
          {
            id: 'verification',
            name: 'Verification',
            description: 'Verifying restored provider functionality',
            status: 'pending',
            progress: 0,
            logs: [],
            errors: [],
          },
          {
            id: 'cleanup',
            name: 'Cleanup',
            description: 'Cleaning up temporary files and finalizing',
            status: 'pending',
            progress: 0,
            logs: [],
            errors: [],
          },
        ],
        startTime: new Date(),
        errors: [],
        warnings: [],
      };

      setRollbackOperation(operation);
      
      // Start polling for progress
      pollRollbackProgress(operationId);

      toast({
        title: 'Rollback Started',
        description: 'Provider rollback has been initiated',
      });

    } catch (error) {
      toast({
        title: 'Rollback Failed to Start',
        description: 'Unable to initiate rollback operation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Poll rollback progress
  const pollRollbackProgress = async (operationId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await post('/api/admin/providers/rollback-progress', {
          operationId,
        });

        const progress = response.data;
        
        setRollbackOperation(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            status: progress.status,
            progress: progress.progress,
            currentStage: progress.currentStage,
            stages: progress.stages.map((stage: any, index: number) => ({
              ...prev.stages[index],
              ...stage,
              startTime: stage.startTime ? new Date(stage.startTime) : prev.stages[index].startTime,
              endTime: stage.endTime ? new Date(stage.endTime) : prev.stages[index].endTime,
            })),
            endTime: progress.endTime ? new Date(progress.endTime) : prev.endTime,
            errors: progress.errors || prev.errors,
            warnings: progress.warnings || prev.warnings,
          };
        });

        // Check if rollback is complete
        if (progress.status === 'completed' || progress.status === 'failed') {
          clearInterval(pollInterval);
          
          if (progress.status === 'completed') {
            toast({
              title: 'Rollback Complete',
              description: 'Provider has been successfully rolled back',
            });
            
            if (onRollbackComplete) {
              onRollbackComplete({
                success: true,
                providerId: selectedBackup?.providerName || 'unknown',
              });
            }
          } else {
            toast({
              title: 'Rollback Failed',
              description: `Rollback failed: ${progress.errors?.join(', ') || 'Unknown error'}`,
              variant: 'destructive',
            });

            if (onRollbackComplete) {
              onRollbackComplete({
                success: false,
                providerId: selectedBackup?.providerName || 'unknown',
              });
            }
          }
        }

      } catch (error) {
        clearInterval(pollInterval);
        toast({
          title: 'Progress Monitoring Failed',
          description: 'Unable to monitor rollback progress',
          variant: 'destructive',
        });
      }
    }, 2000); // Poll every 2 seconds
  };

  // Cancel rollback operation
  const cancelRollback = async () => {
    if (!rollbackOperation) return;

    try {
      await post('/api/admin/providers/cancel-rollback', {
        operationId: rollbackOperation.id,
      });

      setRollbackOperation(prev => prev ? { ...prev, status: 'cancelled' } : null);
      
      toast({
        title: 'Rollback Cancelled',
        description: 'Rollback operation has been cancelled',
      });
    } catch (error) {
      toast({
        title: 'Cancellation Failed',
        description: 'Unable to cancel rollback operation',
        variant: 'destructive',
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
      default:
        return Settings;
    }
  };

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'available':
        return { icon: CheckCircle, className: 'text-green-600' };
      case 'failed':
      case 'corrupted':
        return { icon: XCircle, className: 'text-red-600' };
      case 'running':
        return { icon: Loader2, className: 'text-blue-600 animate-spin' };
      case 'cancelled':
      case 'expired':
        return { icon: AlertTriangle, className: 'text-yellow-600' };
      case 'pending':
      case 'incompatible':
        return { icon: Clock, className: 'text-gray-400' };
      default:
        return { icon: AlertCircle, className: 'text-gray-400' };
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    const duration = end.getTime() - startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (rollbackOperation) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Rollback in Progress</h2>
            <p className="text-muted-foreground">
              Rolling back to {selectedBackup?.providerName}
            </p>
          </div>
          <div className="flex gap-2">
            {rollbackOperation.status === 'running' && (
              <Button variant="outline" onClick={cancelRollback}>
                Cancel Rollback
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Overall Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Undo2 className="w-5 h-5" />
              Rollback Progress
              <Badge variant={rollbackOperation.status === 'completed' ? 'default' : 'secondary'}>
                {rollbackOperation.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              {rollbackOperation.currentStage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(rollbackOperation.progress)}%</span>
              </div>
              <Progress value={rollbackOperation.progress} className="w-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>
                  Duration: {formatDuration(rollbackOperation.startTime, rollbackOperation.endTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4" />
                <span>Backup: {selectedBackup?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span>Stages: {rollbackOperation.stages.filter(s => s.status === 'completed').length}/{rollbackOperation.stages.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rollback Stages */}
        <Card>
          <CardHeader>
            <CardTitle>Rollback Stages</CardTitle>
            <CardDescription>
              Detailed progress for each rollback stage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rollbackOperation.stages.map((stage, index) => {
                const statusIcon = getStatusIcon(stage.status);
                const StatusIcon = statusIcon.icon;

                return (
                  <div
                    key={stage.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      stage.status === 'running' && "border-blue-200 bg-blue-50",
                      stage.status === 'completed' && "border-green-200 bg-green-50",
                      stage.status === 'failed' && "border-red-200 bg-red-50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background">
                          <span className="text-sm font-medium">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{stage.name}</p>
                          <p className="text-sm text-muted-foreground">{stage.description}</p>
                        </div>
                      </div>
                      <StatusIcon className={cn("w-5 h-5", statusIcon.className)} />
                    </div>

                    {stage.status === 'running' && (
                      <div className="mb-3">
                        <Progress value={stage.progress} className="w-full h-2" />
                      </div>
                    )}

                    {stage.logs.length > 0 && (
                      <div className="mt-3">
                        <ScrollArea className="h-20 w-full">
                          <div className="text-xs font-mono space-y-1 p-2 bg-muted rounded">
                            {stage.logs.slice(-5).map((log, logIndex) => (
                              <div key={logIndex} className="whitespace-pre-wrap">
                                {log}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {stage.errors.length > 0 && (
                      <Alert variant="destructive" className="mt-3">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="list-disc list-inside">
                            {stage.errors.map((error, errorIndex) => (
                              <li key={errorIndex}>{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {rollbackOperation.status === 'completed' && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                Rollback Complete
              </CardTitle>
              <CardDescription className="text-green-700">
                Provider has been successfully rolled back to {selectedBackup?.providerName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button onClick={onClose} className="flex-1">
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {rollbackOperation.status === 'failed' && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <XCircle className="w-5 h-5" />
                Rollback Failed
              </CardTitle>
              <CardDescription className="text-red-700">
                The rollback operation encountered errors and could not be completed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rollbackOperation.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {rollbackOperation.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setRollbackOperation(null)} className="flex-1">
                  Try Different Backup
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Provider Rollback</h2>
          <p className="text-muted-foreground">
            Restore a previous provider configuration from backup
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAvailableBackups} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Warning */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700">
          <strong>Warning:</strong> Rolling back will replace your current provider configuration and data. 
          Ensure you have a recent backup before proceeding.
        </AlertDescription>
      </Alert>

      {/* Available Backups */}
      <Card>
        <CardHeader>
          <CardTitle>Available Backups</CardTitle>
          <CardDescription>
            Select a backup to restore from. Only valid and compatible backups are shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : availableBackups.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">No Backups Available</h3>
              <p className="text-muted-foreground">
                No valid backups found. Create backups before switching providers to enable rollback.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableBackups.map((backup) => {
                const ProviderIcon = getProviderTypeIcon(backup.providerType);
                const statusIcon = getStatusIcon(backup.status);
                const StatusIcon = statusIcon.icon;

                return (
                  <div
                    key={backup.id}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-colors",
                      selectedBackup?.id === backup.id && "border-primary bg-primary/5",
                      !backup.canRestore && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => backup.canRestore && setSelectedBackup(backup)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ProviderIcon className="w-6 h-6" />
                        <div>
                          <h4 className="font-medium">{backup.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {backup.providerName} • {new Date(backup.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatFileSize(backup.size)}</p>
                          <p className="text-xs text-muted-foreground">
                            {backup.metadata.configurationCount} configs, {backup.metadata.dataRecordCount} records
                          </p>
                        </div>
                        <StatusIcon className={cn("w-5 h-5", statusIcon.className)} />
                      </div>
                    </div>

                    {selectedBackup?.id === backup.id && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h5 className="font-semibold text-sm mb-2">Backup Details</h5>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Version:</span>
                                <span>{backup.metadata.version}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Checksum:</span>
                                <span className="font-mono text-xs">{backup.checksum.substring(0, 16)}...</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                <Badge variant={backup.status === 'available' ? 'default' : 'secondary'}>
                                  {backup.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h5 className="font-semibold text-sm mb-2">Dependencies</h5>
                            <div className="flex flex-wrap gap-1">
                              {backup.metadata.dependencies.map((dep) => (
                                <Badge key={dep} variant="outline" className="text-xs">
                                  {dep}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rollback Confirmation */}
      {selectedBackup && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ready to Rollback</CardTitle>
            <CardDescription>
              This will restore the selected backup and replace your current provider configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>What will happen:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Current provider configuration will be backed up</li>
                  <li>Selected backup will be restored</li>
                  <li>Provider will be switched to: {selectedBackup.providerName}</li>
                  <li>All data and configuration from the backup will be restored</li>
                  <li>System will be tested to ensure functionality</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="confirm-rollback"
                checked={confirmRollback}
                onChange={(e) => setConfirmRollback(e.target.checked)}
              />
              <label htmlFor="confirm-rollback" className="text-sm">
                I understand that this will replace my current provider configuration and data
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={startRollback}
                disabled={!confirmRollback || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting Rollback...
                  </>
                ) : (
                  <>
                    <Undo2 className="w-4 h-4 mr-2" />
                    Start Rollback
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setSelectedBackup(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}