import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface DeploymentErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  const isNetworkError = error.message.includes('Failed to fetch') || 
                        error.message.includes('timeout') ||
                        error.message.includes('Network');
  
  const isServerError = error.message.includes('500') ||
                       error.message.includes('Server error');

  return (
    <div className="flex items-center justify-center min-h-[200px] p-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900">
            {isNetworkError ? 'Connection Issue' : 
             isServerError ? 'Server Issue' : 
             'Something went wrong'}
          </h3>
          
          <p className="text-sm text-gray-600">
            {isNetworkError ? 
              'Unable to connect to the server. This may be due to deployment network latency.' :
             isServerError ?
              'The server encountered an error. This may be temporary during deployment.' :
              'An unexpected error occurred while loading the application.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button 
            onClick={retry}
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          
          <Button 
            onClick={() => window.location.reload()}
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </Button>
        </div>

        {(isNetworkError || isServerError) && (
          <p className="text-xs text-gray-500 mt-4">
            If the issue persists, the deployment may be starting up. Please wait a moment and try again.
          </p>
        )}
      </div>
    </div>
  );
}

export function DeploymentErrorBoundary({ children, fallback: Fallback = DefaultErrorFallback }: DeploymentErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <Fallback error={error} retry={resetErrorBoundary} />
      )}
      onError={(error, errorInfo) => {
        console.error('Deployment Error Boundary caught an error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Hook for deployment-aware error handling in components
export function useDeploymentErrorHandler() {
  const handleError = (error: unknown) => {
    if (error instanceof Error) {
      // Log deployment-specific errors for debugging
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('timeout') ||
          error.message.includes('Network')) {
        console.warn('Deployment network issue detected:', error.message);
      }
      
      if (error.message.includes('500') || 
          error.message.includes('Server error')) {
        console.warn('Deployment server issue detected:', error.message);
      }
    }
  };

  return { handleError };
}