import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions, Permission } from '@/hooks/use-permissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, Lock, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission | Permission[];
  requiredRole?: string | string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
  fallback,
  redirectTo = '/dashboard'
}) => {
  const { user, isLoading: authLoading } = useAuth();
  const { hasPermission, hasRole, isLoading: permissionsLoading } = usePermissions();

  // Show loading while checking authentication and permissions
  if (authLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // User not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md w-full space-y-6 p-6">
          <Alert className="border-yellow-200 bg-yellow-50">
            <Shield className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Please log in to access this page.
            </AlertDescription>
          </Alert>
          <div className="text-center">
            <Link href="/auth">
              <Button>
                Go to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check role requirements
  if (requiredRole && !hasRole(requiredRole)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md w-full space-y-6 p-6">
          <Alert className="border-red-200 bg-red-50">
            <Lock className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              You don't have the required role to access this page.
              <br />
              <span className="text-sm font-medium">
                Required: {Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}
              </span>
            </AlertDescription>
          </Alert>
          <div className="flex space-x-3">
            <Link href={redirectTo}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check permission requirements
  if (requiredPermission && !hasPermission(requiredPermission)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md w-full space-y-6 p-6">
          <Alert className="border-red-200 bg-red-50">
            <Lock className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              You don't have the required permissions to access this page.
              <br />
              <span className="text-sm font-medium">
                Required: {Array.isArray(requiredPermission) 
                  ? requiredPermission.join(' or ') 
                  : requiredPermission}
              </span>
            </AlertDescription>
          </Alert>
          <div className="flex space-x-3">
            <Link href={redirectTo}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // User has required permissions/roles
  return <>{children}</>;
};

// Convenience components for common permission patterns
export const AdminOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="admin">
    {children}
  </ProtectedRoute>  
);

export const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole={['admin', 'staff']}>
    {children}
  </ProtectedRoute>
);

export const EventManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredPermission={['events:manage', 'events:create', 'events:update']}>
    {children}
  </ProtectedRoute>
);

export const GuestManagerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredPermission={['guests:create', 'guests:update', 'guests:import']}>
    {children}
  </ProtectedRoute>
);

export const AnalyticsRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredPermission="analytics:read">
    {children}
  </ProtectedRoute>
);

export const SystemAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredPermission={['system:admin', 'system:monitor']}>
    {children}
  </ProtectedRoute>
);

export const RBACRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredPermission="system:rbac">
    {children}
  </ProtectedRoute>
);