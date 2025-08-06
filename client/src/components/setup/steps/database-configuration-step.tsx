/**
 * Database Configuration Step
 * 
 * Configuration step for database providers including PostgreSQL, MySQL,
 * SQLite, and all-in-one solutions like PocketBase and Supabase.
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
  Database, 
  Server, 
  Key, 
  Shield, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepProps, ProviderType } from '../provider-setup-wizard';
import { post } from '@/lib/api-utils';
import { useToast } from '@/hooks/use-toast';

// Configuration schemas for different provider types
const postgresqlSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().min(1).max(65535).default(5432),
  database: z.string().min(1, 'Database name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  ssl: z.boolean().default(true),
  maxConnections: z.coerce.number().min(1).max(100).default(10),
  connectionTimeout: z.coerce.number().min(1000).max(60000).default(30000),
  schema: z.string().default('public'),
});

const mysqlSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().min(1).max(65535).default(3306),
  database: z.string().min(1, 'Database name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  ssl: z.boolean().default(true),
  maxConnections: z.coerce.number().min(1).max(100).default(10),
  connectionTimeout: z.coerce.number().min(1000).max(60000).default(30000),
  charset: z.string().default('utf8mb4'),
});

const sqliteSchema = z.object({
  filename: z.string().min(1, 'Database filename is required'),
  enableWAL: z.boolean().default(true),
  enableForeignKeys: z.boolean().default(true),
  busyTimeout: z.coerce.number().min(1000).max(60000).default(30000),
});

const pocketbaseSchema = z.object({
  url: z.string().url('Valid PocketBase URL is required'),
  adminEmail: z.string().email('Valid admin email is required'),
  adminPassword: z.string().min(8, 'Admin password must be at least 8 characters'),
  enableAutoBackup: z.boolean().default(true),
  backupInterval: z.coerce.number().min(1).max(24).default(6),
});

const supabaseSchema = z.object({
  supabaseUrl: z.string().url('Valid Supabase URL is required'),
  supabaseKey: z.string().min(1, 'Supabase anon key is required'),
  serviceRoleKey: z.string().optional(),
  enableRLS: z.boolean().default(true),
  enableRealtime: z.boolean().default(true),
});

type DatabaseConfig = 
  | z.infer<typeof postgresqlSchema>
  | z.infer<typeof mysqlSchema>
  | z.infer<typeof sqliteSchema>
  | z.infer<typeof pocketbaseSchema>
  | z.infer<typeof supabaseSchema>;

interface DatabaseConfigurationStepProps extends WizardStepProps {
  providerType?: ProviderType;
}

export function DatabaseConfigurationStep({
  data,
  onDataChange,
  providerType,
}: DatabaseConfigurationStepProps) {
  const { toast } = useToast();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Determine schema based on provider type
  const getSchema = () => {
    switch (providerType) {
      case 'postgresql':
      case 'supabase-db':
        return postgresqlSchema;
      case 'mysql':
        return mysqlSchema;
      case 'sqlite':
      case 'pocketbase-db':
        return sqliteSchema;
      case 'pocketbase-all-in-one':
        return pocketbaseSchema;
      case 'supabase-all-in-one':
        return supabaseSchema;
      default:
        return postgresqlSchema;
    }
  };

  const schema = getSchema();
  const form = useForm<DatabaseConfig>({
    resolver: zodResolver(schema),
    defaultValues: data as DatabaseConfig || {},
  });

  // Update parent component when form data changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      onDataChange('database-config', value);
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  // Test database connection
  const testConnection = async () => {
    try {
      setIsTestingConnection(true);
      setConnectionTestResult(null);

      const formData = form.getValues();
      const response = await post('/api/providers/test-connection', {
        providerType,
        config: formData,
      });

      setConnectionTestResult({
        success: response.data.success,
        message: response.data.message || 'Connection successful!',
      });

      if (response.data.success) {
        toast({
          title: 'Connection Successful',
          description: 'Database connection test passed.',
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: response.data.message || 'Unable to connect to database.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionTestResult({
        success: false,
        message: 'Connection test failed. Please check your configuration.',
      });
      toast({
        title: 'Connection Test Error',
        description: 'Unable to test database connection.',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Get provider-specific configuration fields
  const renderConfigurationFields = () => {
    switch (providerType) {
      case 'postgresql':
      case 'supabase-db':
        return renderPostgreSQLFields();
      case 'mysql':
        return renderMySQLFields();
      case 'sqlite':
      case 'pocketbase-db':
        return renderSQLiteFields();
      case 'pocketbase-all-in-one':
        return renderPocketBaseFields();
      case 'supabase-all-in-one':
        return renderSupabaseFields();
      default:
        return renderPostgreSQLFields();
    }
  };

  const renderPostgreSQLFields = () => (
    <Tabs defaultValue="connection" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="connection">Connection</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>

      <TabsContent value="connection" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="host"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Host</FormLabel>
                <FormControl>
                  <Input placeholder="localhost" {...field} />
                </FormControl>
                <FormDescription>PostgreSQL server hostname or IP address</FormDescription>
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
                  <Input type="number" placeholder="5432" {...field} />
                </FormControl>
                <FormDescription>PostgreSQL server port (default: 5432)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="database"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Database Name</FormLabel>
              <FormControl>
                <Input placeholder="rsvp_platform" {...field} />
              </FormControl>
              <FormDescription>Name of the database to connect to</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="postgres" {...field} />
                </FormControl>
                <FormDescription>Database username</FormDescription>
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
                <FormDescription>Database password</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </TabsContent>

      <TabsContent value="security" className="space-y-4">
        <FormField
          control={form.control}
          name="ssl"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable SSL</FormLabel>
                <FormDescription>
                  Use SSL/TLS encryption for database connections (recommended for production)
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="schema"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Schema</FormLabel>
              <FormControl>
                <Input placeholder="public" {...field} />
              </FormControl>
              <FormDescription>PostgreSQL schema to use (default: public)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="advanced" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxConnections"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Connections</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="10" {...field} />
                </FormControl>
                <FormDescription>Maximum number of database connections</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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
        </div>
      </TabsContent>
    </Tabs>
  );

  const renderMySQLFields = () => (
    <Tabs defaultValue="connection" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="connection">Connection</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>

      <TabsContent value="connection" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="host"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Host</FormLabel>
                <FormControl>
                  <Input placeholder="localhost" {...field} />
                </FormControl>
                <FormDescription>MySQL server hostname or IP address</FormDescription>
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
                  <Input type="number" placeholder="3306" {...field} />
                </FormControl>
                <FormDescription>MySQL server port (default: 3306)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="database"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Database Name</FormLabel>
              <FormControl>
                <Input placeholder="rsvp_platform" {...field} />
              </FormControl>
              <FormDescription>Name of the database to connect to</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="root" {...field} />
                </FormControl>
                <FormDescription>Database username</FormDescription>
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
                <FormDescription>Database password</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </TabsContent>

      <TabsContent value="security" className="space-y-4">
        <FormField
          control={form.control}
          name="ssl"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable SSL</FormLabel>
                <FormDescription>
                  Use SSL/TLS encryption for database connections
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="charset"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Character Set</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select character set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utf8mb4">utf8mb4 (recommended)</SelectItem>
                    <SelectItem value="utf8">utf8</SelectItem>
                    <SelectItem value="latin1">latin1</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>MySQL character set (utf8mb4 recommended for full Unicode support)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="advanced" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxConnections"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Connections</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="10" {...field} />
                </FormControl>
                <FormDescription>Maximum number of database connections</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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
        </div>
      </TabsContent>
    </Tabs>
  );

  const renderSQLiteFields = () => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="filename"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Database File</FormLabel>
            <FormControl>
              <Input placeholder="./data/rsvp_platform.db" {...field} />
            </FormControl>
            <FormDescription>Path to the SQLite database file</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="enableWAL"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable WAL Mode</FormLabel>
                <FormDescription>
                  Write-Ahead Logging improves concurrent access (recommended)
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableForeignKeys"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Foreign Keys</FormLabel>
                <FormDescription>
                  Enforce foreign key constraints (recommended)
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="busyTimeout"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Busy Timeout (ms)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="30000" {...field} />
              </FormControl>
              <FormDescription>How long to wait for locked database access</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderPocketBaseFields = () => (
    <Tabs defaultValue="connection" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="connection">Connection</TabsTrigger>
        <TabsTrigger value="admin">Admin Setup</TabsTrigger>
      </TabsList>

      <TabsContent value="connection" className="space-y-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PocketBase URL</FormLabel>
              <FormControl>
                <Input placeholder="http://localhost:8090" {...field} />
              </FormControl>
              <FormDescription>
                URL of your PocketBase server. Use http://localhost:8090 for local development.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            If you don't have PocketBase running yet, the setup wizard will help you download and configure it automatically.
          </AlertDescription>
        </Alert>
      </TabsContent>

      <TabsContent value="admin" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="adminEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Admin Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="admin@example.com" {...field} />
                </FormControl>
                <FormDescription>Email address for the PocketBase admin account</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="adminPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Admin Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormDescription>Password for the PocketBase admin account (min 8 characters)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="enableAutoBackup"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Auto Backup</FormLabel>
                <FormDescription>
                  Automatically backup your PocketBase data at regular intervals
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch('enableAutoBackup') && (
          <FormField
            control={form.control}
            name="backupInterval"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Backup Interval (hours)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="6" {...field} />
                </FormControl>
                <FormDescription>How often to create automatic backups</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </TabsContent>
    </Tabs>
  );

  const renderSupabaseFields = () => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="supabaseUrl"
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
        name="supabaseKey"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Supabase Anon Key</FormLabel>
            <FormControl>
              <Input placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." {...field} />
            </FormControl>
            <FormDescription>Your Supabase anonymous/public key</FormDescription>
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
              <Input placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." {...field} />
            </FormControl>
            <FormDescription>Your Supabase service role key (for admin operations)</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="enableRLS"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Row Level Security</FormLabel>
                <FormDescription>
                  Use Supabase RLS for data access control (recommended)
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableRealtime"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Realtime</FormLabel>
                <FormDescription>
                  Enable Supabase realtime subscriptions for live updates
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          You can find your Supabase URL and keys in your project's API settings page.
        </AlertDescription>
      </Alert>
    </div>
  );

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Provider info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              <CardTitle>Database Configuration</CardTitle>
              <Badge variant="outline">{providerType}</Badge>
            </div>
            <CardDescription>
              Configure your database connection settings. All sensitive information is encrypted and stored securely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderConfigurationFields()}
          </CardContent>
        </Card>

        {/* Connection test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Test Connection
            </CardTitle>
            <CardDescription>
              Test your database connection before proceeding with the setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              onClick={testConnection}
              disabled={isTestingConnection || !form.formState.isValid}
              className="w-full"
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  Test Database Connection
                </>
              )}
            </Button>

            {connectionTestResult && (
              <Alert variant={connectionTestResult.success ? 'default' : 'destructive'}>
                {connectionTestResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {connectionTestResult.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}