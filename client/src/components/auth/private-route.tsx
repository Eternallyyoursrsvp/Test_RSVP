import React, { ReactNode } from "react";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface PrivateRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function PrivateRoute({ 
  children, 
  allowedRoles = ["admin", "staff", "couple"] 
}: PrivateRouteProps) {
  try {
    const { user, isLoading } = useAuth();
    const [, setLocation] = useLocation();
    
    // Show loading state while checking authentication
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }
    
    // Redirect to auth page if not authenticated
    if (!user) {
      return <Redirect to="/auth" />;
    }
    
    // Check if user has required role
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="p-8 max-w-md w-full bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="mb-4">Access to this page is restricted.</p>
            <button 
              onClick={() => setLocation("/dashboard")}
              className="px-4 py-2 text-white bg-primary rounded-md"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    
    // If authenticated and authorized, render the children
    return <>{children}</>;
  } catch (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-8 max-w-md w-full bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <p className="mb-4">An error occurred during authentication.</p>
        </div>
      </div>
    );
  }
}