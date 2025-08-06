/**
 * Authentication Configuration Step
 * 
 * Configuration step for authentication providers including local auth,
 * JWT auth, OAuth2, and all-in-one solutions.
 * 
 * Now includes integration with the modular authentication system
 * to support both Database Auth and Supabase Auth methods.
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
  Shield, 
  Key, 
  Lock, 
  Users, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Info,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepProps, ProviderType } from '../provider-setup-wizard';

// Import the authentication method selector component
import { AuthenticationMethodSelector } from './authentication-method-selector';

// Configuration schemas for different auth provider types
const localAuthSchema = z.object({
  passwordMinLength: z.coerce.number().min(6).max(128).default(8),
  passwordRequireUppercase: z.boolean().default(true),
  passwordRequireLowercase: z.boolean().default(true),
  passwordRequireNumbers: z.boolean().default(true),
  passwordRequireSpecialChars: z.boolean().default(false),
  maxLoginAttempts: z.coerce.number().min(3).max(20).default(5),
  lockoutDuration: z.coerce.number().min(300).max(86400).default(900), // 15 minutes default
  sessionTimeout: z.coerce.number().min(3600).max(604800).default(86400), // 24 hours default
  enableTwoFactor: z.boolean().default(false),
  enableAuditLogging: z.boolean().default(true),
});

const jwtAuthSchema = z.object({
  jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters'),
  jwtExpiration: z.string().default('24h'),
  refreshTokenExpiration: z.string().default('7d'),
  algorithm: z.enum(['HS256', 'HS384', 'HS512']).default('HS256'),
  issuer: z.string().default('rsvp-platform'),
  audience: z.string().default('rsvp-users'),
  enableRefreshTokens: z.boolean().default(true),
  enableBlacklist: z.boolean().default(true),
  passwordMinLength: z.coerce.number().min(6).max(128).default(8),
  maxLoginAttempts: z.coerce.number().min(3).max(20).default(5),
});

const oauth2AuthSchema = z.object({
  providers: z.array(z.object({
    name: z.string(),
    clientId: z.string().min(1, 'Client ID is required'),
    clientSecret: z.string().min(1, 'Client Secret is required'),
    scope: z.string().default(''),
    enabled: z.boolean().default(true),
  })),
  redirectUrl: z.string().url('Valid redirect URL is required'),
  successRedirect: z.string().default('/dashboard'),
  failureRedirect: z.string().default('/auth?error=oauth_failed'),
  enableAccountLinking: z.boolean().default(true),
  requireEmailVerification: z.boolean().default(true),
});

const pocketbaseAuthSchema = z.object({
  enableEmailAuth: z.boolean().default(true),
  enableOAuth: z.boolean().default(false),
  oauthProviders: z.array(z.string()).default([]),
  requireEmailVerification: z.boolean().default(true),
  passwordMinLength: z.coerce.number().min(6).max(128).default(8),
  enablePasswordReset: z.boolean().default(true),
  allowUserRegistration: z.boolean().default(true),
});

const supabaseAuthSchema = z.object({
  enableEmailAuth: z.boolean().default(true),
  enableOAuth: z.boolean().default(false),
  oauthProviders: z.array(z.string()).default([]),
  requireEmailVerification: z.boolean().default(true),
  enableMagicLinks: z.boolean().default(false),
  enablePhoneAuth: z.boolean().default(false),
  jwtExpiration: z.coerce.number().min(3600).max(604800).default(86400),
  refreshTokenRotation: z.boolean().default(true),
});

type AuthConfig = 
  | z.infer<typeof localAuthSchema>
  | z.infer<typeof jwtAuthSchema>
  | z.infer<typeof oauth2AuthSchema>
  | z.infer<typeof pocketbaseAuthSchema>
  | z.infer<typeof supabaseAuthSchema>;

interface AuthenticationConfigurationStepProps extends WizardStepProps {
  providerType?: ProviderType;
}

// Authentication method type for the modular auth system
type AuthenticationMethodType = 'database' | 'supabase';

const oauthProviderOptions = [
  { value: 'google', label: 'Google', icon: '🔍' },
  { value: 'github', label: 'GitHub', icon: '⚡' },
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'twitter', label: 'Twitter', icon: '🐦' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'microsoft', label: 'Microsoft', icon: '🪟' },
];

export function AuthenticationConfigurationStep({
  data,
  onDataChange,
  providerType,
}: AuthenticationConfigurationStepProps) {
  const [selectedOAuthProviders, setSelectedOAuthProviders] = useState<string[]>([]);
  const [authMethod, setAuthMethod] = useState<AuthenticationMethodType>('database');
  const [isLoadingAuthMethod, setIsLoadingAuthMethod] = useState(false);

  // Check if this is a modular auth configuration (not tied to specific provider types)
  const isModularAuthConfig = !providerType || providerType === 'local-auth' || providerType === 'jwt-local-auth';

  // Initialize authentication method from data
  useEffect(() => {
    if (data && typeof data.authMethod === 'string') {
      setAuthMethod(data.authMethod as AuthenticationMethodType);
    }
  }, [data]);

  // Determine schema based on provider type
  const getSchema = () => {
    switch (providerType) {
      case 'local-auth':
        return localAuthSchema;
      case 'jwt-local-auth':
        return jwtAuthSchema;
      case 'oauth2-auth':
        return oauth2AuthSchema;
      case 'pocketbase-auth':
      case 'pocketbase-all-in-one':
        return pocketbaseAuthSchema;
      case 'supabase-auth':
      case 'supabase-all-in-one':
        return supabaseAuthSchema;
      default:
        return localAuthSchema;
    }
  };

  const schema = getSchema();
  const form = useForm<AuthConfig>({
    resolver: zodResolver(schema),
    defaultValues: data as AuthConfig || {},
  });

  // Update parent component when form data changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      onDataChange('auth-config', {
        ...value,
        authMethod: authMethod, // Include the authentication method selection
      });
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange, authMethod]);

  // Handle authentication method changes
  const handleAuthMethodChange = (method: AuthenticationMethodType) => {
    setAuthMethod(method);
    onDataChange('auth-config', {
      ...form.getValues(),
      authMethod: method,
    });
  };

  // Generate a secure JWT secret
  const generateJwtSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secret = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    form.setValue('jwtSecret', secret);
  };

  // Get provider-specific configuration fields
  const renderConfigurationFields = () => {
    switch (providerType) {
      case 'local-auth':
        return renderLocalAuthFields();
      case 'jwt-local-auth':
        return renderJWTAuthFields();
      case 'oauth2-auth':
        return renderOAuth2Fields();
      case 'pocketbase-auth':
      case 'pocketbase-all-in-one':
        return renderPocketBaseAuthFields();
      case 'supabase-auth':
      case 'supabase-all-in-one':
        return renderSupabaseAuthFields();
      default:
        return renderLocalAuthFields();
    }
  };

  const renderLocalAuthFields = () => (
    <Tabs defaultValue="password" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="password">Password Policy</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="session">Session</TabsTrigger>
      </TabsList>

      <TabsContent value="password" className="space-y-4">
        <FormField
          control={form.control}
          name="passwordMinLength"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum Password Length</FormLabel>
              <FormControl>
                <Input type="number" placeholder="8" {...field} />
              </FormControl>
              <FormDescription>Minimum number of characters required for passwords</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="passwordRequireUppercase"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Require Uppercase Letters</FormLabel>
                  <FormDescription>Passwords must contain at least one uppercase letter</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="passwordRequireLowercase"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Require Lowercase Letters</FormLabel>
                  <FormDescription>Passwords must contain at least one lowercase letter</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="passwordRequireNumbers"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Require Numbers</FormLabel>
                  <FormDescription>Passwords must contain at least one number</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="passwordRequireSpecialChars"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Require Special Characters</FormLabel>
                  <FormDescription>Passwords must contain at least one special character</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </TabsContent>

      <TabsContent value="security" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxLoginAttempts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Login Attempts</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="5" {...field} />
                </FormControl>
                <FormDescription>Number of failed attempts before account lockout</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lockoutDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lockout Duration (seconds)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="900" {...field} />
                </FormControl>
                <FormDescription>How long to lock account after max attempts (900 = 15 minutes)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="enableTwoFactor"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Two-Factor Authentication</FormLabel>
                <FormDescription>Allow users to enable 2FA for additional security</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableAuditLogging"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Audit Logging</FormLabel>
                <FormDescription>Log authentication events for security monitoring</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="session" className="space-y-4">
        <FormField
          control={form.control}
          name="sessionTimeout"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session Timeout (seconds)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="86400" {...field} />
              </FormControl>
              <FormDescription>How long user sessions remain active (86400 = 24 hours)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>
    </Tabs>
  );

  const renderJWTAuthFields = () => (
    <Tabs defaultValue="jwt" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="jwt">JWT Configuration</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="password">Password Policy</TabsTrigger>
      </TabsList>

      <TabsContent value="jwt" className="space-y-4">
        <FormField
          control={form.control}
          name="jwtSecret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>JWT Secret</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input type="password" placeholder="32+ character secret key" {...field} />
                  <Button type="button" onClick={generateJwtSecret} variant="outline">
                    Generate
                  </Button>
                </div>
              </FormControl>
              <FormDescription>Secret key for signing JWT tokens (minimum 32 characters)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="jwtExpiration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>JWT Expiration</FormLabel>
                <FormControl>
                  <Select value={String(field.value)} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select expiration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 hour</SelectItem>
                      <SelectItem value="6h">6 hours</SelectItem>
                      <SelectItem value="12h">12 hours</SelectItem>
                      <SelectItem value="24h">24 hours</SelectItem>
                      <SelectItem value="7d">7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>How long JWT tokens remain valid</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="refreshTokenExpiration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Refresh Token Expiration</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select expiration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">7 days</SelectItem>
                      <SelectItem value="30d">30 days</SelectItem>
                      <SelectItem value="90d">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>How long refresh tokens remain valid</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="algorithm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Algorithm</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select algorithm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HS256">HS256</SelectItem>
                      <SelectItem value="HS384">HS384</SelectItem>
                      <SelectItem value="HS512">HS512</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>JWT signing algorithm</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="issuer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issuer</FormLabel>
                <FormControl>
                  <Input placeholder="rsvp-platform" {...field} />
                </FormControl>
                <FormDescription>JWT issuer claim</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="audience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Audience</FormLabel>
                <FormControl>
                  <Input placeholder="rsvp-users" {...field} />
                </FormControl>
                <FormDescription>JWT audience claim</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </TabsContent>

      <TabsContent value="security" className="space-y-4">
        <FormField
          control={form.control}
          name="enableRefreshTokens"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Refresh Tokens</FormLabel>
                <FormDescription>Use refresh tokens for secure token renewal</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableBlacklist"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Token Blacklist</FormLabel>
                <FormDescription>Maintain a blacklist of revoked tokens</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxLoginAttempts"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Login Attempts</FormLabel>
              <FormControl>
                <Input type="number" placeholder="5" {...field} />
              </FormControl>
              <FormDescription>Number of failed attempts before temporary lockout</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="password" className="space-y-4">
        <FormField
          control={form.control}
          name="passwordMinLength"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum Password Length</FormLabel>
              <FormControl>
                <Input type="number" placeholder="8" {...field} />
              </FormControl>
              <FormDescription>Minimum number of characters required for passwords</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>
    </Tabs>
  );

  const renderOAuth2Fields = () => (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          OAuth2 authentication allows users to sign in with their existing accounts from other services.
          You'll need to register your application with each OAuth provider.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="redirectUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Redirect URL</FormLabel>
              <FormControl>
                <Input placeholder="https://yourdomain.com/auth/callback" {...field} />
              </FormControl>
              <FormDescription>
                URL where OAuth providers will redirect after authentication
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="successRedirect"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Success Redirect</FormLabel>
                <FormControl>
                  <Input placeholder="/dashboard" {...field} />
                </FormControl>
                <FormDescription>Where to redirect after successful login</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="failureRedirect"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Failure Redirect</FormLabel>
                <FormControl>
                  <Input placeholder="/auth?error=oauth_failed" {...field} />
                </FormControl>
                <FormDescription>Where to redirect after failed login</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* OAuth Providers Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>OAuth Providers</CardTitle>
          <CardDescription>
            Configure OAuth providers. You'll need to obtain client ID and secret from each provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {oauthProviderOptions.map((provider) => (
            <Card key={provider.value} className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{provider.icon}</span>
                    <Label className="text-base font-medium">{provider.label}</Label>
                  </div>
                  <Switch />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`${provider.value}-client-id`}>Client ID</Label>
                    <Input 
                      id={`${provider.value}-client-id`}
                      placeholder="Enter client ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${provider.value}-client-secret`}>Client Secret</Label>
                    <Input 
                      id={`${provider.value}-client-secret`}
                      type="password"
                      placeholder="Enter client secret"
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="enableAccountLinking"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Account Linking</FormLabel>
                <FormDescription>
                  Allow users to link multiple OAuth accounts to the same user profile
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="requireEmailVerification"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Require Email Verification</FormLabel>
                <FormDescription>
                  Require users to verify their email address after OAuth registration
                </FormDescription>
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

  const renderPocketBaseAuthFields = () => (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          PocketBase provides built-in authentication with email/password and OAuth support.
          These settings configure the authentication behavior.
        </AlertDescription>
      </Alert>

      <FormField
        control={form.control}
        name="enableEmailAuth"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Enable Email Authentication</FormLabel>
              <FormDescription>Allow users to sign up and login with email/password</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="allowUserRegistration"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Allow User Registration</FormLabel>
              <FormDescription>Allow new users to create accounts</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="requireEmailVerification"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Require Email Verification</FormLabel>
              <FormDescription>Users must verify their email before accessing the system</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="enablePasswordReset"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Enable Password Reset</FormLabel>
              <FormDescription>Allow users to reset their passwords via email</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="passwordMinLength"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Minimum Password Length</FormLabel>
            <FormControl>
              <Input type="number" placeholder="8" {...field} />
            </FormControl>
            <FormDescription>Minimum number of characters required for passwords</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderSupabaseAuthFields = () => (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Supabase Auth provides comprehensive authentication with multiple sign-in methods.
          Configure these settings based on your application needs.
        </AlertDescription>
      </Alert>

      <FormField
        control={form.control}
        name="enableEmailAuth"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Enable Email Authentication</FormLabel>
              <FormDescription>Allow users to sign up and login with email/password</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="enableMagicLinks"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Enable Magic Links</FormLabel>
              <FormDescription>Allow passwordless authentication via email magic links</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="enablePhoneAuth"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Enable Phone Authentication</FormLabel>
              <FormDescription>Allow users to sign up and login with phone/SMS</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="requireEmailVerification"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Require Email Verification</FormLabel>
              <FormDescription>Users must verify their email before accessing the system</FormDescription>
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
          name="jwtExpiration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>JWT Expiration (seconds)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="86400" {...field} />
              </FormControl>
              <FormDescription>How long JWT tokens remain valid (86400 = 24 hours)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="refreshTokenRotation"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Refresh Token Rotation</FormLabel>
                <FormDescription>Rotate refresh tokens for additional security</FormDescription>
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

  // Render modular authentication fields based on selected method
  const renderModularAuthFields = () => {
    if (authMethod === 'supabase') {
      return (
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Supabase Auth is a complete authentication solution that handles user management, 
              OAuth providers, magic links, and more. Configuration is managed through your Supabase dashboard.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-blue-50 border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Supabase Auth Features</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Email/password authentication</li>
                <li>• Magic link authentication</li>
                <li>• OAuth providers (Google, GitHub, etc.)</li>
                <li>• Phone/SMS authentication</li>
                <li>• User management dashboard</li>
                <li>• Email verification & password reset</li>
                <li>• Row Level Security (RLS)</li>
              </ul>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Next Steps:</strong> After setup completion, configure your authentication providers 
                in the Supabase dashboard under Authentication {'>'} Settings.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    // Database Auth configuration
    return (
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Database Auth uses your existing database to store user credentials with enterprise-grade security.
            Configure password policies and security settings below.
          </AlertDescription>
        </Alert>

        {renderLocalAuthFields()}
      </div>
    );
  };

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Authentication Method Selection (for modular auth config) */}
        {isModularAuthConfig && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <CardTitle>Authentication Method</CardTitle>
                <Badge variant="outline">Modular Setup</Badge>
              </div>
              <CardDescription>
                Choose your authentication system. This determines how users will sign in and how authentication data is managed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuthenticationMethodSelector
                currentMethod={authMethod}
                onMethodChange={handleAuthMethodChange}
                showAdvanced={false}
              />
            </CardContent>
          </Card>
        )}

        {/* Provider info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <CardTitle>Authentication Configuration</CardTitle>
              {providerType && <Badge variant="outline">{providerType}</Badge>}
              {isModularAuthConfig && (
                <Badge variant="secondary">{authMethod === 'database' ? 'Database Auth' : 'Supabase Auth'}</Badge>
              )}
            </div>
            <CardDescription>
              Configure authentication settings for your users. All sensitive information is encrypted and stored securely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isModularAuthConfig ? renderModularAuthFields() : renderConfigurationFields()}
          </CardContent>
        </Card>

        {/* Security recommendations */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <CardTitle className="text-amber-800">Security Recommendations</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-amber-700">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Use strong passwords with a minimum length of 8 characters</li>
              <li>Enable two-factor authentication when available</li>
              <li>Implement proper session management and timeouts</li>
              <li>Use HTTPS in production to protect credentials in transit</li>
              <li>Regularly review and audit authentication logs</li>
              <li>Keep authentication secrets secure and rotate them periodically</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}