/**
 * Enterprise Communication Command Center Dashboard
 * Centralized management interface for the unified communication system
 * Real-time monitoring, provider health, template management, and campaign orchestration
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import CommunicationRealTimeMonitor from './communication-real-time-monitor';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Settings,
  TrendingUp,
  Users,
  Zap,
  BarChart3,
  Shield,
  RefreshCw,
  Eye,
  Edit,
  Play,
  Pause,
  Send
} from 'lucide-react';

// Types for the unified communication system
interface ProviderStatus {
  id: string;
  providerType: 'email' | 'sms' | 'whatsapp';
  providerName: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  isActive: boolean;
  isTenantDefault: boolean;
  isEventOverride: boolean;
  lastHealthCheck?: Date;
  latency?: number;
  errorRate: number;
  successRate: number;
  testResults: {
    lastTest?: Date;
    success: boolean;
    errorMessage?: string;
  };
}

interface TemplateStatus {
  id: string;
  category: string;
  channel: 'email' | 'sms' | 'whatsapp';
  templateType: 'platform' | 'tenant' | 'event';
  name: string;
  isActive: boolean;
  version: number;
  usageCount: number;
  lastUsed?: Date;
}

interface CampaignStatus {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed';
  targetAudience: number;
  sent: number;
  delivered: number;
  opened?: number;
  clicked?: number;
  scheduledAt?: Date;
  completedAt?: Date;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  providers: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
  };
  templates: {
    active: number;
    inactive: number;
    total: number;
  };
  campaigns: {
    active: number;
    completed: number;
    failed: number;
    total: number;
  };
  performance: {
    avgResponseTime: number;
    errorRate: number;
    throughput: number;
  };
}

export const CommunicationCommandCenter: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [templates, setTemplates] = useState<TemplateStatus[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  // Fetch system data
  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedEvent]);

  const fetchSystemData = async () => {
    try {
      setRefreshing(true);
      
      // Simulate API calls to unified communication system
      const healthResponse = await fetch(`/api/v2/communication/health${selectedEvent ? `?eventId=${selectedEvent}` : ''}`);
      const providersResponse = await fetch(`/api/v2/communication/providers${selectedEvent ? `?eventId=${selectedEvent}` : ''}`);
      const templatesResponse = await fetch(`/api/v2/communication/templates${selectedEvent ? `?eventId=${selectedEvent}` : ''}`);
      const campaignsResponse = await fetch(`/api/v2/communication/campaigns${selectedEvent ? `?eventId=${selectedEvent}` : ''}`);

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setSystemHealth(healthData.data);
      }

      if (providersResponse.ok) {
        const providersData = await providersResponse.json();
        setProviders(providersData.data.providers);
      }

      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData.data.templates);
      }

      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        setCampaigns(campaignsData.data.campaigns);
      }

    } catch (error) {
      console.error('Failed to fetch system data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const testProvider = async (providerId: string) => {
    try {
      const response = await fetch(`/api/v2/communication/providers/${providerId}/test`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await fetchSystemData(); // Refresh data after test
      }
    } catch (error) {
      console.error('Failed to test provider:', error);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      case 'unhealthy': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Communication Command Center</h1>
          <p className="text-gray-600 mt-1">Enterprise communication system monitoring and management</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSystemData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="default" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge className={getHealthStatusColor(systemHealth.overall)}>
                  {systemHealth.overall}
                </Badge>
                {systemHealth.overall === 'healthy' && <CheckCircle className="h-4 w-4 text-green-600" />}
                {systemHealth.overall === 'degraded' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                {systemHealth.overall === 'critical' && <AlertCircle className="h-4 w-4 text-red-600" />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Provider Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {systemHealth.providers.healthy}/{systemHealth.providers.total}
              </div>
              <p className="text-xs text-gray-600">healthy providers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {systemHealth.performance.avgResponseTime}ms
              </div>
              <p className="text-xs text-gray-600">avg response time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Throughput
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {systemHealth.performance.throughput}
              </div>
              <p className="text-xs text-gray-600">msgs/hour</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Provider Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {providers.slice(0, 5).map((provider) => (
                    <div key={provider.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getProviderIcon(provider.providerType)}
                        <span className="text-sm">{provider.providerName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={provider.successRate} className="w-16 h-2" />
                        <span className="text-sm">{provider.successRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Template Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {templates.slice(0, 5).map((template) => (
                    <div key={template.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getProviderIcon(template.channel)}
                        <span className="text-sm">{template.name}</span>
                      </div>
                      <span className="text-sm font-medium">{template.usageCount} uses</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Real-time Tab */}
        <TabsContent value="realtime">
          <CommunicationRealTimeMonitor />
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          <div className="grid gap-4">
            {providers.map((provider) => (
              <Card key={provider.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getProviderIcon(provider.providerType)}
                        <span className="font-medium">{provider.providerName}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {provider.providerType.toUpperCase()}
                      </Badge>
                      {provider.isTenantDefault && (
                        <Badge variant="secondary" className="text-xs">Tenant Default</Badge>
                      )}
                      {provider.isEventOverride && (
                        <Badge variant="secondary" className="text-xs">Event Override</Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right text-sm">
                        <div className="flex items-center space-x-2">
                          <Badge className={getHealthStatusColor(provider.healthStatus)}>
                            {provider.healthStatus}
                          </Badge>
                        </div>
                        {provider.latency && (
                          <p className="text-gray-600">{provider.latency}ms latency</p>
                        )}
                      </div>

                      <div className="text-right text-sm">
                        <div className="text-green-600 font-medium">
                          {provider.successRate.toFixed(1)}% success
                        </div>
                        <div className="text-red-600">
                          {provider.errorRate.toFixed(1)}% errors
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testProvider(provider.id)}
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {provider.testResults.lastTest && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Last tested: {new Date(provider.testResults.lastTest).toLocaleString()}</span>
                        {provider.testResults.errorMessage && (
                          <span className="text-red-600">{provider.testResults.errorMessage}</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getProviderIcon(template.channel)}
                        <span className="font-medium">{template.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {template.templateType}
                      </Badge>
                      <span className="text-sm text-gray-600">v{template.version}</span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right text-sm">
                        <div className="font-medium">{template.usageCount} uses</div>
                        {template.lastUsed && (
                          <p className="text-gray-600">
                            Last used: {new Date(template.lastUsed).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{campaign.name}</span>
                      <Badge 
                        variant={campaign.status === 'sent' ? 'default' : 
                                campaign.status === 'failed' ? 'destructive' : 'secondary'}
                      >
                        {campaign.status}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right text-sm">
                        <div className="font-medium">
                          {campaign.sent}/{campaign.targetAudience} sent
                        </div>
                        <Progress 
                          value={(campaign.sent / campaign.targetAudience) * 100} 
                          className="w-24 h-2 mt-1"
                        />
                      </div>

                      {campaign.delivered > 0 && (
                        <div className="text-right text-sm">
                          <div className="text-green-600">{campaign.delivered} delivered</div>
                          {campaign.opened && (
                            <div className="text-blue-600">{campaign.opened} opened</div>
                          )}
                        </div>
                      )}

                      <div className="flex space-x-2">
                        {campaign.status === 'draft' && (
                          <Button variant="outline" size="sm">
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        )}
                        {campaign.status === 'sending' && (
                          <Button variant="outline" size="sm">
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>

                  {(campaign.scheduledAt || campaign.completedAt) && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        {campaign.scheduledAt && (
                          <span>Scheduled: {new Date(campaign.scheduledAt).toLocaleString()}</span>
                        )}
                        {campaign.completedAt && (
                          <span>Completed: {new Date(campaign.completedAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

      </Tabs>

      {/* System Alerts */}
      {systemHealth?.overall !== 'healthy' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            System performance is {systemHealth?.overall}. Check provider health and configuration.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default CommunicationCommandCenter;