import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Shield, CheckCircle } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Password confirmation is required")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

export default function ChangePasswordPage() {
  const { user, changePassword, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [changeError, setChangeError] = React.useState<string>("");

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Redirect to dashboard if password change is not required
  React.useEffect(() => {
    if (!isLoading && user && !user.passwordChangeRequired) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  const onSubmit = async (values: PasswordChangeFormValues) => {
    try {
      setChangeError("");
      await changePassword(values.currentPassword, values.newPassword, values.confirmPassword);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to change password. Please try again.";
      setChangeError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Password Change Failed",
        description: errorMessage,
      });
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render if user is not authenticated or doesn't need password change
  if (!user || !user.passwordChangeRequired) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Password Change Required
            </CardTitle>
            <CardDescription className="text-gray-600">
              For security reasons, you must change your password before continuing.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Alert className="mb-6 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Security Notice:</strong> This is your first login as platform administrator. 
                Please create a strong, unique password to secure your account.
              </AlertDescription>
            </Alert>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {changeError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{changeError}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <Label htmlFor="currentPassword" className="text-sm font-medium">
                        Current Password*
                      </Label>
                      <FormControl>
                        <Input
                          id="currentPassword"
                          type="password"
                          autoComplete="current-password"
                          placeholder="Enter your current password"
                          className="mt-1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <Label htmlFor="newPassword" className="text-sm font-medium">
                        New Password*
                      </Label>
                      <FormControl>
                        <Input
                          id="newPassword"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Enter your new password"
                          className="mt-1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>At least 8 characters</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>One uppercase letter</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>One lowercase letter</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>One number and one special character</span>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">
                        Confirm New Password*
                      </Label>
                      <FormControl>
                        <Input
                          id="confirmPassword"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Confirm your new password"
                          className="mt-1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition duration-200"
                  loading={form.formState.isSubmitting}
                  loadingText="Changing Password..."
                >
                  Change Password
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Need help? Contact platform support
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}