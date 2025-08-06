/**
 * Communication Dashboard Component
 * Comprehensive analytics dashboard for email, SMS, and WhatsApp communications
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  Mail,
  MessageSquare,
  Phone,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  MousePointer,
  Reply,
  DollarSign,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';

// Types
interface ChannelMetrics {
  channel: string;
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  failed: number;
  unsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  unsubscribeRate: number;
  cost: number;
  avgDeliveryTime: number;
}

interface TimeSeriesData {
  timestamp: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  cost: number;
}

interface ABTestResult {
  variantId: string;
  variantName: string;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  };
  confidenceInterval: {
    lower: number;
    upper: number;
    significantDifference: boolean;
  };
}

interface AudienceInsights {
  demographics: {
    countries: Record<string, number>;
    devices: Record<string, number>;
    browsers: Record<string, number>;
    os: Record<string, number>;
  };
  engagement: {
    bestTimeOfDay: Array<{ hour: number; engagement: number }>;
    bestDayOfWeek: Array<{ day: string; engagement: number }>;
    avgSessionDuration: number;
  };
  preferences: {
    preferredChannels: Record<string, number>;
    contentCategories: Record<string, number>;
  };
}

// Component Props
interface CommunicationDashboardProps {
  eventId: string;
  onExport?: (data: any, format: string) => void;
}

// Channel Icons
const getChannelIcon = (channel: string) => {
  switch (channel) {
    case 'email': return Mail;
    case 'sms': return MessageSquare;
    case 'whatsapp': return Phone;
    default: return MessageSquare;
  }
};

// Channel Colors
const channelColors = {
  email: '#3B82F6',
  sms: '#10B981',
  whatsapp: '#F59E0B',
  push: '#8B5CF6'
};

// Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  description?: string;
}> = ({ title, value, change, icon: Icon, color = 'blue', description }) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="flex flex-col items-end">
            <Icon className={`w-8 h-8 text-${color}-500`} />
            {change !== undefined && (
              <div className={`flex items-center mt-2 text-xs ${
                change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {Math.abs(change)}%
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Chart Component
const MetricsChart: React.FC<{
  data: TimeSeriesData[];
  metrics: string[];
  title: string;
  type?: 'line' | 'area' | 'bar';
}> = ({ data, metrics, title, type = 'line' }) => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (type === 'area') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number, name: string) => [value.toLocaleString(), name]}
              />
              <Legend />
              {metrics.map((metric, index) => (
                <Area
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stackId="1"
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  if (type === 'bar') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number, name: string) => [value.toLocaleString(), name]}
              />
              <Legend />
              {metrics.map((metric, index) => (
                <Bar
                  key={metric}
                  dataKey={metric}
                  fill={colors[index % colors.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value: number, name: string) => [value.toLocaleString(), name]}
            />
            <Legend />
            {metrics.map((metric, index) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Main Dashboard Component
export const CommunicationDashboard: React.FC<CommunicationDashboardProps> = ({
  eventId,
  onExport
}) => {
  // State management
  const [channelMetrics, setChannelMetrics] = useState<ChannelMetrics[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [audienceInsights, setAudienceInsights] = useState<AudienceInsights | null>(null);
  const [abTestResults, setAbTestResults] = useState<ABTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');

  // API calls
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      
      const timeRangeMap = {
        '1d': { days: 1 },
        '7d': { days: 7 },
        '30d': { days: 30 },
        '90d': { days: 90 }
      };

      const range = timeRangeMap[timeRange as keyof typeof timeRangeMap];
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - range.days);

      const [metricsRes, timeseriesRes, audienceRes] = await Promise.all([
        fetch(`/api/communications/analytics/event/${eventId}?channel=${selectedChannel}&start=${startDate.toISOString()}&end=${endDate.toISOString()}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/communications/analytics/timeseries/${eventId}?channel=${selectedChannel}&interval=day&start=${startDate.toISOString()}&end=${endDate.toISOString()}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/communications/analytics/audience/${eventId}?start=${startDate.toISOString()}&end=${endDate.toISOString()}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        if (metricsData.success) {
          setChannelMetrics(metricsData.data.channels || []);
        }
      }

      if (timeseriesRes.ok) {
        const timeseriesData = await timeseriesRes.json();
        if (timeseriesData.success) {
          setTimeSeriesData(timeseriesData.data || []);
        }
      }

      if (audienceRes.ok) {
        const audienceData = await audienceRes.json();
        if (audienceData.success) {
          setAudienceInsights(audienceData.data);
        }
      }

    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, selectedChannel, timeRange]);

  // Load data on mount and when filters change
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Calculate totals
  const totals = React.useMemo(() => {
    return channelMetrics.reduce((acc, channel) => ({
      sent: acc.sent + channel.totalSent,
      delivered: acc.delivered + channel.delivered,
      opened: acc.opened + channel.opened,
      clicked: acc.clicked + channel.clicked,
      replied: acc.replied + channel.replied,
      cost: acc.cost + channel.cost,
      avgDeliveryRate: 0, // Will calculate after
      avgOpenRate: 0,
      avgClickRate: 0
    }), {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
      cost: 0,
      avgDeliveryRate: 0,
      avgOpenRate: 0,
      avgClickRate: 0
    });
  }, [channelMetrics]);

  // Calculate rates
  totals.avgDeliveryRate = totals.sent > 0 ? Math.round((totals.delivered / totals.sent) * 100) : 0;
  totals.avgOpenRate = totals.delivered > 0 ? Math.round((totals.opened / totals.delivered) * 100) : 0;
  totals.avgClickRate = totals.opened > 0 ? Math.round((totals.clicked / totals.opened) * 100) : 0;

  // Prepare chart data
  const chartData = timeSeriesData.map(item => ({
    ...item,
    date: new Date(item.timestamp).toLocaleDateString()
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading communication analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Communication Analytics</h2>
          <p className="text-muted-foreground">Track performance across all communication channels</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last Day</SelectItem>
              <SelectItem value="7d">Last Week</SelectItem>
              <SelectItem value="30d">Last Month</SelectItem>
              <SelectItem value="90d">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => fetchData()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {onExport && (
            <Button onClick={() => onExport(channelMetrics, 'csv')} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sent"
          value={totals.sent.toLocaleString()}
          icon={Users}
          color="blue"
          description="Messages sent across all channels"
        />
        <MetricCard
          title="Delivery Rate"
          value={`${totals.avgDeliveryRate}%`}
          icon={CheckCircle}
          color="green"
          description="Average delivery rate"
        />
        <MetricCard
          title="Engagement Rate"
          value={`${totals.avgOpenRate}%`}
          icon={Eye}
          color="purple"
          description="Average open/view rate"
        />
        <MetricCard
          title="Total Cost"
          value={`$${totals.cost.toFixed(2)}`}
          icon={DollarSign}
          color="orange"
          description="Communication costs"
        />
      </div>

      {/* Channel Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {channelMetrics.map((channel) => {
              const Icon = getChannelIcon(channel.channel);
              return (
                <div key={channel.channel} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${channelColors[channel.channel as keyof typeof channelColors]}20` }}>
                      <Icon className="w-5 h-5" style={{ color: channelColors[channel.channel as keyof typeof channelColors] }} />
                    </div>
                    <div>
                      <div className="font-medium capitalize">{channel.channel}</div>
                      <div className="text-sm text-muted-foreground">
                        {channel.totalSent.toLocaleString()} sent
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-sm font-medium">{channel.deliveryRate}%</div>
                      <div className="text-xs text-muted-foreground">Delivery</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{channel.openRate}%</div>
                      <div className="text-xs text-muted-foreground">Open</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{channel.clickRate}%</div>
                      <div className="text-xs text-muted-foreground">Click</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">${channel.cost.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Cost</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="testing">A/B Testing</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              Line Chart
            </Button>
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('area')}
            >
              Area Chart
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              Bar Chart
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricsChart
              data={chartData}
              metrics={['sent', 'delivered']}
              title="Message Volume"
              type={chartType}
            />
            <MetricsChart
              data={chartData}
              metrics={['opened', 'clicked']}
              title="Engagement Metrics"
              type={chartType}
            />
            <MetricsChart
              data={chartData}
              metrics={['cost']}
              title="Cost Over Time"
              type={chartType}
            />
            <MetricsChart
              data={chartData}
              metrics={['failed']}
              title="Failed Messages"
              type={chartType}
            />
          </div>
        </TabsContent>

        <TabsContent value="audience" className="space-y-4">
          {audienceInsights && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Device Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(audienceInsights.demographics.devices).map(([device, count]) => ({
                          name: device,
                          value: count
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(audienceInsights.demographics.devices).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={Object.values(channelColors)[index % Object.values(channelColors).length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Geographic Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Geographic Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(audienceInsights.demographics.countries)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 10)
                      .map(([country, count]) => (
                        <div key={country} className="flex items-center justify-between">
                          <span className="text-sm">{country}</span>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Best Time to Send */}
              <Card>
                <CardHeader>
                  <CardTitle>Best Time to Send</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={audienceInsights.engagement.bestTimeOfDay.slice(0, 12)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}%`, 'Engagement']} />
                      <Bar dataKey="engagement" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Channel Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>Channel Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(audienceInsights.preferences.preferredChannels)
                      .sort(([,a], [,b]) => b - a)
                      .map(([channel, rate]) => {
                        const Icon = getChannelIcon(channel);
                        return (
                          <div key={channel} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" style={{ color: channelColors[channel as keyof typeof channelColors] }} />
                              <span className="text-sm capitalize">{channel}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="h-2 rounded-full"
                                  style={{ 
                                    width: `${rate * 100}%`,
                                    backgroundColor: channelColors[channel as keyof typeof channelColors]
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium">{Math.round(rate * 100)}%</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          {abTestResults.length > 0 ? (
            <div className="space-y-4">
              {abTestResults.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{result.variantName}</CardTitle>
                      <Badge variant={result.confidenceInterval.significantDifference ? "default" : "secondary"}>
                        {result.confidenceInterval.significantDifference ? 'Significant' : 'Not Significant'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{result.metrics.deliveryRate}%</div>
                        <div className="text-sm text-muted-foreground">Delivery Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{result.metrics.openRate}%</div>
                        <div className="text-sm text-muted-foreground">Open Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{result.metrics.clickRate}%</div>
                        <div className="text-sm text-muted-foreground">Click Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{result.metrics.conversionRate}%</div>
                        <div className="text-sm text-muted-foreground">Conversion Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No A/B Tests Running</h3>
                <p className="text-muted-foreground">
                  Create A/B tests to optimize your communication performance
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="font-medium text-blue-900">Peak Engagement Time</div>
                    <div className="text-sm text-blue-700">
                      Your audience is most active between 10 AM - 2 PM on weekdays
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="font-medium text-green-900">Channel Performance</div>
                    <div className="text-sm text-green-700">
                      Email has the highest engagement rate at {channelMetrics.find(c => c.channel === 'email')?.openRate || 0}%
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="font-medium text-orange-900">Cost Efficiency</div>
                    <div className="text-sm text-orange-700">
                      SMS has the best cost per engagement at ${(totals.cost / Math.max(totals.opened + totals.clicked, 1)).toFixed(3)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Optimize send times</div>
                      <div className="text-sm text-muted-foreground">
                        Schedule messages during peak engagement hours
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium">A/B test subject lines</div>
                      <div className="text-sm text-muted-foreground">
                        Test different approaches to improve open rates
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Segment by engagement</div>
                      <div className="text-sm text-muted-foreground">
                        Create targeted campaigns for high-engagement users
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommunicationDashboard;