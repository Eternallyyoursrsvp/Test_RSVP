import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect based on user state and password change requirement
  React.useEffect(() => {
    if (user && !isLoading) {
      // Check if password change is required before redirecting
      if (user.passwordChangeRequired) {
        setLocation("/change-password");
      } else {
        setLocation("/dashboard");
      }
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
      {/* Hero section (right side) */}
      <div className="w-0 md:w-1/2 lg:w-2/3 bg-gradient-to-r from-purple-800 via-purple-900 to-indigo-900 hidden md:flex md:flex-col md:justify-center md:items-center text-white p-10">
        <div className="max-w-2xl text-center">
          <h1 className="font-script text-5xl mb-6">Eternally Yours</h1>
          <h2 className="font-playfair text-3xl mb-6">Wedding Management Suite</h2>
          <p className="text-xl mb-8">
            Manage your Indian wedding events with ease. From guest lists to ceremonies, 
            accommodations to meal preferences - all in one beautiful platform.
          </p>
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
              <div className="text-4xl font-bold mb-2">Elegant</div>
              <div className="text-sm">Guest Management</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
              <div className="text-4xl font-bold mb-2">Complete</div>
              <div className="text-sm">Event Planning</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
              <div className="text-4xl font-bold mb-2">Seamless</div>
              <div className="text-sm">Experience</div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth forms (left side) */}
      <div className="w-full md:w-1/2 lg:w-1/3 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-script text-5xl text-primary mb-2">Eternally Yours</h1>
            <p className="font-playfair text-neutral text-xl">Wedding Management Suite</p>
          </div>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            
            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}