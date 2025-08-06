/**
 * AUTHENTICATION METHOD SELECTOR
 * 
 * UI component for switching between Database Auth and Supabase Auth methods.
 * Provides modular authentication system switching with visual configuration interface.
 * 
 * Features:
 * - Visual method selection (Database Auth vs Supabase Auth)
 * - Real-time configuration testing
 * - Method switching with validation
 * - Integration with existing setup wizard
 * - Standalone settings interface support
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Database, 
  Shield, 
  Key, 
  CheckCircle, 
  AlertCircle,
  Info,
  Zap,
  Globe,
  Lock,
  Settings,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Authentication method types
export type AuthenticationMethod = 'database' | 'supabase';

// Configuration schemas
const databaseAuthConfigSchema = z.object({
  method: z.literal('database'),
  provider: z.enum(['postgresql', 'supabase', 'sqlite']).default('postgresql'),
  connectionUrl: z.string().optional(),
  enableSecurity: z.boolean().default(true),
  passwordPolicy: z.object({
    minLength: z.coerce.number().min(8).max(128).default(12),
    requireUppercase: z.boolean().default(true),
    requireLowercase: z.boolean().default(true),
    requireNumbers: z.boolean().default(true),
    requireSymbols: z.boolean().default(true),
  }).default({}),
  sessionTimeout: z.coerce.number().min(30).max(480).default(480), // minutes
  maxFailedAttempts: z.coerce.number().min(3).max(10).default(5),
  accountLockDuration: z.coerce.number().min(5).max(60).default(30), // minutes
});

const supabaseAuthConfigSchema = z.object({
  method: z.literal('supabase'),
  url: z.string().url('Please enter a valid Supabase URL'),
  anonKey: z.string().min(20, 'Anonymous key must be at least 20 characters'),
  serviceRoleKey: z.string().optional(),
  features: z.object({
    oauthProviders: z.array(z.string()).default([]),
    magicLinks: z.boolean().default(false),
    emailVerification: z.boolean().default(true),
    phoneAuth: z.boolean().default(false),
  }).default({}),
  testConnection: z.boolean().default(false),
});

type DatabaseAuthConfig = z.infer<typeof databaseAuthConfigSchema>;
type SupabaseAuthConfig = z.infer<typeof supabaseAuthConfigSchema>;
type AuthConfig = DatabaseAuthConfig | SupabaseAuthConfig;

interface AuthenticationMethodSelectorProps {
  currentMethod?: AuthenticationMethod;
  currentConfig?: Partial<AuthConfig>;
  onMethodChange?: (method: AuthenticationMethod, config: AuthConfig) => void;
  onConfigChange?: (config: AuthConfig) => void;
  showAdvanced?: boolean;
  standalone?: boolean;
}

const oauthProviders = [
  { id: 'google', name: 'Google', icon: '🔍' },
  { id: 'github', name: 'GitHub', icon: '⚡' },
  { id: 'facebook', name: 'Facebook', icon: '📘' },
  { id: 'apple', name: 'Apple', icon: '🍎' },
];

export function AuthenticationMethodSelector({
  currentMethod = 'database',
  currentConfig,
  onMethodChange,
  onConfigChange,
  showAdvanced = true,
  standalone = false
}: AuthenticationMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<AuthenticationMethod>(currentMethod);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string>('');

  // Get the appropriate schema based on selected method
  const getSchema = () => {
    return selectedMethod === 'supabase' ? supabaseAuthConfigSchema : databaseAuthConfigSchema;
  };

  const form = useForm<AuthConfig>({
    resolver: zodResolver(getSchema()),
    defaultValues: currentConfig || (selectedMethod === 'supabase' ? {
      method: 'supabase',
      url: '',
      anonKey: '',
      features: {
        oauthProviders: [],
        magicLinks: false,
        emailVerification: true,
        phoneAuth: false,
      }
    } : {
      method: 'database',
      provider: 'postgresql',
      enableSecurity: true,
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
      },
      sessionTimeout: 480,
      maxFailedAttempts: 5,
      accountLockDuration: 30,
    }) as AuthConfig,
  });

  // Handle method selection
  const handleMethodSelect = (method: AuthenticationMethod) => {
    setSelectedMethod(method);
    setConnectionStatus('idle');
    setConnectionError('');
    
    // Reset form with appropriate defaults
    const defaultConfig = method === 'supabase' ? {
      method: 'supabase',
      url: '',
      anonKey: '',
      features: {
        oauthProviders: [],
        magicLinks: false,
        emailVerification: true,
        phoneAuth: false,
      }
    } : {
      method: 'database',
      provider: 'postgresql',
      enableSecurity: true,
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
      },
      sessionTimeout: 480,
      maxFailedAttempts: 5,
      accountLockDuration: 30,
    };
    
    form.reset(defaultConfig as AuthConfig);
    
    if (onMethodChange) {
      onMethodChange(method, defaultConfig as AuthConfig);
    }
  };

  // Test Supabase connection
  const testSupabaseConnection = async (config: SupabaseAuthConfig) => {
    setIsTestingConnection(true);
    setConnectionStatus('testing');
    setConnectionError('');

    try {
      const response = await fetch('/api/auth/test-supabase-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: config.url,
          anonKey: config.anonKey,
          serviceRoleKey: config.serviceRoleKey,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
        setConnectionError(result.error || 'Connection test failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionError('Failed to test connection: ' + (error as Error).message);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Watch form changes and notify parent
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (onConfigChange && value) {
        onConfigChange(value as AuthConfig);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onConfigChange]);

  const renderMethodCard = (method: AuthenticationMethod) => {
    const isSelected = selectedMethod === method;
    
    const methodDetails = {
      database: {
        title: 'Database Authentication',
        description: 'Self-hosted authentication with full control over user data and security policies.',
        icon: Database,
        features: [
          'Complete data ownership',
          'Custom security policies', 
          'Multi-provider database support',
          'Enterprise-grade encryption',
          'Offline capability'
        ],
        pros: ['Full control', 'Privacy', 'Customizable'],
        cons: ['More setup', 'Self-managed'],
        complexity: 'Medium',
        badge: 'Self-Hosted'
      },
      supabase: {
        title: 'Supabase Authentication',
        description: 'Managed authentication service with OAuth, magic links, and advanced features.',
        icon: Zap,
        features: [
          'OAuth providers (Google, GitHub, etc.)',
          'Magic link authentication',
          'Phone/SMS authentication',
          'Built-in user management',
          'Real-time subscriptions'
        ],
        pros: ['Easy setup', 'Feature-rich', 'Managed'],
        cons: ['Vendor dependency', 'Pricing'],
        complexity: 'Easy',
        badge: 'Managed Service'
      }
    };

    const details = methodDetails[method];
    const Icon = details.icon;

    return (
      <Card 
        key={method}
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md",
          isSelected ? "ring-2 ring-blue-500 border-blue-200 bg-blue-50" : "hover:border-gray-300"
        )}
        onClick={() => handleMethodSelect(method)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isSelected ? "bg-blue-100" : "bg-gray-100"
              )}>
                <Icon className={cn(
                  "w-5 h-5",
                  isSelected ? "text-blue-600" : "text-gray-600"
                )} />
              </div>
              <div>
                <CardTitle className="text-lg">{details.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={isSelected ? "default" : "outline"} className="text-xs">
                    {details.badge}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {details.complexity}
                  </Badge>
                </div>
              </div>
            </div>
            {isSelected && (
              <CheckCircle className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <CardDescription className="text-sm">
            {details.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Key Features</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {details.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex gap-4 text-xs">
              <div>
                <span className="font-medium text-green-700">Pros:</span>
                <span className="text-gray-600 ml-1">{details.pros.join(', ')}</span>
              </div>
              <div>
                <span className="font-medium text-amber-700">Cons:</span>
                <span className="text-gray-600 ml-1">{details.cons.join(', ')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDatabaseConfiguration = () => {
    const config = form.getValues() as DatabaseAuthConfig;
    
    return (
      <div className="space-y-6">
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            Database authentication provides complete control over user data and security policies.
            Configure password requirements and security settings below.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Database Provider</FormLabel>
                <FormControl>
                  <select 
                    {...field} 
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="supabase">Supabase (Database)</option>
                    <option value="sqlite">SQLite</option>
                  </select>
                </FormControl>
                <FormDescription>Choose your database provider</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sessionTimeout"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session Timeout (minutes)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="480" {...field} />
                </FormControl>
                <FormDescription>User session duration (480 = 8 hours)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Password Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password Security Policy
            </CardTitle>
            <CardDescription>
              Configure password requirements for enhanced security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="passwordPolicy.minLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Password Length</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="12" {...field} />
                  </FormControl>
                  <FormDescription>Minimum characters required (recommended: 12+)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="passwordPolicy.requireUppercase"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Uppercase Letters</FormLabel>
                      <FormDescription className="text-xs">Require A-Z</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passwordPolicy.requireNumbers"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Numbers</FormLabel>
                      <FormDescription className="text-xs">Require 0-9</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        {showAdvanced && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Advanced Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxFailedAttempts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Failed Attempts</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="5" {...field} />
                      </FormControl>
                      <FormDescription>Lock account after failed attempts</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountLockDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lock Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="30" {...field} />
                      </FormControl>
                      <FormDescription>Account lockout duration</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderSupabaseConfiguration = () => {
    const config = form.getValues() as SupabaseAuthConfig;
    
    return (
      <div className="space-y-6">
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            Supabase Authentication provides managed authentication with OAuth, magic links, and advanced features.
            You'll need to create a Supabase project and obtain your keys.
          </AlertDescription>
        </Alert>

        {/* Connection Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Connection Settings
            </CardTitle>
            <CardDescription>
              Enter your Supabase project credentials. You can find these in your Supabase dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supabase URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://your-project.supabase.co" {...field} />
                  </FormControl>
                  <FormDescription>Your Supabase project URL</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="anonKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anonymous Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." {...field} />
                  </FormControl>
                  <FormDescription>Your Supabase anonymous key (safe for client-side use)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceRoleKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Role Key (Optional)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." {...field} />
                  </FormControl>
                  <FormDescription>Service role key for admin operations (keep secure)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Connection Test */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => testSupabaseConnection(config)}
                disabled={isTestingConnection || !config.url || !config.anonKey}
              >
                {isTestingConnection ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Test Connection
              </Button>

              {connectionStatus === 'success' && (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Connection successful
                </div>
              )}

              {connectionStatus === 'error' && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Connection failed
                </div>
              )}
            </div>

            {connectionError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {connectionError}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Authentication Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="w-4 h-4" />
              Authentication Features
            </CardTitle>
            <CardDescription>
              Configure which authentication methods to enable for your users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="features.emailVerification"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Email Verification</FormLabel>
                    <FormDescription>Require users to verify their email address</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="features.magicLinks"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Magic Links</FormLabel>
                    <FormDescription>Enable passwordless authentication via email</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="features.phoneAuth"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Phone Authentication</FormLabel>
                    <FormDescription>Enable login via phone number and SMS</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* OAuth Providers */}
        {showAdvanced && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">OAuth Providers</CardTitle>
              <CardDescription>
                Enable social login providers (requires configuration in Supabase dashboard)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {oauthProviders.map((provider) => (
                  <FormField
                    key={provider.id}
                    control={form.control}
                    name="features.oauthProviders"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{provider.icon}</span>
                          <FormLabel className="text-sm">{provider.name}</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value?.includes(provider.id) || false}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              const updated = checked
                                ? [...current, provider.id]
                                : current.filter(p => p !== provider.id);
                              field.onChange(updated);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Header */}
        {standalone && (
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Authentication Settings</h2>
            <p className="text-gray-600">
              Choose and configure your authentication method. You can switch between methods at any time.
            </p>
          </div>
        )}

        {/* Method Selection */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Choose Authentication Method</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select the authentication system that best fits your needs. You can change this later if needed.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderMethodCard('database')}
            {renderMethodCard('supabase')}
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {selectedMethod === 'supabase' ? 'Supabase' : 'Database'} Configuration
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Configure the settings for your selected authentication method.
            </p>
          </div>

          {selectedMethod === 'supabase' ? renderSupabaseConfiguration() : renderDatabaseConfiguration()}
        </div>

        {/* Save Button (for standalone mode) */}
        {standalone && (
          <div className="flex justify-end pt-4">
            <Button
              type="button"
              onClick={() => {
                const config = form.getValues();
                if (onConfigChange) {
                  onConfigChange(config);
                }
              }}
            >
              Save Authentication Settings
            </Button>
          </div>
        )}
      </div>
    </Form>
  );
}