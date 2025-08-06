/**
 * Storage Configuration Step
 * 
 * Configuration step for storage providers including local file storage,
 * AWS S3, and all-in-one solutions.
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
  HardDrive, 
  Cloud, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle,
  Info,
  ExternalLink,
  FolderOpen,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepProps, ProviderType } from '../provider-setup-wizard';
import { post } from '@/lib/api-utils';
import { useToast } from '@/hooks/use-toast';

// Configuration schemas for different storage provider types
const localFileStorageSchema = z.object({
  storageDirectory: z.string().min(1, 'Storage directory is required'),
  maxFileSize: z.coerce.number().min(1).max(1073741824).default(10485760), // 10MB default
  allowedExtensions: z.array(z.string()).default(['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx']),
  enableThumbnails: z.boolean().default(true),
  thumbnailSizes: z.array(z.object({
    name: z.string(),
    width: z.number(),
    height: z.number(),
  })).default([
    { name: 'thumbnail', width: 150, height: 150 },
    { name: 'medium', width: 300, height: 300 },
    { name: 'large', width: 800, height: 600 },
  ]),
  enableCompression: z.boolean().default(true),
  compressionQuality: z.coerce.number().min(10).max(100).default(85),
});

const awsS3StorageSchema = z.object({
  accessKeyId: z.string().min(1, 'AWS Access Key ID is required'),
  secretAccessKey: z.string().min(1, 'AWS Secret Access Key is required'),
  region: z.string().min(1, 'AWS Region is required'),
  bucketName: z.string().min(1, 'S3 Bucket Name is required'),
  endpoint: z.string().url().optional(),
  forcePathStyle: z.boolean().default(false),
  maxFileSize: z.coerce.number().min(1).max(5368709120).default(52428800), // 50MB default
  allowedExtensions: z.array(z.string()).default(['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx']),
  enableCDN: z.boolean().default(false),
  cdnUrl: z.string().url().optional(),
  enableVersioning: z.boolean().default(false),
  storageClass: z.enum(['STANDARD', 'STANDARD_IA', 'ONEZONE_IA', 'GLACIER']).default('STANDARD'),
});

const supabaseStorageSchema = z.object({
  supabaseUrl: z.string().url('Valid Supabase URL is required'),
  supabaseKey: z.string().min(1, 'Supabase service role key is required'),
  bucketName: z.string().min(1, 'Storage bucket name is required'),
  maxFileSize: z.coerce.number().min(1).max(52428800).default(10485760), // 10MB default
  allowedExtensions: z.array(z.string()).default(['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx']),
  enableImageTransformation: z.boolean().default(true),
  enableRLS: z.boolean().default(true),
  publicBucket: z.boolean().default(false),
});

const pocketbaseStorageSchema = z.object({
  maxFileSize: z.coerce.number().min(1).max(52428800).default(10485760), // 10MB default
  allowedExtensions: z.array(z.string()).default(['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx']),
  enableImageResizing: z.boolean().default(true),
  enableImageOptimization: z.boolean().default(true),
  enableThumbnails: z.boolean().default(true),
  thumbSizes: z.array(z.string()).default(['100x100', '300x300', '800x600']),
});

type StorageConfig = 
  | z.infer<typeof localFileStorageSchema>
  | z.infer<typeof awsS3StorageSchema>
  | z.infer<typeof supabaseStorageSchema>
  | z.infer<typeof pocketbaseStorageSchema>;

interface StorageConfigurationStepProps extends WizardStepProps {
  providerType?: ProviderType;
}

const commonFileExtensions = [
  { value: '.jpg', label: 'JPEG Images (.jpg)' },
  { value: '.jpeg', label: 'JPEG Images (.jpeg)' },
  { value: '.png', label: 'PNG Images (.png)' },
  { value: '.gif', label: 'GIF Images (.gif)' },
  { value: '.webp', label: 'WebP Images (.webp)' },
  { value: '.svg', label: 'SVG Images (.svg)' },
  { value: '.pdf', label: 'PDF Documents (.pdf)' },
  { value: '.doc', label: 'Word Documents (.doc)' },
  { value: '.docx', label: 'Word Documents (.docx)' },
  { value: '.txt', label: 'Text Files (.txt)' },
  { value: '.csv', label: 'CSV Files (.csv)' },
  { value: '.xlsx', label: 'Excel Files (.xlsx)' },
  { value: '.mp4', label: 'MP4 Videos (.mp4)' },
  { value: '.mp3', label: 'MP3 Audio (.mp3)' },
];

const awsRegions = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'eu-west-2', label: 'Europe (London)' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
];

export function StorageConfigurationStep({
  data,
  onDataChange,
  providerType,
}: StorageConfigurationStepProps) {
  const { toast } = useToast();
  const [isTestingStorage, setIsTestingStorage] = useState(false);
  const [storageTestResult, setStorageTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Determine schema based on provider type
  const getSchema = () => {
    switch (providerType) {
      case 'local-file-storage':
        return localFileStorageSchema;
      case 'aws-s3-storage':
        return awsS3StorageSchema;
      case 'supabase-storage':
      case 'supabase-all-in-one':
        return supabaseStorageSchema;
      case 'pocketbase-storage':
      case 'pocketbase-all-in-one':
        return pocketbaseStorageSchema;
      default:
        return localFileStorageSchema;
    }
  };

  const schema = getSchema();
  const form = useForm<StorageConfig>({
    resolver: zodResolver(schema),
    defaultValues: data as StorageConfig || {},
  });

  // Update parent component when form data changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      onDataChange('storage-config', value);
    });
    return () => subscription.unsubscribe();
  }, [form, onDataChange]);

  // Test storage configuration
  const testStorageConfiguration = async () => {
    try {
      setIsTestingStorage(true);
      setStorageTestResult(null);

      const formData = form.getValues();
      const response = await post('/api/providers/test-storage', {
        providerType,
        config: formData,
      });

      setStorageTestResult({
        success: response.data.success,
        message: response.data.message || 'Storage configuration test passed!',
      });

      if (response.data.success) {
        toast({
          title: 'Storage Test Successful',
          description: 'Storage configuration is working correctly.',
        });
      } else {
        toast({
          title: 'Storage Test Failed',
          description: response.data.message || 'Unable to connect to storage.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Storage test error:', error);
      setStorageTestResult({
        success: false,
        message: 'Storage test failed. Please check your configuration.',
      });
      toast({
        title: 'Storage Test Error',
        description: 'Unable to test storage configuration.',
        variant: 'destructive',
      });
    } finally {
      setIsTestingStorage(false);
    }
  };

  // Get provider-specific configuration fields
  const renderConfigurationFields = () => {
    switch (providerType) {
      case 'local-file-storage':
        return renderLocalFileStorageFields();
      case 'aws-s3-storage':
        return renderAWSS3Fields();
      case 'supabase-storage':
      case 'supabase-all-in-one':
        return renderSupabaseStorageFields();
      case 'pocketbase-storage':
      case 'pocketbase-all-in-one':
        return renderPocketBaseStorageFields();
      default:
        return renderLocalFileStorageFields();
    }
  };

  const renderLocalFileStorageFields = () => (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic">Basic Settings</TabsTrigger>
        <TabsTrigger value="files">File Settings</TabsTrigger>
        <TabsTrigger value="optimization">Optimization</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4">
        <FormField
          control={form.control}
          name="storageDirectory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Storage Directory</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input placeholder="./uploads" {...field} />
                  <Button type="button" variant="outline" size="icon">
                    <FolderOpen className="w-4 h-4" />
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                Directory path where uploaded files will be stored (relative to server root)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Make sure the storage directory exists and has proper write permissions for the server process.
          </AlertDescription>
        </Alert>
      </TabsContent>

      <TabsContent value="files" className="space-y-4">
        <FormField
          control={form.control}
          name="maxFileSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum File Size (bytes)</FormLabel>
              <FormControl>
                <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select max file size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1048576">1 MB</SelectItem>
                    <SelectItem value="5242880">5 MB</SelectItem>
                    <SelectItem value="10485760">10 MB</SelectItem>
                    <SelectItem value="52428800">50 MB</SelectItem>
                    <SelectItem value="104857600">100 MB</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>Maximum file size allowed for uploads</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Label className="text-base font-medium">Allowed File Extensions</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Select which file types users can upload
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {commonFileExtensions.map((extension) => (
              <div key={extension.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={extension.value}
                  className="rounded border-input"
                  defaultChecked={form.watch('allowedExtensions')?.includes(extension.value)}
                  onChange={(e) => {
                    const current = form.getValues('allowedExtensions') || [];
                    if (e.target.checked) {
                      form.setValue('allowedExtensions', [...current, extension.value]);
                    } else {
                      form.setValue('allowedExtensions', current.filter(ext => ext !== extension.value));
                    }
                  }}
                />
                <Label htmlFor={extension.value} className="text-sm">
                  {extension.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="optimization" className="space-y-4">
        <FormField
          control={form.control}
          name="enableThumbnails"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Thumbnails</FormLabel>
                <FormDescription>Automatically generate thumbnails for images</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableCompression"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Image Compression</FormLabel>
                <FormDescription>Compress images to reduce file size</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch('enableCompression') && (
          <FormField
            control={form.control}
            name="compressionQuality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Compression Quality (%)</FormLabel>
                <FormControl>
                  <Input type="number" min="10" max="100" placeholder="85" {...field} />
                </FormControl>
                <FormDescription>Image compression quality (10-100, higher = better quality)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </TabsContent>
    </Tabs>
  );

  const renderAWSS3Fields = () => (
    <Tabs defaultValue="credentials" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="credentials">Credentials</TabsTrigger>
        <TabsTrigger value="bucket">Bucket</TabsTrigger>
        <TabsTrigger value="files">File Settings</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>

      <TabsContent value="credentials" className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You can find your AWS credentials in the AWS Console under IAM → Users → Security Credentials.
            <Button variant="link" className="p-0 h-auto ml-2" asChild>
              <a href="https://console.aws.amazon.com/iam/" target="_blank" rel="noopener noreferrer">
                AWS Console <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="accessKeyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Key ID</FormLabel>
                <FormControl>
                  <Input placeholder="AKIAIOSFODNN7EXAMPLE" {...field} />
                </FormControl>
                <FormDescription>AWS Access Key ID</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="secretAccessKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secret Access Key</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" {...field} />
                </FormControl>
                <FormDescription>AWS Secret Access Key</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="region"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AWS Region</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select AWS region" />
                  </SelectTrigger>
                  <SelectContent>
                    {awsRegions.map((region) => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>AWS region where your S3 bucket is located</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="bucket" className="space-y-4">
        <FormField
          control={form.control}
          name="bucketName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>S3 Bucket Name</FormLabel>
              <FormControl>
                <Input placeholder="my-rsvp-platform-uploads" {...field} />
              </FormControl>
              <FormDescription>Name of the S3 bucket for file storage</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="storageClass"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Storage Class</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select storage class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard (most frequently accessed)</SelectItem>
                    <SelectItem value="STANDARD_IA">Standard-IA (infrequently accessed)</SelectItem>
                    <SelectItem value="ONEZONE_IA">One Zone-IA (lower cost, less resilient)</SelectItem>
                    <SelectItem value="GLACIER">Glacier (archival)</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>S3 storage class for cost optimization</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableVersioning"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Versioning</FormLabel>
                <FormDescription>Keep multiple versions of files (additional cost)</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="files" className="space-y-4">
        <FormField
          control={form.control}
          name="maxFileSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum File Size</FormLabel>
              <FormControl>
                <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select max file size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10485760">10 MB</SelectItem>
                    <SelectItem value="52428800">50 MB</SelectItem>
                    <SelectItem value="104857600">100 MB</SelectItem>
                    <SelectItem value="524288000">500 MB</SelectItem>
                    <SelectItem value="1073741824">1 GB</SelectItem>
                    <SelectItem value="5368709120">5 GB (S3 maximum for single upload)</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>Maximum file size allowed for uploads</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="advanced" className="space-y-4">
        <FormField
          control={form.control}
          name="enableCDN"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable CDN</FormLabel>
                <FormDescription>Use CloudFront or custom CDN for faster file delivery</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch('enableCDN') && (
          <FormField
            control={form.control}
            name="cdnUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CDN URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://d123456789.cloudfront.net" {...field} />
                </FormControl>
                <FormDescription>CloudFront distribution URL or custom CDN URL</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="endpoint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom Endpoint (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://s3-compatible-service.com" {...field} />
              </FormControl>
              <FormDescription>Use for S3-compatible services like DigitalOcean Spaces</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="forcePathStyle"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Force Path Style</FormLabel>
                <FormDescription>Use path-style URLs instead of virtual-hosted-style</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </TabsContent>
    </Tabs>
  );

  const renderSupabaseStorageFields = () => (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Supabase Storage provides secure file storage with built-in image transformations and CDN.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <FormLabel>Service Role Key</FormLabel>
              <FormControl>
                <Input type="password" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." {...field} />
              </FormControl>
              <FormDescription>Service role key for admin operations</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="bucketName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Storage Bucket Name</FormLabel>
            <FormControl>
              <Input placeholder="uploads" {...field} />
            </FormControl>
            <FormDescription>Name of the Supabase storage bucket</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="maxFileSize"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Maximum File Size</FormLabel>
            <FormControl>
              <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select max file size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1048576">1 MB</SelectItem>
                  <SelectItem value="5242880">5 MB</SelectItem>
                  <SelectItem value="10485760">10 MB</SelectItem>
                  <SelectItem value="52428800">50 MB (Supabase free tier limit)</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormDescription>Maximum file size allowed for uploads</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="enableImageTransformation"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Image Transformations</FormLabel>
                <FormDescription>Automatically resize and optimize images</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableRLS"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Row Level Security</FormLabel>
                <FormDescription>Use Supabase RLS for file access control</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="publicBucket"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Public Bucket</FormLabel>
                <FormDescription>Make files publicly accessible (not recommended for sensitive files)</FormDescription>
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

  const renderPocketBaseStorageFields = () => (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          PocketBase provides built-in file storage with automatic image resizing and optimization.
        </AlertDescription>
      </Alert>

      <FormField
        control={form.control}
        name="maxFileSize"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Maximum File Size</FormLabel>
            <FormControl>
              <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select max file size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1048576">1 MB</SelectItem>
                  <SelectItem value="5242880">5 MB</SelectItem>
                  <SelectItem value="10485760">10 MB</SelectItem>
                  <SelectItem value="52428800">50 MB</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormDescription>Maximum file size allowed for uploads</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="enableImageResizing"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Image Resizing</FormLabel>
                <FormDescription>Automatically resize images on upload</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableImageOptimization"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Image Optimization</FormLabel>
                <FormDescription>Optimize images for web delivery</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enableThumbnails"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Thumbnails</FormLabel>
                <FormDescription>Generate thumbnails for images</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {form.watch('enableThumbnails') && (
        <div>
          <Label className="text-base font-medium">Thumbnail Sizes</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Configure thumbnail sizes (format: WIDTHxHEIGHT)
          </p>
          <div className="space-y-2">
            {form.watch('thumbSizes')?.map((size, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={size}
                  onChange={(e) => {
                    const sizes = [...(form.getValues('thumbSizes') || [])];
                    sizes[index] = e.target.value;
                    form.setValue('thumbSizes', sizes);
                  }}
                  placeholder="300x300"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const sizes = form.getValues('thumbSizes') || [];
                    sizes.splice(index, 1);
                    form.setValue('thumbSizes', sizes);
                  }}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const sizes = form.getValues('thumbSizes') || [];
                form.setValue('thumbSizes', [...sizes, '300x300']);
              }}
            >
              Add Thumbnail Size
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Provider info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              <CardTitle>Storage Configuration</CardTitle>
              <Badge variant="outline">{providerType}</Badge>
            </div>
            <CardDescription>
              Configure your file storage settings. All sensitive information is encrypted and stored securely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderConfigurationFields()}
          </CardContent>
        </Card>

        {/* Storage test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Test Storage Configuration
            </CardTitle>
            <CardDescription>
              Test your storage configuration to ensure it's working correctly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              onClick={testStorageConfiguration}
              disabled={isTestingStorage || !form.formState.isValid}
              className="w-full"
            >
              {isTestingStorage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing Storage...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Test Storage Configuration
                </>
              )}
            </Button>

            {storageTestResult && (
              <Alert variant={storageTestResult.success ? 'default' : 'destructive'}>
                {storageTestResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {storageTestResult.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Storage recommendations */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <CardTitle className="text-green-800">Storage Best Practices</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-green-700">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Set appropriate file size limits to prevent abuse</li>
              <li>Use file type validation to only allow necessary formats</li>
              <li>Enable image optimization to reduce bandwidth usage</li>
              <li>Consider using CDN for better global performance</li>
              <li>Regularly backup your storage data</li>
              <li>Monitor storage usage and costs</li>
              <li>Use secure access controls for sensitive files</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}