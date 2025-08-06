import React from 'react';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

interface DeploymentLoadingStateProps {
  message?: string;
  timeout?: number;
  showNetworkStatus?: boolean;
}

export function DeploymentLoadingState({ 
  message = "Loading...", 
  timeout = 15000,
  showNetworkStatus = true 
}: DeploymentLoadingStateProps) {
  const [showSlowWarning, setShowSlowWarning] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSlowWarning(true);
    }, timeout);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [timeout]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-6 space-y-4">
      <div className="relative">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        
        {showNetworkStatus && (
          <div className="absolute -top-1 -right-1">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
          </div>
        )}
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-gray-900">
          {message}
        </p>
        
        {showSlowWarning && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500">
              Taking longer than expected...
            </p>
            <p className="text-xs text-gray-400">
              {!isOnline ? 
                'Network connection lost. Please check your internet.' :
                'Deployment server may be starting up. Please wait.'
              }
            </p>
          </div>
        )}
      </div>

      {showSlowWarning && isOnline && (
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-purple-600 hover:text-purple-800 underline"
        >
          Reload page
        </button>
      )}
    </div>
  );
}

// Enhanced loading component for event-specific operations
export function EventLoadingState({ eventName }: { eventName?: string }) {
  return (
    <DeploymentLoadingState
      message={`Loading ${eventName ? `"${eventName}"` : 'events'}...`}
      timeout={10000}
    />
  );
}

// Loading state for wizard steps
export function WizardLoadingState({ step }: { step?: string }) {
  return (
    <DeploymentLoadingState
      message={`Loading ${step ? `${step} step` : 'wizard'}...`}
      timeout={8000}
    />
  );
}