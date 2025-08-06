import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect to dashboard if already logged in
  React.useEffect(() => {
    if (user && !isLoading) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen">
      <div className="login-bg w-0 md:w-1/2 lg:w-2/3 bg-cover bg-center bg-[url('https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')]"></div>

      <div className="w-full md:w-1/2 lg:w-1/3 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="font-script text-5xl text-primary mb-2">Eternally Yours</h1>
            <p className="font-playfair text-neutral text-xl">Wedding Management Suite</p>
          </div>
          
          <LoginForm />
          
          <div className="mt-6 text-center text-sm">
            <p>Don't have an account? <a href="#" className="text-primary font-medium">Contact your administrator</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
