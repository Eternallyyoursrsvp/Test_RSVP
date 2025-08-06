/**
 * First Time Setup Page
 * 
 * Token-protected setup wizard for zero-configuration startup.
 * Handles initial platform configuration through visual interface.
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Rocket, RefreshCw, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { get, post } from '@/lib/api-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SetupStatus {
  isFirstTimeSetup: boolean;
  hasValidConfig: boolean;
  isBootstrapMode: boolean;
  missingRequiredVars: string[];
  setupTokenActive: boolean;
}

interface SetupWizardData {
  database: {
    type: 'postgresql' | 'sqlite' | 'supabase';
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    path?: string;
    connectionString?: string;
    url?: string;
    anonKey?: string;
    serviceRoleKey?: string;
  };
  auth?: {
    provider: string;
    jwtSecret?: string;
  };
  email?: {
    provider: 'sendgrid' | 'smtp' | 'gmail' | 'none';
    apiKey?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    secure?: boolean;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
  };
  storage?: {
    provider: 'local' | 'aws-s3';
    path?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    bucket?: string;
  };
  sessionSecret?: string;
  port?: number;
  nodeEnv?: string;
  baseUrl?: string;
}

export default function FirstTimeSetup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<SetupWizardData>({
    database: { type: 'postgresql' },
    auth: { provider: 'jwt-local' },
    email: { provider: 'none' },
    storage: { provider: 'local', path: './uploads' },
    port: 5000,
    nodeEnv: 'development'
  });
  const [isCompleting, setIsCompleting] = useState(false);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);

  // Extract token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      toast({
        title: 'Setup Token Required',
        description: 'A valid setup token is required to access this page.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [navigate, toast]);

  // Validate token and load setup status
  useEffect(() => {
    if (!token) return;

    const validateAndLoadSetup = async () => {
      try {
        setIsLoading(true);

        // Validate token
        const tokenResponse = await get(`/api/setup/validate-token?token=${token}`);
        setTokenValid(tokenResponse.data.data.valid); // API wraps response in data.data structure

        if (!tokenResponse.data.data.valid) {
          toast({
            title: 'Invalid Setup Token',
            description: 'The setup token is invalid or has expired.',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        // Load setup status
        const statusResponse = await get('/api/setup/status');
        setSetupStatus(statusResponse.data.data); // API wraps response in data.data structure

        if (!statusResponse.data.data.isFirstTimeSetup) {
          toast({
            title: 'Setup Already Complete',
            description: 'This platform has already been configured.',
          });
          navigate('/dashboard');
          return;
        }

      } catch (error) {
        console.error('Setup validation error:', error);
        toast({
          title: 'Setup Error',
          description: 'Failed to validate setup token. Please try again.',
          variant: 'destructive',
        });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    validateAndLoadSetup();
  }, [token, navigate, toast]);

  // Test database connection
  const testConnection = async () => {
    if (!token) return;

    try {
      setConnectionTesting(true);
      setConnectionResult(null);

      const response = await post(`/api/setup/test-connection?token=${token}`, {
        database: wizardData.database
      });

      setConnectionResult(response.data);
      
      if (response.data.success) {
        toast({
          title: 'Connection Successful',
          description: response.data.message,
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: response.data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Connection test error:', error);
      toast({
        title: 'Connection Test Failed',
        description: 'Failed to test database connection.',
        variant: 'destructive',
      });
    } finally {
      setConnectionTesting(false);
    }
  };

  // Complete setup
  const completeSetup = async () => {
    if (!token) return;

    try {
      setIsCompleting(true);

      const response = await post(`/api/setup/complete?token=${token}`, wizardData);

      toast({
        title: 'Setup Complete!',
        description: 'Your Eternally Yours RSVP Platform has been configured successfully. The server will restart now.',
      });

      // Show restart message
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 3000);

    } catch (error) {
      console.error('Setup completion error:', error);
      toast({
        title: 'Setup Failed',
        description: 'Failed to complete setup. Please check your configuration and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <Spinner />
              <span>Validating setup token...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenValid === false || !setupStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
              <h2 className="text-xl font-semibold">Invalid Setup Token</h2>
              <p className="text-muted-foreground">
                The setup token is invalid or has expired. Please check your server logs for a new setup link.
              </p>
              <Button onClick={() => navigate('/')}>
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Rocket className="h-12 w-12 text-primary mr-4" />
              <div>
                <h1 className="text-4xl font-bold">Welcome to Eternally Yours RSVP Platform</h1>
                <p className="text-xl text-muted-foreground mt-2">
                  Let's set up your wedding management platform
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              First Time Setup • Zero Configuration Required
            </Badge>
          </div>

          {/* Setup Wizard */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Platform Configuration
              </CardTitle>
              <CardDescription>
                Configure your platform with a few simple steps. All settings will be saved automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Database Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Database Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant={wizardData.database.type === 'postgresql' ? 'default' : 'outline'}
                    onClick={() => setWizardData(prev => ({
                      ...prev,
                      database: { ...prev.database, type: 'postgresql' }
                    }))}
                    className="p-4 h-auto flex flex-col items-start"
                  >
                    <span className="font-semibold">PostgreSQL</span>
                    <span className="text-sm text-muted-foreground">Enterprise database</span>
                  </Button>
                  <Button
                    variant={wizardData.database.type === 'sqlite' ? 'default' : 'outline'}
                    onClick={() => setWizardData(prev => ({
                      ...prev,
                      database: { ...prev.database, type: 'sqlite' }
                    }))}
                    className="p-4 h-auto flex flex-col items-start"
                  >
                    <span className="font-semibold">SQLite</span>
                    <span className="text-sm text-muted-foreground">File-based database</span>
                  </Button>
                  <Button
                    variant={wizardData.database.type === 'supabase' ? 'default' : 'outline'}
                    onClick={() => setWizardData(prev => ({
                      ...prev,
                      database: { ...prev.database, type: 'supabase' }
                    }))}
                    className="p-4 h-auto flex flex-col items-start"
                  >
                    <span className="font-semibold">Supabase</span>
                    <span className="text-sm text-muted-foreground">Cloud database</span>
                  </Button>
                </div>

                {/* Database connection fields based on type */}
                {wizardData.database.type === 'postgresql' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-sm font-medium">Host</label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Server address where your PostgreSQL database is hosted. Use 'localhost' if running on the same machine.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <input
                        type="text"
                        className="w-full p-2 border rounded"
                        placeholder="localhost"
                        value={wizardData.database.host || ''}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          database: { ...prev.database, host: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-sm font-medium">Port</label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Port number for database connection. PostgreSQL default is 5432.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <input
                        type="number"
                        className="w-full p-2 border rounded"
                        placeholder="5432"
                        value={wizardData.database.port || ''}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          database: { ...prev.database, port: parseInt(e.target.value) || undefined }
                        }))}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-sm font-medium">Database Name</label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Name of the database to store your RSVP data. Create this database first in PostgreSQL.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <input
                        type="text"
                        className="w-full p-2 border rounded"
                        placeholder="rsvp_platform"
                        value={wizardData.database.database || ''}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          database: { ...prev.database, database: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-sm font-medium">Username</label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">PostgreSQL username with read/write access to your database.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <input
                        type="text"
                        className="w-full p-2 border rounded"
                        placeholder="username"
                        value={wizardData.database.username || ''}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          database: { ...prev.database, username: e.target.value }
                        }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-sm font-medium">Password</label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Password for the PostgreSQL user. Keep this secure and use a strong password.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <input
                        type="password"
                        className="w-full p-2 border rounded"
                        placeholder="password"
                        value={wizardData.database.password || ''}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          database: { ...prev.database, password: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                )}

                {wizardData.database.type === 'sqlite' && (
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <label className="block text-sm font-medium">Database File Path</label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Path where SQLite database file will be created. Relative to project folder.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      placeholder="./database.sqlite"
                      value={wizardData.database.path || ''}
                      onChange={(e) => setWizardData(prev => ({
                        ...prev,
                        database: { ...prev.database, path: e.target.value }
                      }))}
                    />
                  </div>
                )}

                {wizardData.database.type === 'supabase' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-sm font-medium">Project URL</label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Your Supabase project URL from the project settings dashboard.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <input
                        type="url"
                        className="w-full p-2 border rounded"
                        placeholder="https://your-project.supabase.co"
                        value={wizardData.database.url || ''}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          database: { ...prev.database, url: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-sm font-medium">Anonymous Key</label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Public anonymous key from Supabase project settings. Safe for client-side use.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <input
                        type="text"
                        className="w-full p-2 border rounded"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={wizardData.database.anonKey || ''}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          database: { ...prev.database, anonKey: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-sm font-medium">Service Role Key</label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Private service role key from Supabase. Keep this secure - it has admin access.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <input
                        type="text"
                        className="w-full p-2 border rounded"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={wizardData.database.serviceRoleKey || ''}
                        onChange={(e) => setWizardData(prev => ({
                          ...prev,
                          database: { ...prev.database, serviceRoleKey: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                )}

                {/* Test Connection */}
                <div className="flex items-center gap-4">
                  <Button
                    onClick={testConnection}
                    disabled={connectionTesting}
                    variant="outline"
                  >
                    {connectionTesting && <Spinner className="mr-2 h-4 w-4" />}
                    Test Connection
                  </Button>
                  
                  {connectionResult && (
                    <div className={`flex items-center gap-2 ${connectionResult.success ? 'text-green-600' : 'text-red-600'}`}>
                      {connectionResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span className="text-sm">{connectionResult.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Start Notice */}
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Quick Start:</strong> You can complete setup with just database configuration. 
                  Email and storage settings can be configured later through the admin panel.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Complete Setup */}
          <div className="text-center">
            <Button
              onClick={completeSetup}
              disabled={isCompleting}
              size="lg"
              className="px-8"
            >
              {isCompleting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Setting up platform...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Complete Setup
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              This will create your configuration and restart the server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}