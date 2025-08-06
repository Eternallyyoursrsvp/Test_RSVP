import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useAnnouncer, aria } from "@/utils/accessibility";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { login } = useAuth();
  const { toast } = useToast();
  const announce = useAnnouncer();
  const [loginError, setLoginError] = React.useState<string>("");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setLoginError("");
      announce("Attempting to sign in...", "polite");
      
      // Attempting login
      await login(values.username, values.password);
      announce("Successfully signed in", "polite");
    } catch (error) {
      // Login error handled
      const errorMessage = "Please check your username and password and try again.";
      setLoginError(errorMessage);
      
      announce(`Login failed. ${errorMessage}`, "assertive");
      
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage,
      });
      
      // Focus back to username field for retry
      const usernameField = document.getElementById("username");
      if (usernameField) {
        usernameField.focus();
      }
    }
  };

  const formErrorId = aria.generateId("form-error");

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className="space-y-6"
        role="form"
        aria-labelledby="login-title"
        aria-describedby={loginError ? formErrorId : undefined}
        noValidate
      >
        <h2 id="login-title" className="sr-only">
          Login Form
        </h2>

        {/* Global form error */}
        {loginError && (
          <div
            id={formErrorId}
            role="alert"
            aria-live="assertive"
            className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md"
          >
            {loginError}
          </div>
        )}

        <FormField
          control={form.control}
          name="username"
          render={({ field, fieldState }) => (
            <FormItem>
              <Label 
                htmlFor="username" 
                className="block text-foreground text-sm font-medium mb-2"
              >
                Username*
              </Label>
              <FormControl>
                <Input
                  id="username"
                  autoComplete="username"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your username"
                  error={fieldState.error?.message}
                  isInvalid={!!fieldState.error}
                  helperText="Enter the username for your account"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormItem>
              <Label 
                htmlFor="password" 
                className="block text-foreground text-sm font-medium mb-2"
              >
                Password*
              </Label>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your password"
                  error={fieldState.error?.message}
                  isInvalid={!!fieldState.error}
                  helperText="Enter the password for your account"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox
                    id="remember-me"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    aria-describedby="remember-me-desc"
                  />
                </FormControl>
                <div>
                  <Label
                    htmlFor="remember-me"
                    className="text-sm text-foreground cursor-pointer"
                  >
                    Remember me
                  </Label>
                  <p id="remember-me-desc" className="text-xs text-muted-foreground sr-only">
                    Keep me signed in on this device
                  </p>
                </div>
              </FormItem>
            )}
          />

          <div className="text-sm">
            <a 
              href="#forgot-password" 
              className="font-medium text-primary hover:text-opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
              aria-label="Reset your password"
            >
              Forgot password?
            </a>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full gold-gradient text-white font-medium py-2 px-4 rounded-lg shadow hover:shadow-lg transition duration-200"
          loading={form.formState.isSubmitting}
          loadingText="Signing in..."
          aria-describedby="submit-help"
        >
          Sign in
        </Button>
        
        <p id="submit-help" className="text-xs text-muted-foreground text-center sr-only">
          Click to sign in to your account
        </p>

        {/* Screen reader instructions */}
        <div className="sr-only" aria-live="polite">
          <p>
            This form requires a username and password. 
            Fields marked with an asterisk (*) are required.
            Use Tab to navigate between fields and Enter to submit.
          </p>
        </div>
      </form>
    </Form>
  );
}
