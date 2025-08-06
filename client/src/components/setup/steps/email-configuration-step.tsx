/**
 * Email Configuration Step
 * 
 * Configuration step for email providers including SMTP, SendGrid,
 * Resend, and all-in-one solutions.
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Send, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle,
  Info,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepProps, ProviderType } from '../provider-setup-wizard';
import { post } from '@/lib/api-utils';
import { useToast } from '@/hooks/use-toast';

// Configuration schemas for different email provider types
const smtpEmailSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.coerce.number().min(1).max(65535).default(587),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  secure: z.boolean().default(true),
  fromEmail: z.string().email('Valid from email is required'),
  fromName: z.string().min(1, 'From name is required'),
  replyTo: z.string().email().optional(),
  connectionTimeout: z.coerce.number().min(1000).max(60000).default(30000),
  socketTimeout: z.coerce.number().min(1000).max(60000).default(30000),
});

const sendgridEmailSchema = z.object({
  apiKey: z.string().min(1, 'SendGrid API key is required'),
  fromEmail: z.string().email('Valid from email is required'),
  fromName: z.string().min(1, 'From name is required'),
  replyTo: z.string().email().optional(),
  enableTracking: z.boolean().default(true),
  enableClickTracking: z.boolean().default(true),
  enableOpenTracking: z.boolean().default(true),
  templateEngine: z.enum(['handlebars', 'none']).default('handlebars'),
});

const resendEmailSchema = z.object({
  apiKey: z.string().min(1, 'Resend API key is required'),
  fromEmail: z.string().email('Valid from email is required'),
  fromName: z.string().min(1, 'From name is required'),
  replyTo: z.string().email().optional(),
  enableTracking: z.boolean().default(true),
  enableBounceHandling: z.boolean().default(true),
});

const gmailOAuthSchema = z.object({
  clientId: z.string().min(1, 'Gmail OAuth client ID is required'),
  clientSecret: z.string().min(1, 'Gmail OAuth client secret is required'),
  refreshToken: z.string().min(1, 'Gmail OAuth refresh token is required'),
  fromEmail: z.string().email('Valid from email is required'),
  fromName: z.string().min(1, 'From name is required'),
  replyTo: z.string().email().optional(),
});

const pocketbaseEmailSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.coerce.number().min(1).max(65535).default(587),
  smtpUsername: z.string().min(1, 'SMTP username is required'),
  smtpPassword: z.string().min(1, 'SMTP password is required'),
  smtpTLS: z.boolean().default(true),
  fromEmail: z.string().email('Valid from email is required'),
  fromName: z.string().min(1, 'From name is required'),
});

type EmailConfig = 
  | z.infer<typeof smtpEmailSchema>
  | z.infer<typeof sendgridEmailSchema>
  | z.infer<typeof resendEmailSchema>
  | z.infer<typeof gmailOAuthSchema>
  | z.infer<typeof pocketbaseEmailSchema>;

interface EmailConfigurationStepProps extends WizardStepProps {
  providerType?: ProviderType;
}

export function EmailConfigurationStep({
  data,
  onDataChange,
  providerType,
}: EmailConfigurationStepProps) {
  const { toast } = useToast();
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [testEmail, setTestEmail] = useState('');

  // Determine schema based on provider type
  const getSchema = () => {
    switch (providerType) {
      case 'smtp-email':
        return smtpEmailSchema;
      case 'sendgrid-email':
        return sendgridEmailSchema;
      case 'resend-email':
        return resendEmailSchema;
      case 'gmail-oauth-email':
        return gmailOAuthSchema;
      case 'pocketbase-email':
      case 'pocketbase-all-in-one':
        return pocketbaseEmailSchema;
      default:
        return smtpEmailSchema;
    }
  };

  const schema = getSchema();
  const form = useForm<EmailConfig>({
    resolver: zodResolver(schema),
    defaultValues: data as EmailConfig || {},
  });

  // Update parent component when form data changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      onDataChange('email-config', value);
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  // Test email configuration
  const testEmailConfiguration = async () => {
    if (!testEmail) {
      toast({
        title: 'Test Email Required',
        description: 'Please enter an email address to send the test email to.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsTestingEmail(true);
      setEmailTestResult(null);

      const formData = form.getValues();
      const response = await post('/api/providers/test-email', {
        providerType,
        config: formData,
        testEmail,
      });

      setEmailTestResult({
        success: response.data.success,
        message: response.data.message || 'Test email sent successfully!',
      });

      if (response.data.success) {
        toast({
          title: 'Test Email Sent',
          description: `Test email sent successfully to ${testEmail}`,
        });
      } else {
        toast({
          title: 'Test Email Failed',
          description: response.data.message || 'Unable to send test email.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Email test error:', error);
      setEmailTestResult({
        success: false,
        message: 'Email test failed. Please check your configuration.',
      });
      toast({
        title: 'Email Test Error',
        description: 'Unable to test email configuration.',
        variant: 'destructive',
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  // Get provider-specific configuration fields
  const renderConfigurationFields = () => {
    switch (providerType) {
      case 'smtp-email':
        return renderSMTPFields();
      case 'sendgrid-email':
        return renderSendGridFields();
      case 'resend-email':
        return renderResendFields();
      case 'gmail-oauth-email':
        return renderGmailOAuthFields();
      case 'pocketbase-email':
      case 'pocketbase-all-in-one':
        return renderPocketBaseEmailFields();
      default:
        return renderSMTPFields();
    }
  };

  const renderSMTPFields = () => (
    <Tabs defaultValue="server" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="server">Server Settings</TabsTrigger>
        <TabsTrigger value="sender">Sender Info</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>

      <TabsContent value="server" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="host"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SMTP Host</FormLabel>
                <FormControl>
                  <Input placeholder="smtp.gmail.com" {...field} />
                </FormControl>
                <FormDescription>SMTP server hostname</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select port" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 (Unencrypted)</SelectItem>
                      <SelectItem value="587">587 (TLS - Recommended)</SelectItem>
                      <SelectItem value="465">465 (SSL)</SelectItem>
                      <SelectItem value="2525">2525 (Alternative TLS)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>SMTP server port</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="your-email@example.com" {...field} />
                </FormControl>
                <FormDescription>SMTP authentication username</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormDescription>SMTP authentication password</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="secure"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Use Secure Connection</FormLabel>
                <FormDescription>Enable TLS/SSL encryption (recommended)</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="sender" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fromEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="noreply@yourdomain.com" {...field} />
                </FormControl>
                <FormDescription>Email address that emails will be sent from</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fromName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Name</FormLabel>
                <FormControl>
                  <Input placeholder="RSVP Platform" {...field} />
                </FormControl>
                <FormDescription>Display name for sent emails</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="replyTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reply-To Email (Optional)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="support@yourdomain.com" {...field} />
              </FormControl>
              <FormDescription>Email address for replies (defaults to from email)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="advanced" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="connectionTimeout"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connection Timeout (ms)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="30000" {...field} />
                </FormControl>
                <FormDescription>Connection timeout in milliseconds</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="socketTimeout"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Socket Timeout (ms)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="30000" {...field} />
                </FormControl>
                <FormDescription>Socket timeout in milliseconds</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </TabsContent>
    </Tabs>
  );

  const renderSendGridFields = () => (
    <Tabs defaultValue="api" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="api">API Configuration</TabsTrigger>
        <TabsTrigger value="sender">Sender Info</TabsTrigger>
        <TabsTrigger value="tracking">Tracking</TabsTrigger>
      </TabsList>

      <TabsContent value="api" className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You can find your SendGrid API key in your SendGrid account under Settings → API Keys.
            <Button variant="link" className="p-0 h-auto ml-2" asChild>
              <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer">
                Get API Key <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          </AlertDescription>
        </Alert>

        <FormField
          control={form.control}
          name="apiKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SendGrid API Key</FormLabel>
              <FormControl>
                <Input type="password" placeholder="SG...." {...field} />
              </FormControl>
              <FormDescription>Your SendGrid API key with mail send permissions</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="sender" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fromEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="noreply@yourdomain.com" {...field} />
                </FormControl>
                <FormDescription>Must be a verified sender in SendGrid</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fromName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From Name</FormLabel>
                <FormControl>
                  <Input placeholder="RSVP Platform" {...field} />
                </FormControl>
                <FormDescription>Display name for sent emails</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="replyTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reply-To Email (Optional)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="support@yourdomain.com" {...field} />
              </FormControl>
              <FormDescription>Email address for replies</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="tracking" className="space-y-4">
        <FormField
          control={form.control}
          name="enableTracking"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Email Tracking</FormLabel>
                <FormDescription>Track email delivery, opens, and clicks</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableClickTracking"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Click Tracking</FormLabel>
                <FormDescription>Track when recipients click links in emails</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableOpenTracking"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Open Tracking</FormLabel>
                <FormDescription>Track when recipients open emails</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="templateEngine"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Engine</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template engine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="handlebars">Handlebars</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>Template engine for dynamic email content</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>
    </Tabs>
  );

  const renderResendFields = () => (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          You can find your Resend API key in your Resend dashboard under API Keys.
          <Button variant="link" className="p-0 h-auto ml-2" asChild>
            <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer">
              Get API Key <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Button>
        </AlertDescription>
      </Alert>

      <FormField
        control={form.control}
        name="apiKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Resend API Key</FormLabel>
            <FormControl>
              <Input type="password" placeholder="re_..." {...field} />
            </FormControl>
            <FormDescription>Your Resend API key</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="fromEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="noreply@yourdomain.com" {...field} />
              </FormControl>
              <FormDescription>Must be a verified domain in Resend</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fromName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Name</FormLabel>
              <FormControl>
                <Input placeholder="RSVP Platform" {...field} />
              </FormControl>
              <FormDescription>Display name for sent emails</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="replyTo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Reply-To Email (Optional)</FormLabel>
            <FormControl>
              <Input type="email" placeholder="support@yourdomain.com" {...field} />
            </FormControl>
            <FormDescription>Email address for replies</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="enableTracking"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Email Tracking</FormLabel>
                <FormDescription>Track email delivery and engagement</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableBounceHandling"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Bounce Handling</FormLabel>
                <FormDescription>Automatically handle bounced emails</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderGmailOAuthFields = () => (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Gmail OAuth requires setting up a Google Cloud Project and obtaining OAuth credentials.
          <Button variant="link" className="p-0 h-auto ml-2" asChild>
            <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">
              Google Cloud Console <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Button>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>OAuth Client ID</FormLabel>
              <FormControl>
                <Input placeholder="1234567890-abc123.apps.googleusercontent.com" {...field} />
              </FormControl>
              <FormDescription>Google OAuth client ID</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clientSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>OAuth Client Secret</FormLabel>
              <FormControl>
                <Input type="password" placeholder="GOCSPX-..." {...field} />
              </FormControl>
              <FormDescription>Google OAuth client secret</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="refreshToken"
        render={({ field }) => (
          <FormItem>
            <FormLabel>OAuth Refresh Token</FormLabel>
            <FormControl>
              <Input type="password" placeholder="1//04..." {...field} />
            </FormControl>
            <FormDescription>Google OAuth refresh token for your Gmail account</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="fromEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your-gmail@gmail.com" {...field} />
              </FormControl>
              <FormDescription>Gmail address to send from</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fromName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Name</FormLabel>
              <FormControl>
                <Input placeholder="RSVP Platform" {...field} />
              </FormControl>
              <FormDescription>Display name for sent emails</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="replyTo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Reply-To Email (Optional)</FormLabel>
            <FormControl>
              <Input type="email" placeholder="support@yourdomain.com" {...field} />
            </FormControl>
            <FormDescription>Email address for replies</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderPocketBaseEmailFields = () => (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          PocketBase uses SMTP for sending emails. Configure your SMTP server settings below.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="smtpHost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SMTP Host</FormLabel>
              <FormControl>
                <Input placeholder="smtp.gmail.com" {...field} />
              </FormControl>
              <FormDescription>SMTP server hostname</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="smtpPort"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SMTP Port</FormLabel>
              <FormControl>
                <Input type="number" placeholder="587" {...field} />
              </FormControl>
              <FormDescription>SMTP server port (587 for TLS)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="smtpUsername"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SMTP Username</FormLabel>
              <FormControl>
                <Input placeholder="your-email@example.com" {...field} />
              </FormControl>
              <FormDescription>SMTP authentication username</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="smtpPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SMTP Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormDescription>SMTP authentication password</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="smtpTLS"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Enable TLS</FormLabel>
              <FormDescription>Use TLS encryption for SMTP connection</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="fromEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="noreply@yourdomain.com" {...field} />
              </FormControl>
              <FormDescription>Email address that emails will be sent from</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fromName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From Name</FormLabel>
              <FormControl>
                <Input placeholder="RSVP Platform" {...field} />
              </FormControl>
              <FormDescription>Display name for sent emails</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Provider info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              <CardTitle>Email Configuration</CardTitle>
              <Badge variant="outline">{providerType}</Badge>
            </div>
            <CardDescription>
              Configure your email service settings. All sensitive information is encrypted and stored securely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderConfigurationFields()}
          </CardContent>
        </Card>

        {/* Email test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Test Email Configuration
            </CardTitle>
            <CardDescription>
              Send a test email to verify your configuration is working correctly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={testEmailConfiguration}
                disabled={isTestingEmail || !form.formState.isValid || !testEmail}
              >
                {isTestingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Test Email
                  </>
                )}
              </Button>
            </div>

            {emailTestResult && (
              <Alert variant={emailTestResult.success ? 'default' : 'destructive'}>
                {emailTestResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {emailTestResult.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Email guidelines */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-blue-800">Email Best Practices</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-blue-700">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Use a verified domain for your from email address</li>
              <li>Set up SPF, DKIM, and DMARC records for better deliverability</li>
              <li>Choose appropriate from names that users will recognize</li>
              <li>Test your configuration before going live</li>
              <li>Monitor bounce rates and email reputation</li>
              <li>Use TLS/SSL encryption for secure email transmission</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}