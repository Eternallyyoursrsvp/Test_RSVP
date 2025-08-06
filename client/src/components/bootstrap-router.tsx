/**
 * Bootstrap Router
 * 
 * Detects bootstrap mode and redirects to setup wizard automatically.
 * Only shows the main app after setup is complete.
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Spinner } from '@/components/ui/spinner';
import { get } from '@/lib/api-utils';
import ImmersiveLanding from '@/pages/immersive-landing';

interface BootstrapStatus {
  isFirstTimeSetup: boolean;
  hasValidConfig: boolean;
  isBootstrapMode: boolean;
  setupTokenActive: boolean;
}

export default function BootstrapRouter() {
  const [, setLocation] = useLocation();
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkBootstrapStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check setup status
        const response = await get<BootstrapStatus>('/api/setup/status');
        const status = response.data;
        
        setBootstrapStatus(status);

        // If in bootstrap mode, redirect to setup wizard
        if (status.isBootstrapMode && status.isFirstTimeSetup) {
          // Generate a new setup token and redirect
          console.log('🔧 Bootstrap mode detected - redirecting to setup wizard');
          
          // The server logs should contain the magic link with token
          // For now, redirect to a generic setup page that will get the token
          setLocation('/setup');
          return;
        }

        // If setup is complete, show the main app
        console.log('✅ Setup complete - showing main application');
        
      } catch (err: any) {
        console.error('Bootstrap status check failed:', err);
        setError(err.message || 'Failed to check setup status');
        
        // If API call fails, assume setup is needed
        setLocation('/setup');
      } finally {
        setIsLoading(false);
      }
    };

    checkBootstrapStatus();
  }, [setLocation]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <p className="text-muted-foreground">Checking setup status...</p>
        </div>
      </div>
    );
  }

  // Error state - redirect to setup
  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-500">Setup check failed: {error}</p>
          <p className="text-muted-foreground">Redirecting to setup...</p>
        </div>
      </div>
    );
  }

  // If we get here, setup is complete - show main app
  return <ImmersiveLanding />;
}