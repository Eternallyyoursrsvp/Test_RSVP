import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { put } from "@/lib/api-utils";
import { AlertCircle, CheckCircle2, Mail, HelpCircle, Loader2, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface OAuthCredentials {
  // Gmail
  gmailClientId?: string;
  gmailClientSecret?: string;
  gmailRedirectUri?: string;
  gmailAccount?: string;
  // Gmail Direct SMTP (alternative to OAuth)
  useGmailDirectSMTP?: boolean;
  gmailPassword?: string;
  gmailSmtpHost?: string;
  gmailSmtpPort?: number;
  gmailSmtpSecure?: boolean;
  // Outlook
  outlookClientId?: string;
  outlookClientSecret?: string;
  outlookRedirectUri?: string;
  // SendGrid
  sendGridApiKey?: string;
  // General email settings
  emailFrom?: string;
  emailReplyTo?: string;
  // Provider flags
  useGmail?: boolean;
  useOutlook?: boolean;
  useSendGrid?: boolean;
}

interface OAuthConfigurationProps {
  settings: any;
  eventId: number | undefined;
}

export default function OAuthConfiguration({ settings, eventId }: OAuthConfigurationProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get the current domain dynamically for OAuth redirects
  const getCurrentDomain = () => {
    return window.location.origin;
  };
  
  const REPLIT_DOMAIN = getCurrentDomain();
  const DEFAULT_GMAIL_REDIRECT_URI = `${REPLIT_DOMAIN}/api/oauth/gmail/callback`;
  const DEFAULT_OUTLOOK_REDIRECT_URI = `${REPLIT_DOMAIN}/api/oauth/outlook/callback`;
  
  const [credentials, setCredentials] = useState<OAuthCredentials>({
    // Set initial values from the settings if available
    gmailClientId: settings?.gmailClientId || "",
    gmailClientSecret: settings?.gmailClientSecret || "",
    gmailRedirectUri: settings?.gmailRedirectUri || DEFAULT_GMAIL_REDIRECT_URI,
    gmailAccount: settings?.gmailAccount || "",
    
    // Direct SMTP configuration for Gmail
    useGmailDirectSMTP: settings?.useGmailDirectSMTP || false,
    gmailPassword: settings?.gmailPassword || "",
    gmailSmtpHost: settings?.gmailSmtpHost || "smtp.gmail.com",
    gmailSmtpPort: settings?.gmailSmtpPort || 587,
    gmailSmtpSecure: settings?.gmailSmtpSecure || false,

    outlookClientId: settings?.outlookClientId || "",
    outlookClientSecret: settings?.outlookClientSecret || "",
    outlookRedirectUri: settings?.outlookRedirectUri || DEFAULT_OUTLOOK_REDIRECT_URI,

    sendGridApiKey: settings?.sendGridApiKey || "",

    emailFrom: settings?.emailFrom || "",
    emailReplyTo: settings?.emailReplyTo || "",

    useGmail: settings?.useGmail || false,
    useOutlook: settings?.useOutlook || false,
    useSendGrid: settings?.useSendGrid || false,
  });

  const [isConfiguring, setIsConfiguring] = useState({
    gmail: false,
    outlook: false
  });
  
  const [isTesting, setIsTesting] = useState({
    gmail: false,
    outlook: false,
    sendgrid: false
  });
  
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    provider?: string;
  }>({});

  // Mutation to update the OAuth credentials
  const updateCredentialsMutation = useMutation({
    mutationFn: async (data: OAuthCredentials) => {
      if (!eventId) throw new Error("Event ID is required");

      const res = await put(`/api/event-settings/${eventId}/settings`, { oauth: data });
      return res.data;
    },
    onSuccess: () => {
      // Determine which providers were enabled
      const enabledProviders = [];
      if (credentials.useGmail) enabledProviders.push("Gmail");
      if (credentials.useOutlook) enabledProviders.push("Outlook");
      if (credentials.useSendGrid) enabledProviders.push("SendGrid");

      const providersText = enabledProviders.length > 0
        ? `Enabled providers: ${enabledProviders.join(", ")}.`
        : "No email providers currently enabled.";

      toast({
        title: "Configuration updated",
        description: `Email provider settings have been saved successfully. ${providersText}`,
      });

      // Provide guidance on next steps if OAuth providers are enabled
      if (credentials.useGmail && hasCredentials("gmail") && !settings?.gmailAccount) {
        toast({
          title: "Gmail Setup Required",
          description: "Gmail credentials saved. Click the 'Configure Gmail OAuth' button to connect your Gmail account.",
        });
      }

      if (credentials.useOutlook && hasCredentials("outlook") && !settings?.outlookAccount) {
        toast({
          title: "Outlook Setup Required",
          description: "Outlook credentials saved. Click the 'Configure Outlook OAuth' button to connect your Outlook account.",
        });
      }

      // Invalidate the settings query to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/event-settings/${eventId}/settings`] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setCredentials((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate the form before submission
    const gmailErrors = credentials.useGmail ? getValidationErrors("gmail") : [];
    const outlookErrors = credentials.useOutlook ? getValidationErrors("outlook") : [];
    const sendGridErrors = credentials.useSendGrid && !credentials.sendGridApiKey ? ["SendGrid API Key is required"] : [];

    const allErrors = [...gmailErrors, ...outlookErrors, ...sendGridErrors];

    if (allErrors.length > 0) {
      toast({
        title: "Validation Errors",
        description: "Please fix the highlighted errors before saving",
        variant: "destructive",
      });
      return;
    }

    // If using both Gmail and Outlook, check if they have complete credentials
    if (credentials.useGmail && credentials.useOutlook) {
      if (!hasCredentials("gmail") || !hasCredentials("outlook")) {
        toast({
          title: "Incomplete Configuration",
          description: "Please complete the credentials for all enabled email providers",
          variant: "destructive",
        });
        return;
      }
    }

    // All validations passed, save the configuration
    updateCredentialsMutation.mutate(credentials);
  };

  // Handle OAuth configuration
  const handleOAuthSetup = async (provider: 'gmail' | 'outlook') => {
    if (!eventId) {
      toast({
        title: "Error",
        description: "Event ID is required",
        variant: "destructive"
      });
      return;
    }

    // Ensure the credentials are saved first before initiating OAuth
    if (!hasCredentials(provider)) {
      toast({
        title: `Missing ${provider === 'gmail' ? 'Gmail' : 'Outlook'} Credentials`,
        description: `Please enter your Client ID and Client Secret for ${provider === 'gmail' ? 'Gmail' : 'Outlook'} and save your changes before configuring OAuth.`,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsConfiguring(prev => ({ ...prev, [provider]: true }));

      // Save current credentials to ensure we're using the latest values
      await updateCredentialsMutation.mutateAsync(credentials);

      // Get the authorization URL
      const response = await fetch(`/api/oauth/${provider}/authorize?eventId=${eventId}`);
      const data = await response.json();

      if (!response.ok) {
        if (data.code === "MISSING_CLIENT_ID") {
          throw new Error(`Missing ${provider} credentials. Please save your Client ID and Client Secret first.`);
        } else {
          throw new Error(data.message || `Failed to initiate ${provider} authorization`);
        }
      }

      // Open the authorization URL in a popup
      const authWindow = window.open(
        data.authUrl,
        `${provider}Auth`,
        'width=600,height=700'
      );

      if (!authWindow) {
        throw new Error(`Popup blocked! Please allow popups for this site to configure ${provider}.`);
      }

      // Poll for completion
      const checkInterval = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkInterval);
          setIsConfiguring(prev => ({ ...prev, [provider]: false }));

          // Refresh settings to show the updated state
          queryClient.invalidateQueries({ queryKey: [`/api/event-settings/${eventId}/settings`] });
          
          // Verify if the connection was successful after a short delay
          setTimeout(() => {
            handleTestConnection(provider);
          }, 1500);
        }
      }, 1000);

    } catch (error) {
      // OAuth setup error - handled silently
      toast({
        title: `${provider === 'gmail' ? 'Gmail' : 'Outlook'} Configuration Failed`,
        description: error instanceof Error ? error.message : `Failed to configure ${provider}`,
        variant: "destructive"
      });
      setIsConfiguring(prev => ({ ...prev, [provider]: false }));
    }
  };


  // Handler for testing email connection
  const handleTestConnection = async (provider: 'gmail' | 'outlook' | 'sendgrid') => {
    if (!eventId) {
      toast({
        title: "Error",
        description: "Event ID is required",
        variant: "destructive"
      });
      return;
    }

    // Check if provider is enabled
    if ((provider === 'gmail' && !credentials.useGmail) ||
        (provider === 'outlook' && !credentials.useOutlook) ||
        (provider === 'sendgrid' && !credentials.useSendGrid)) {
      toast({
        title: `${provider === 'gmail' ? 'Gmail' : provider === 'outlook' ? 'Outlook' : 'SendGrid'} Not Enabled`,
        description: `Please enable ${provider} in the settings before testing the connection.`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Clear previous test results
      setTestResult({});
      setIsTesting(prev => ({ ...prev, [provider]: true }));

      // For OAuth providers, check if we have credentials
      if (provider === 'gmail' || provider === 'outlook') {
        if (!hasCredentials(provider)) {
          throw new Error(`Missing ${provider} credentials. Please enter your Client ID and Client Secret first.`);
        }
      }

      // For SendGrid, check if we have API key
      if (provider === 'sendgrid' && !credentials.sendGridApiKey) {
        throw new Error('SendGrid API Key is required for testing.');
      }

      // Make request to test connection
      const response = await fetch(`/api/event-settings/${eventId}/test-email-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider })
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Failed to test ${provider} connection`);
      }

      setTestResult({
        success: result.success,
        message: result.message,
        provider: result.provider || provider
      });

      // Show toast notification
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: result.message || `Successfully connected to ${provider}`,
        });
      } else {
        // Provide more helpful error messages based on common issues
        let errorMessage = result.message || `Failed to connect to ${provider}`;
        let troubleshootingTip = '';
        
        if (provider === 'gmail' && errorMessage.includes('Invalid Credentials')) {
          troubleshootingTip = 'Try reconfiguring the OAuth connection by clicking "Configure Gmail OAuth" again.';
        } else if (provider === 'outlook' && errorMessage.includes('token')) {
          troubleshootingTip = 'The OAuth token may have expired. Try clicking "Configure Outlook OAuth" again.';
        } else if (provider === 'gmail' && credentials.useGmailDirectSMTP && errorMessage.includes('Authentication')) {
          troubleshootingTip = 'For Gmail SMTP, make sure you have enabled "Less secure app access" or are using an app password.';
        }
        
        toast({
          title: "Connection Failed",
          description: errorMessage + (troubleshootingTip ? `\n\nTroubleshooting tip: ${troubleshootingTip}` : ''),
          variant: "destructive"
        });
      }
    } catch (error) {
      // Connection test error - handled silently
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : `Failed to test ${provider} connection`,
        provider
      });
      
      toast({
        title: "Connection Test Failed",
        description: error instanceof Error ? error.message : `An error occurred testing the ${provider} connection`,
        variant: "destructive"
      });
    } finally {
      setIsTesting(prev => ({ ...prev, [provider]: false }));
    }
  };

  // Helper to check if credentials are filled for a service
  const hasCredentials = (service: "gmail" | "outlook") => {
    if (service === "gmail") {
      // Check if we're using direct SMTP
      if (credentials.useGmailDirectSMTP) {
        return !!credentials.gmailPassword;
      } else {
        // Standard OAuth validation
        return !!credentials.gmailClientId && !!credentials.gmailClientSecret;
      }
    } else if (service === "outlook") {
      return !!credentials.outlookClientId && !!credentials.outlookClientSecret;
    }
    return false;
  };

  // Helper to validate redirect URIs
  const validateRedirectUri = (uri: string | undefined): boolean => {
    if (!uri) return true; // Empty is valid (will use default)
    try {
      const url = new URL(uri);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      return false;
    }
  };

  // Get validation errors for display
  const getValidationErrors = (service: "gmail" | "outlook") => {
    const errors: string[] = [];

    if (service === "gmail" && credentials.useGmail) {
      // If using direct SMTP access, we only need the password
      if (credentials.useGmailDirectSMTP) {
        if (!credentials.gmailPassword) {
          errors.push("Gmail password is required when using direct SMTP access");
        }
      } else {
        // Standard OAuth validation
        if (!credentials.gmailClientId) errors.push("Client ID is required");
        if (!credentials.gmailClientSecret) errors.push("Client Secret is required");
        if (credentials.gmailRedirectUri && !validateRedirectUri(credentials.gmailRedirectUri)) {
          errors.push("Redirect URI must be a valid URL with http:// or https:// protocol");
        }
      }
    } else if (service === "outlook" && credentials.useOutlook) {
      if (!credentials.outlookClientId) errors.push("Client ID is required");
      if (!credentials.outlookClientSecret) errors.push("Client Secret is required");
      if (credentials.outlookRedirectUri && !validateRedirectUri(credentials.outlookRedirectUri)) {
        errors.push("Redirect URI must be a valid URL with http:// or https:// protocol");
      }
    }

    return errors;
  };

  // Display connected account info
  const renderConnectedAccount = (provider: "gmail" | "outlook") => {
    const account =
      provider === "gmail"
        ? settings?.gmailAccount
        : provider === "outlook"
          ? settings?.outlookAccount
          : null;

    if (!account) return null;

    // Check for valid connection for Gmail using direct SMTP
    let isConnectionActive = true;
    if (provider === "gmail" && settings?.useGmailDirectSMTP) {
      // For direct SMTP, check if password exists
      isConnectionActive = !!settings?.gmailPassword;
    } else if (provider === "gmail") {
      // For OAuth, check if we have the necessary tokens
      isConnectionActive = !!settings?.gmailRefreshToken && 
        (!!settings?.gmailAccessToken || !!process.env.GMAIL_ACCESS_TOKEN);
    } else if (provider === "outlook") {
      // For Outlook, check if we have the necessary tokens
      isConnectionActive = !!settings?.outlookRefreshToken && 
        (!!settings?.outlookAccessToken || !!process.env.OUTLOOK_ACCESS_TOKEN);
    }

    const statusVariant = isConnectionActive ? "default" : "destructive";
    const statusTitle = isConnectionActive ? "Connected Account" : "Connection Issue";
    const statusIcon = isConnectionActive ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />;

    return (
      <Alert className="mt-4" variant={statusVariant}>
        {statusIcon}
        <AlertTitle>{statusTitle}</AlertTitle>
        <AlertDescription>
          {provider.charAt(0).toUpperCase() + provider.slice(1)} {isConnectionActive ? "is connected" : "account exists but may have connection issues"} using{" "}
          <strong>{account}</strong>
          {!isConnectionActive && provider === "gmail" && settings?.useGmailDirectSMTP && (
            <div className="mt-2 text-xs">
              Please check that your Gmail password is correct and that "Less secure app access" is enabled 
              or an app-specific password is being used.
            </div>
          )}
          {!isConnectionActive && !settings?.useGmailDirectSMTP && (
            <div className="mt-2 text-xs">
              The OAuth token may have expired. Try clicking the "Configure {provider === "gmail" ? "Gmail" : "Outlook"} OAuth" button again.
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Email Provider Configuration</CardTitle>
        <CardDescription>
          Configure your OAuth credentials and email providers for sending communications
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-6 space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <Mail className="h-4 w-4 mr-2 text-blue-600" />
            <AlertTitle className="text-blue-800">Email Configuration Overview</AlertTitle>
            <AlertDescription className="text-blue-700">
              <p className="mt-1">Configure your email provider to send invitations, RSVP confirmations, and other communications to guests.</p>
              <p className="mt-2 font-medium">You have the following options:</p>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-md border border-blue-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-100 p-1.5 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/><path d="M12 11h4"/><path d="M12 7h4"/><path d="M8 15h8"/><path d="M8 19h8"/><circle cx="8" cy="9" r="2"/></svg>
                    </div>
                    <h3 className="font-medium text-sm">Gmail OAuth</h3>
                  </div>
                  <p className="text-xs">Connect using your Google account with OAuth for secure access.</p>
                </div>
                <div className="bg-white p-3 rounded-md border border-blue-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-100 p-1.5 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="13" x="4" y="5" rx="2"/><path d="m22 10-9 2-9-2"/><path d="M20 5H9l-3 6 9 2 9-2-3-6Z"/></svg>
                    </div>
                    <h3 className="font-medium text-sm">Outlook OAuth</h3>
                  </div>
                  <p className="text-xs">Connect using Microsoft account with OAuth for secure access.</p>
                </div>
                <div className="bg-white p-3 rounded-md border border-blue-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-100 p-1.5 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="m22 5-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 5"/></svg>
                    </div>
                    <h3 className="font-medium text-sm">Direct SMTP</h3>
                  </div>
                  <p className="text-xs">Use Gmail with app password for simpler setup (2FA required).</p>
                </div>
                <div className="bg-white p-3 rounded-md border border-blue-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-100 p-1.5 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V12c0-5.5 4.5-10 10-10s10 4.5 10 10v1.2"/><path d="M4 12c0-3.3 2.7-6 6-6"/><path d="M14 12V7h1.5c1.93 0 3.5 1.57 3.5 3.5S17.43 14 15.5 14H14v-2"/></svg>
                    </div>
                    <h3 className="font-medium text-sm">SendGrid</h3>
                  </div>
                  <p className="text-xs">Use SendGrid's API for high-volume, reliable email delivery.</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <Alert className="mb-6">
            <HelpCircle className="h-4 w-4 mr-2" />
            <AlertTitle>Setup Instructions</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal ml-5 space-y-2 mt-2">
                <li><strong>First:</strong> Select your preferred email provider below</li>
                <li><strong>Second:</strong> Enter the required credentials for your chosen provider</li>
                <li><strong>Third:</strong> Save your configuration and authorize the connection</li>
                <li><strong>Finally:</strong> Test your connection to ensure emails can be sent</li>
              </ol>
              <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm font-medium text-amber-800">Configuration is specific to this event</p>
                <p className="text-xs mt-1 text-amber-700">Email settings are stored separately for each wedding event, allowing different credentials per project.</p>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <form onSubmit={handleSubmit}>

          <Tabs defaultValue="gmail" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="gmail">Gmail</TabsTrigger>
              <TabsTrigger value="outlook">Outlook</TabsTrigger>
              <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
            </TabsList>

            {/* Gmail Configuration */}
            <TabsContent value="gmail" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="useGmail"
                    name="useGmail"
                    checked={credentials.useGmail}
                    onCheckedChange={(checked) =>
                      setCredentials((prev) => ({ ...prev, useGmail: checked }))
                    }
                  />
                  <Label htmlFor="useGmail">Use Gmail for sending emails</Label>
                </div>

                {credentials.useGmail && !credentials.useGmailDirectSMTP && (
                  <Button
                    type="button"
                    onClick={() => handleOAuthSetup('gmail')}
                    disabled={isConfiguring.gmail || !hasCredentials("gmail") || updateCredentialsMutation.isPending}
                    variant="outline"
                  >
                    {isConfiguring.gmail ? "Configuring..." : "Configure Gmail OAuth"}
                  </Button>
                )}
                
                {credentials.useGmail && credentials.useGmailDirectSMTP && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Using Direct SMTP</span>
                  </div>
                )}
              </div>

              {credentials.useGmail && (
                <div className="space-y-4">
                  {/* Only show OAuth fields if Direct SMTP is NOT enabled */}
                  {!credentials.useGmailDirectSMTP && (
                    <>
                      <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                        <HelpCircle className="h-4 w-4" />
                        <AlertTitle>Gmail OAuth Setup Guide</AlertTitle>
                        <AlertDescription className="mt-2">
                          <ol className="list-decimal ml-4 space-y-1 text-sm">
                            <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" className="text-primary underline">Google Cloud Console</a></li>
                            <li>Create a new project (or select an existing one)</li>
                            <li>Navigate to "APIs & Services" → "OAuth consent screen"
                              <ul className="list-disc ml-5 mt-1">
                                <li>Select "External" user type</li>
                                <li>Fill in required app details (name, email, etc.)</li>
                                <li>Add scope: <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">https://mail.google.com/</code></li>
                                <li>Add your email as a test user</li>
                              </ul>
                            </li>
                            <li>Navigate to "APIs & Services" → "Credentials"
                              <ul className="list-disc ml-5 mt-1">
                                <li>Click "Create Credentials" → "OAuth client ID"</li>
                                <li>Select "Web application" as application type</li>
                                <li>Copy the Redirect URI from below and add it to "Authorized redirect URIs"</li>
                                <li>Copy the created Client ID and Client Secret below</li>
                              </ul>
                            </li>
                          </ol>
                        </AlertDescription>
                      </Alert>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1">
                            <Label htmlFor="gmailClientId">
                              Client ID
                              {getValidationErrors("gmail").includes("Client ID is required") && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </Label>
                            <div className="relative ml-1 group">
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              <div className="hidden group-hover:block absolute z-50 w-64 p-2 text-xs bg-secondary text-secondary-foreground rounded shadow-lg -left-8 top-5">
                                Client ID from your Google Cloud Console project. Required for OAuth authentication.
                              </div>
                            </div>
                          </div>
                          <Input
                            id="gmailClientId"
                            name="gmailClientId"
                            value={credentials.gmailClientId}
                            onChange={handleInputChange}
                            placeholder="Your Gmail OAuth Client ID"
                            className={getValidationErrors("gmail").includes("Client ID is required") ? "border-red-500" : ""}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="gmailClientSecret">
                            Client Secret
                            {getValidationErrors("gmail").includes("Client Secret is required") && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </Label>
                          <Input
                            id="gmailClientSecret"
                            name="gmailClientSecret"
                            value={credentials.gmailClientSecret}
                            onChange={handleInputChange}
                            placeholder="Your Gmail OAuth Client Secret"
                            type="password"
                            className={getValidationErrors("gmail").includes("Client Secret is required") ? "border-red-500" : ""}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Label htmlFor="gmailRedirectUri">
                            Redirect URI
                            {getValidationErrors("gmail").includes("Redirect URI must be a valid URL with http:// or https:// protocol") && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </Label>
                          <div className="relative ml-1 group">
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            <div className="hidden group-hover:block absolute z-50 w-64 p-2 text-xs bg-secondary text-secondary-foreground rounded shadow-lg -left-8 top-5">
                              This exact URL must be added to your Google Cloud Console Authorized Redirect URIs.
                            </div>
                          </div>
                        </div>
                        <div className="relative">
                          <Input
                            id="gmailRedirectUri"
                            name="gmailRedirectUri"
                            value={credentials.gmailRedirectUri || DEFAULT_GMAIL_REDIRECT_URI}
                            onChange={handleInputChange}
                            placeholder={DEFAULT_GMAIL_REDIRECT_URI}
                            className={getValidationErrors("gmail").includes("Redirect URI must be a valid URL with http:// or https:// protocol") ? "border-red-500" : ""}
                            readOnly
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => {
                              navigator.clipboard.writeText(credentials.gmailRedirectUri || DEFAULT_GMAIL_REDIRECT_URI);
                              toast({
                                title: "Copied!",
                                description: "Redirect URI copied to clipboard",
                              });
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          </Button>
                        </div>
                        <Alert className="mt-2 py-2 bg-amber-50 text-amber-800 border-amber-200">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Copy this exact URL to your Google Cloud Console under "Authorized redirect URIs"
                          </AlertDescription>
                        </Alert>
                      </div>
                    </>
                  )}

                  {/* Direct SMTP Access Option */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center space-x-2 mb-4">
                      <Switch
                        id="useGmailDirectSMTP"
                        name="useGmailDirectSMTP"
                        checked={credentials.useGmailDirectSMTP}
                        onCheckedChange={(checked) =>
                          setCredentials((prev) => ({ ...prev, useGmailDirectSMTP: checked }))
                        }
                      />
                      <Label htmlFor="useGmailDirectSMTP">Use Direct SMTP Access (Alternative to OAuth)</Label>
                    </div>
                    
                    {credentials.useGmailDirectSMTP && (
                      <div className="space-y-4">
                        <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                          <AlertTitle className="flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Direct SMTP Access
                          </AlertTitle>
                          <AlertDescription>
                            <p className="mb-2">This option lets you use your Gmail password directly for sending emails instead of OAuth.</p>
                            <p className="mb-2"><strong>Important:</strong> For this to work, you need to use an app-specific password from your Google account.</p>
                            <p className="mb-1">To create an app password:</p>
                            <ol className="list-decimal ml-5 space-y-1 text-sm">
                              <li>Go to your <a href="https://myaccount.google.com/security" target="_blank" className="text-primary underline">Google Account Security settings</a></li>
                              <li>Enable 2-Step Verification if not already enabled</li>
                              <li>Select "App passwords" under "Signing in to Google"</li>
                              <li>Create a new app password for "Mail" and "Other (Custom name)"</li>
                              <li>Enter the generated 16-character password below</li>
                            </ol>
                          </AlertDescription>
                        </Alert>
                        
                        <div className="space-y-2">
                          <Label htmlFor="gmailAccount">
                            Gmail Account (Email Address)
                          </Label>
                          <Input
                            id="gmailAccount"
                            name="gmailAccount"
                            value={credentials.gmailAccount}
                            onChange={handleInputChange}
                            placeholder="your.email@gmail.com"
                            type="email"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="gmailPassword">
                            Gmail Password or App Password
                          </Label>
                          <Input
                            id="gmailPassword"
                            name="gmailPassword"
                            value={credentials.gmailPassword}
                            onChange={handleInputChange}
                            placeholder="Your Gmail password or app password"
                            type="password"
                          />
                          <p className="text-sm text-muted-foreground">
                            For better security, we recommend using an app-specific password generated in your Google Account.
                          </p>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm font-medium">Advanced SMTP Settings (Optional)</h4>
                            <div className="relative group">
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              <div className="hidden group-hover:block absolute z-50 w-64 p-2 text-xs bg-secondary text-secondary-foreground rounded shadow-lg left-0 top-5">
                                These settings are automatically configured for Gmail SMTP. Only modify if you're using a custom SMTP setup or encountering connection issues.
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-4">
                            Default Gmail SMTP settings are already configured. Only change these if you're experiencing connection problems.
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="gmailSmtpHost">SMTP Server Host</Label>
                              <Input
                                id="gmailSmtpHost"
                                name="gmailSmtpHost"
                                value={credentials.gmailSmtpHost || "smtp.gmail.com"}
                                onChange={handleInputChange}
                                placeholder="smtp.gmail.com"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="gmailSmtpPort">SMTP Server Port</Label>
                              <Input
                                id="gmailSmtpPort"
                                name="gmailSmtpPort"
                                value={credentials.gmailSmtpPort || 587}
                                onChange={handleInputChange}
                                type="number"
                                placeholder="587"
                              />
                            </div>
                          </div>
                          
                          <div className="mt-4 flex items-center space-x-2">
                            <Switch
                              id="gmailSmtpSecure"
                              name="gmailSmtpSecure"
                              checked={credentials.gmailSmtpSecure || false}
                              onCheckedChange={(checked) =>
                                setCredentials((prev) => ({ ...prev, gmailSmtpSecure: checked }))
                              }
                            />
                            <Label htmlFor="gmailSmtpSecure">Use SSL/TLS (Port 465)</Label>
                            <span className="inline-block relative">
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help ml-1" />
                              <span className="sr-only">Enable for SSL (port 465), disable for STARTTLS (port 587)</span>
                            </span>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mt-2">
                            If you enable SSL/TLS, change the port to 465. For STARTTLS, use port 587 (recommended).
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Test Connection Button */}
                  <div className="mt-6">
                    <Button
                      type="button"
                      onClick={() => handleTestConnection('gmail')}
                      disabled={isTesting.gmail || !credentials.useGmail || updateCredentialsMutation.isPending}
                      variant="outline"
                      className="w-full"
                    >
                      {isTesting.gmail ? (
                        <>
                          <span className="mr-2">Testing Connection...</span>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        "Test Gmail Connection"
                      )}
                    </Button>
                    
                    {testResult.provider === 'gmail' && (
                      <Alert className="mt-2" variant={testResult.success ? "default" : "destructive"}>
                        {testResult.success ? 
                          <CheckCircle2 className="h-4 w-4" /> : 
                          <AlertCircle className="h-4 w-4" />
                        }
                        <AlertTitle>{testResult.success ? "Connection Successful" : "Connection Failed"}</AlertTitle>
                        <AlertDescription>{testResult.message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  {renderConnectedAccount("gmail")}

                  {getValidationErrors("gmail").length > 0 && (
                    <div className="text-red-500 text-sm">
                      {getValidationErrors("gmail").map((error, index) => (
                        <div key={index}>{error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Outlook Configuration */}
            <TabsContent value="outlook" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="useOutlook"
                    name="useOutlook"
                    checked={credentials.useOutlook}
                    onCheckedChange={(checked) =>
                      setCredentials((prev) => ({ ...prev, useOutlook: checked }))
                    }
                  />
                  <Label htmlFor="useOutlook">Use Outlook for sending emails</Label>
                </div>

                {credentials.useOutlook && (
                  <Button
                    type="button"
                    onClick={() => handleOAuthSetup('outlook')}
                    disabled={isConfiguring.outlook || !hasCredentials("outlook") || updateCredentialsMutation.isPending}
                    variant="outline"
                  >
                    {isConfiguring.outlook ? "Configuring..." : "Configure Outlook OAuth"}
                  </Button>
                )}
              </div>

              {credentials.useOutlook && (
                <div className="space-y-4">
                  <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                    <HelpCircle className="h-4 w-4" />
                    <AlertTitle>Microsoft Outlook OAuth Setup Guide</AlertTitle>
                    <AlertDescription className="mt-2">
                      <ol className="list-decimal ml-4 space-y-1 text-sm">
                        <li>Go to the <a href="https://portal.azure.com/" target="_blank" className="text-primary underline">Microsoft Azure Portal</a></li>
                        <li>Navigate to "Azure Active Directory" → "App registrations" → "New registration"</li>
                        <li>Register your application:
                          <ul className="list-disc ml-5 mt-1">
                            <li>Enter a name for your application</li>
                            <li>Select "Accounts in any organizational directory and personal Microsoft accounts"</li>
                            <li>Set the Redirect URI to "Web" and paste the URI from below</li>
                          </ul>
                        </li>
                        <li>After registration, go to "API permissions":
                          <ul className="list-disc ml-5 mt-1">
                            <li>Click "Add a permission" → "Microsoft Graph" → "Delegated permissions"</li>
                            <li>Add: <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">Mail.Send</code>, <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">offline_access</code></li>
                            <li>Click "Grant admin consent" if you have admin privileges</li>
                          </ul>
                        </li>
                        <li>Go to "Certificates & secrets":
                          <ul className="list-disc ml-5 mt-1">
                            <li>Click "New client secret", add a description and expiration</li>
                            <li>Copy the generated value immediately (it's shown only once)</li>
                          </ul>
                        </li>
                        <li>Copy the "Application (client) ID" from the Overview page and the secret value below</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor="outlookClientId">
                          Client ID
                          {getValidationErrors("outlook").includes("Client ID is required") && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </Label>
                        <div className="relative ml-1 group">
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          <div className="hidden group-hover:block absolute z-50 w-64 p-2 text-xs bg-secondary text-secondary-foreground rounded shadow-lg -left-8 top-5">
                            Client ID from your Microsoft Azure Portal. Required for OAuth authentication.
                          </div>
                        </div>
                      </div>
                      <Input
                        id="outlookClientId"
                        name="outlookClientId"
                        value={credentials.outlookClientId}
                        onChange={handleInputChange}
                        placeholder="Your Outlook OAuth Client ID"
                        className={getValidationErrors("outlook").includes("Client ID is required") ? "border-red-500" : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor="outlookClientSecret">
                          Client Secret
                          {getValidationErrors("outlook").includes("Client Secret is required") && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </Label>
                        <div className="relative ml-1 group">
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          <div className="hidden group-hover:block absolute z-50 w-64 p-2 text-xs bg-secondary text-secondary-foreground rounded shadow-lg -left-8 top-5">
                            Client Secret from your Microsoft Azure Portal. Keep this value confidential.
                          </div>
                        </div>
                      </div>
                      <Input
                        id="outlookClientSecret"
                        name="outlookClientSecret"
                        value={credentials.outlookClientSecret}
                        onChange={handleInputChange}
                        placeholder="Your Outlook OAuth Client Secret"
                        type="password"
                        className={getValidationErrors("outlook").includes("Client Secret is required") ? "border-red-500" : ""}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="outlookRedirectUri">
                        Redirect URI
                        {getValidationErrors("outlook").includes("Redirect URI must be a valid URL with http:// or https:// protocol") && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      <div className="relative ml-1 group">
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        <div className="hidden group-hover:block absolute z-50 w-64 p-2 text-xs bg-secondary text-secondary-foreground rounded shadow-lg -left-8 top-5">
                          This exact URL must be added to your Microsoft Azure Portal "Redirect URIs" section.
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        id="outlookRedirectUri"
                        name="outlookRedirectUri"
                        value={credentials.outlookRedirectUri || DEFAULT_OUTLOOK_REDIRECT_URI}
                        onChange={handleInputChange}
                        placeholder={DEFAULT_OUTLOOK_REDIRECT_URI}
                        className={getValidationErrors("outlook").includes("Redirect URI must be a valid URL with http:// or https:// protocol") ? "border-red-500" : ""}
                        readOnly
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => {
                          navigator.clipboard.writeText(credentials.outlookRedirectUri || DEFAULT_OUTLOOK_REDIRECT_URI);
                          toast({
                            title: "Copied!",
                            description: "Redirect URI copied to clipboard",
                          });
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      </Button>
                    </div>
                    <Alert className="mt-2 py-2 bg-amber-50 text-amber-800 border-amber-200">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Copy this exact URL to your Microsoft Azure Portal under "Authentication" → "Platform configurations" → "Web" → "Redirect URIs"
                      </AlertDescription>
                    </Alert>
                  </div>

                  {/* Test Connection Button for Outlook */}
                  <div className="mt-6">
                    <Button
                      type="button"
                      onClick={() => handleTestConnection('outlook')}
                      disabled={isTesting.outlook || !credentials.useOutlook || updateCredentialsMutation.isPending}
                      variant="outline"
                      className="w-full"
                    >
                      {isTesting.outlook ? (
                        <>
                          <span className="mr-2">Testing Connection...</span>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        "Test Outlook Connection"
                      )}
                    </Button>
                    
                    {testResult.provider === 'outlook' && (
                      <Alert className="mt-2" variant={testResult.success ? "default" : "destructive"}>
                        {testResult.success ? 
                          <CheckCircle2 className="h-4 w-4" /> : 
                          <AlertCircle className="h-4 w-4" />
                        }
                        <AlertTitle>{testResult.success ? "Connection Successful" : "Connection Failed"}</AlertTitle>
                        <AlertDescription>{testResult.message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  {renderConnectedAccount("outlook")}

                  {getValidationErrors("outlook").length > 0 && (
                    <div className="text-red-500 text-sm">
                      {getValidationErrors("outlook").map((error, index) => (
                        <div key={index}>{error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* SendGrid Configuration */}
            <TabsContent value="sendgrid" className="space-y-4 mt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="useSendGrid"
                  name="useSendGrid"
                  checked={credentials.useSendGrid}
                  onCheckedChange={(checked) =>
                    setCredentials((prev) => ({ ...prev, useSendGrid: checked }))
                  }
                />
                <Label htmlFor="useSendGrid">Use SendGrid for sending emails</Label>
              </div>

              {credentials.useSendGrid && (
                <div className="space-y-4">
                  <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                    <HelpCircle className="h-4 w-4" />
                    <AlertTitle>SendGrid Setup Guide</AlertTitle>
                    <AlertDescription className="mt-2">
                      <ol className="list-decimal ml-4 space-y-1 text-sm">
                        <li>Go to <a href="https://app.sendgrid.com/" target="_blank" className="text-primary underline">SendGrid Dashboard</a></li>
                        <li>Create an account if you don't have one already</li>
                        <li>Navigate to "Settings" → "API Keys" → "Create API Key"
                          <ul className="list-disc ml-5 mt-1">
                            <li>Name your API key (e.g., "Wedding RSVP App")</li>
                            <li>Select "Restricted Access" and ensure at least "Mail Send" permission is enabled</li>
                            <li>Click "Create & View"</li>
                            <li>Copy the generated API key immediately (it's shown only once)</li>
                          </ul>
                        </li>
                        <li>Configure domain authentication in "Settings" → "Sender Authentication" for improved deliverability</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="sendGridApiKey">
                        API Key
                        {credentials.useSendGrid && !credentials.sendGridApiKey && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      <div className="relative ml-1 group">
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        <div className="hidden group-hover:block absolute z-50 w-64 p-2 text-xs bg-secondary text-secondary-foreground rounded shadow-lg -left-8 top-5">
                          Your SendGrid API key provides secure access to the email delivery service. Keep this value confidential.
                        </div>
                      </div>
                    </div>
                    <Input
                      id="sendGridApiKey"
                      name="sendGridApiKey"
                      value={credentials.sendGridApiKey}
                      onChange={handleInputChange}
                      placeholder="Your SendGrid API Key"
                      type="password"
                      className={credentials.useSendGrid && !credentials.sendGridApiKey ? "border-red-500" : ""}
                    />
                    <p className="text-sm text-muted-foreground">
                      Your API key should have at least "Mail Send" permissions. For better email delivery, verify your sending domain in SendGrid.
                    </p>
                  </div>

                  {credentials.useSendGrid && !credentials.sendGridApiKey && (
                    <div className="text-red-500 text-sm mt-2">
                      SendGrid API Key is required when SendGrid is enabled
                    </div>
                  )}
                  
                  {/* Test Connection Button for SendGrid */}
                  <div className="mt-6">
                    <Button
                      type="button"
                      onClick={() => handleTestConnection('sendgrid')}
                      disabled={isTesting.sendgrid || !credentials.useSendGrid || !credentials.sendGridApiKey || updateCredentialsMutation.isPending}
                      variant="outline"
                      className="w-full"
                    >
                      {isTesting.sendgrid ? (
                        <>
                          <span className="mr-2">Testing Connection...</span>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        "Test SendGrid Connection"
                      )}
                    </Button>
                    
                    {testResult.provider === 'sendgrid' && (
                      <Alert className="mt-2" variant={testResult.success ? "default" : "destructive"}>
                        {testResult.success ? 
                          <CheckCircle2 className="h-4 w-4" /> : 
                          <AlertCircle className="h-4 w-4" />
                        }
                        <AlertTitle>{testResult.success ? "Connection Successful" : "Connection Failed"}</AlertTitle>
                        <AlertDescription>{testResult.message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* General Email Settings (applies to all providers) */}
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">General Email Settings</h3>
            <p className="text-sm text-muted-foreground mb-4">
              These settings apply regardless of which email provider you use (Gmail, Outlook, or SendGrid).
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="emailFrom">From Email Address</Label>
                  <div className="relative ml-1 group">
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    <div className="hidden group-hover:block absolute z-50 w-64 p-2 text-xs bg-secondary text-secondary-foreground rounded shadow-lg -left-8 top-5">
                      The email address that will appear in the "From" field of sent emails. This should be a verified sender address.
                    </div>
                  </div>
                </div>
                <Input
                  id="emailFrom"
                  name="emailFrom"
                  value={credentials.emailFrom}
                  onChange={handleInputChange}
                  placeholder="weddings@yourdomain.com"
                  type="email"
                />
                <p className="text-xs text-muted-foreground">
                  {credentials.useGmail && "When using Gmail, this should match your Gmail account or a verified alias."}
                  {credentials.useOutlook && "When using Outlook, this should match your Outlook account or a verified sender."}
                  {credentials.useSendGrid && "When using SendGrid, this should be a verified sender identity."}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="emailReplyTo">Reply-To Email Address</Label>
                  <div className="relative ml-1 group">
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    <div className="hidden group-hover:block absolute z-50 w-64 p-2 text-xs bg-secondary text-secondary-foreground rounded shadow-lg -left-8 top-5">
                      When recipients reply to your emails, their responses will go to this address.
                    </div>
                  </div>
                </div>
                <Input
                  id="emailReplyTo"
                  name="emailReplyTo"
                  value={credentials.emailReplyTo}
                  onChange={handleInputChange}
                  placeholder="replies@yourdomain.com"
                  type="email"
                />
                <p className="text-xs text-muted-foreground">
                  This can be different from your "From" address and doesn't need to be verified by your email provider.
                </p>
              </div>
            </div>
          
            <Button
              type="submit"
              disabled={updateCredentialsMutation.isPending}
              className="w-full md:w-auto"
            >
              {updateCredentialsMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}