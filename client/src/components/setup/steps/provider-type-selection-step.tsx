/**
 * Provider Type Selection Step
 * 
 * First step of the provider setup wizard where users select
 * the type of provider they want to configure.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Search, Database, Shield, Mail, HardDrive, Package, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepProps, ProviderType } from '../provider-setup-wizard';

interface ProviderOption {
  type: ProviderType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'database' | 'auth' | 'email' | 'storage' | 'all-in-one';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  features: string[];
  recommended?: boolean;
  estimatedSetupTime: number; // in minutes
}

const providerOptions: ProviderOption[] = [
  // All-in-one providers (recommended)
  {
    type: 'pocketbase-all-in-one',
    name: 'PocketBase',
    description: 'Complete backend solution with database, auth, API, and admin dashboard',
    icon: Package,
    category: 'all-in-one',
    difficulty: 'beginner',
    features: ['SQLite Database', 'Built-in Auth', 'Real-time API', 'Admin Dashboard', 'File Storage'],
    recommended: true,
    estimatedSetupTime: 5,
  },
  {
    type: 'supabase-all-in-one',
    name: 'Supabase',
    description: 'Open source Firebase alternative with PostgreSQL, Auth, and Storage',
    icon: Zap,
    category: 'all-in-one',
    difficulty: 'intermediate',
    features: ['PostgreSQL', 'Authentication', 'Real-time', 'Storage', 'Edge Functions'],
    recommended: true,
    estimatedSetupTime: 8,
  },
  
  // Database providers
  {
    type: 'postgresql',
    name: 'PostgreSQL',
    description: 'Advanced open source relational database',
    icon: Database,
    category: 'database',
    difficulty: 'intermediate',
    features: ['ACID Compliance', 'JSON Support', 'Full-text Search', 'Scalable'],
    estimatedSetupTime: 10,
  },
  {
    type: 'mysql',
    name: 'MySQL',
    description: 'Popular open source relational database',
    icon: Database,
    category: 'database',
    difficulty: 'intermediate',
    features: ['High Performance', 'Replication', 'Clustering', 'Web-optimized'],
    estimatedSetupTime: 10,
  },
  {
    type: 'sqlite',
    name: 'SQLite',
    description: 'Lightweight serverless database perfect for development',
    icon: Database,
    category: 'database',
    difficulty: 'beginner',
    features: ['Zero Configuration', 'Serverless', 'Self-contained', 'Cross-platform'],
    estimatedSetupTime: 3,
  },
  
  // Authentication providers
  {
    type: 'local-auth',
    name: 'Local Authentication',
    description: 'Simple username/password authentication',
    icon: Shield,
    category: 'auth',
    difficulty: 'beginner',
    features: ['Username/Password', 'Session Management', 'Password Hashing', 'Secure'],
    estimatedSetupTime: 5,
  },
  {
    type: 'jwt-local-auth',
    name: 'JWT Authentication',
    description: 'Token-based authentication with JWT',
    icon: Shield,
    category: 'auth',
    difficulty: 'intermediate',
    features: ['JWT Tokens', 'Refresh Tokens', 'Stateless', 'API-friendly'],
    estimatedSetupTime: 7,
  },
  {
    type: 'oauth2-auth',
    name: 'OAuth2 Authentication',
    description: 'Third-party authentication via OAuth2 providers',
    icon: Shield,
    category: 'auth',
    difficulty: 'advanced',
    features: ['Google Login', 'Facebook Login', 'GitHub Login', 'Custom Providers'],
    estimatedSetupTime: 12,
  },
  
  // Email providers
  {
    type: 'smtp-email',
    name: 'SMTP Email',
    description: 'Standard SMTP email service',
    icon: Mail,
    category: 'email',
    difficulty: 'beginner',
    features: ['Standard SMTP', 'Custom Server', 'TLS Support', 'Authentication'],
    estimatedSetupTime: 5,
  },
  {
    type: 'sendgrid-email',
    name: 'SendGrid',
    description: 'Professional email delivery service',
    icon: Mail,
    category: 'email',
    difficulty: 'intermediate',
    features: ['High Deliverability', 'Analytics', 'Templates', 'API Integration'],
    estimatedSetupTime: 6,
  },
  {
    type: 'resend-email',
    name: 'Resend',
    description: 'Modern email service for developers',
    icon: Mail,
    category: 'email',
    difficulty: 'intermediate',
    features: ['Developer-friendly', 'React Email', 'Analytics', 'High Performance'],
    estimatedSetupTime: 6,
  },
  
  // Storage providers
  {
    type: 'local-file-storage',
    name: 'Local File Storage',
    description: 'Store files on the local server filesystem',
    icon: HardDrive,
    category: 'storage',
    difficulty: 'beginner',
    features: ['Simple Setup', 'No External Dependencies', 'Direct Access', 'Cost-effective'],
    estimatedSetupTime: 3,
  },
  {
    type: 'aws-s3-storage',
    name: 'AWS S3',
    description: 'Amazon S3 cloud storage service',
    icon: HardDrive,
    category: 'storage',
    difficulty: 'intermediate',
    features: ['Scalable', 'CDN Integration', 'Global Distribution', 'High Durability'],
    estimatedSetupTime: 8,
  },
];

const categoryInfo = {
  'all-in-one': {
    label: 'All-in-One Solutions',
    description: 'Complete backend solutions that include multiple services',
    color: 'bg-purple-50 border-purple-200 text-purple-800',
  },
  database: {
    label: 'Database Providers',
    description: 'Data storage and management solutions',
    color: 'bg-blue-50 border-blue-200 text-blue-800',
  },
  auth: {
    label: 'Authentication Providers',
    description: 'User authentication and authorization services',
    color: 'bg-green-50 border-green-200 text-green-800',
  },
  email: {
    label: 'Email Providers',
    description: 'Email sending and delivery services',
    color: 'bg-orange-50 border-orange-200 text-orange-800',
  },
  storage: {
    label: 'Storage Providers',
    description: 'File storage and management services',
    color: 'bg-gray-50 border-gray-200 text-gray-800',
  },
};

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

export function ProviderTypeSelectionStep({
  data,
  onDataChange,
  onNext,
}: WizardStepProps) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(
    (data.providerType as ProviderType) || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Update parent component when selection changes
  useEffect(() => {
    if (selectedProvider) {
      onDataChange('provider-type', { providerType: selectedProvider });
    }
  }, [selectedProvider, onDataChange]);

  // Filter providers based on search and category
  const filteredProviders = providerOptions.filter(provider => {
    const matchesSearch = searchQuery === '' || 
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.features.some(feature => feature.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || provider.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group providers by category
  const providersByCategory = filteredProviders.reduce((acc, provider) => {
    if (!acc[provider.category]) {
      acc[provider.category] = [];
    }
    acc[provider.category].push(provider);
    return acc;
  }, {} as Record<string, ProviderOption[]>);

  // Sort categories to show all-in-one first
  const sortedCategories = Object.keys(providersByCategory).sort((a, b) => {
    if (a === 'all-in-one') return -1;
    if (b === 'all-in-one') return 1;
    return a.localeCompare(b);
  });

  const handleProviderSelect = (providerType: ProviderType) => {
    setSelectedProvider(providerType);
  };

  const handleNext = () => {
    if (selectedProvider) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search providers by name, description, or features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All Providers
          </Button>
          {Object.entries(categoryInfo).map(([category, info]) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {info.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Recommended banner */}
      {selectedCategory === 'all' && searchQuery === '' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-600" />
              <CardTitle className="text-lg text-amber-800">Recommended for Beginners</CardTitle>
            </div>
            <CardDescription className="text-amber-700">
              All-in-one solutions provide everything you need with minimal configuration.
              Perfect for getting started quickly.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Provider options */}
      <RadioGroup
        value={selectedProvider || ''}
        onValueChange={handleProviderSelect}
        className="space-y-6"
      >
        {sortedCategories.map(category => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{categoryInfo[category as keyof typeof categoryInfo].label}</h3>
              <Badge 
                variant="outline" 
                className={categoryInfo[category as keyof typeof categoryInfo].color}
              >
                {providersByCategory[category].length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {categoryInfo[category as keyof typeof categoryInfo].description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providersByCategory[category].map(provider => {
                const Icon = provider.icon;
                const isSelected = selectedProvider === provider.type;
                
                return (
                  <div key={provider.type} className="relative">
                    <RadioGroupItem
                      value={provider.type}
                      id={provider.type}
                      className="sr-only"
                    />
                    <Label
                      htmlFor={provider.type}
                      className={cn(
                        "flex cursor-pointer rounded-lg border-2 p-4 hover:bg-accent transition-colors",
                        isSelected ? "border-primary bg-primary/5" : "border-muted"
                      )}
                    >
                      <Card className="w-full border-0 shadow-none">
                        <CardHeader className="p-0 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2 rounded-md",
                                isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                              )}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-base">{provider.name}</CardTitle>
                                  {provider.recommended && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Star className="w-3 h-3 mr-1" />
                                      Recommended
                                    </Badge>
                                  )}
                                </div>
                                <CardDescription className="text-sm">
                                  {provider.description}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${difficultyColors[provider.difficulty]}`}
                              >
                                {provider.difficulty}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                ~{provider.estimatedSetupTime}min
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0 pt-3">
                          <div className="flex flex-wrap gap-1">
                            {provider.features.slice(0, 3).map(feature => (
                              <Badge key={feature} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                            {provider.features.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{provider.features.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </RadioGroup>

      {/* Selection summary */}
      {selectedProvider && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Selected Provider</CardTitle>
            <CardDescription>
              You've selected <strong>{providerOptions.find(p => p.type === selectedProvider)?.name}</strong>.
              Click Next to continue with the configuration.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={!selectedProvider}
        >
          Continue with {selectedProvider ? providerOptions.find(p => p.type === selectedProvider)?.name : 'Selected Provider'}
        </Button>
      </div>
    </div>
  );
}