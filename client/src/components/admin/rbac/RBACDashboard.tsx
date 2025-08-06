/**
 * RBAC Dashboard Component
 * Main dashboard for Role-Based Access Control management
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import {
  Shield,
  Users,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Database,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import RoleManagement from './RoleManagement';
import UserRoleManagement from './UserRoleManagement';

interface RBACMetrics {
  overview: {
    totalRoles: number;
    activeRoles: number;
    systemRoles: number;
    customRoles: number;
    totalUsers: number;
    totalPermissions: number;
    activeAssignments: number;
    expiredAssignments: number;
  };
  roleDistribution: Array<{
    name: string;
    value: number;
    userCount: number;
  }>;
  permissionUsage: Array<{
    resource: string;
    total: number;
    used: number;
    unused: number;
  }>;
  auditActivity: Array<{
    timestamp: string;
    action: string;
    count: number;
  }>;
  systemHealth: {
    orphanedRoles: number;
    orphanedPermissions: number;
    expiredAssignments: number;
    integrityScore: number;
    lastValidation: string;
  };
  alerts: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
    count?: number;
  }>;
}

interface RBACDashboardProps {
  eventId?: number;
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6366F1',
  success: '#10B981'
};

export const RBACDashboard: React.FC<RBACDashboardProps> = ({ eventId }) => {
  const [metrics, setMetrics] = useState<RBACMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch RBAC metrics and data
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        rolesResponse,
        permissionsResponse,
        statisticsResponse,
        auditResponse,
        validationResponse
      ] = await Promise.all([
        fetch('/api/v1/rbac/roles?includeInactive=true&includeSystemRoles=true'),
        fetch('/api/v1/rbac/permissions'),
        fetch('/api/v1/rbac/analytics/roles'),
        fetch('/api/v1/rbac/audit-log?limit=50'),
        fetch('/api/v1/rbac/system/validate', { method: 'POST' })
      ]);

      if (!rolesResponse.ok || !permissionsResponse.ok || !statisticsResponse.ok) {
        throw new Error('Failed to fetch RBAC metrics');
      }

      const roles = await rolesResponse.json();
      const permissions = await permissionsResponse.json();
      const statistics = await statisticsResponse.json();
      const auditLog = await auditResponse.json();
      const validation = await validationResponse.json();

      // Process data into metrics format
      const processedMetrics: RBACMetrics = {
        overview: {
          totalRoles: roles.data.length,
          activeRoles: roles.data.filter((r: any) => r.isActive).length,
          systemRoles: roles.data.filter((r: any) => r.isSystemRole).length,
          customRoles: roles.data.filter((r: any) => !r.isSystemRole).length,
          totalUsers: statistics.data.reduce((acc: number, stat: any) => acc + stat.userCount, 0),
          totalPermissions: permissions.data.length,
          activeAssignments: statistics.data.reduce((acc: number, stat: any) => acc + stat.activeAssignments, 0),
          expiredAssignments: statistics.data.reduce((acc: number, stat: any) => acc + stat.expiredAssignments, 0)
        },
        roleDistribution: statistics.data.map((stat: any) => ({
          name: stat.role.displayName,
          value: stat.activeAssignments,
          userCount: stat.userCount
        })),
        permissionUsage: Object.entries(
          permissions.data.reduce((acc: Record<string, any[]>, perm: any) => {
            if (!acc[perm.resource]) acc[perm.resource] = [];
            acc[perm.resource].push(perm);
            return acc;
          }, {})
        ).map(([resource, perms]) => ({
          resource: resource.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          total: (perms as any[]).length,
          used: Math.floor((perms as any[]).length * 0.7), // Simulated usage
          unused: Math.ceil((perms as any[]).length * 0.3)
        })),
        auditActivity: auditLog.data?.slice(0, 20).reduce((acc: any[], log: any) => {
          const hour = new Date(log.timestamp).toISOString().slice(0, 13);
          const existing = acc.find(item => item.timestamp === hour);
          if (existing) {
            existing.count++;
          } else {
            acc.push({
              timestamp: hour,
              action: log.action,
              count: 1
            });
          }
          return acc;
        }, []) || [],
        systemHealth: {
          orphanedRoles: validation.data?.issues?.filter((i: any) => i.message.includes('orphaned role')).length || 0,
          orphanedPermissions: validation.data?.issues?.filter((i: any) => i.message.includes('orphaned permission')).length || 0,
          expiredAssignments: validation.data?.issues?.filter((i: any) => i.message.includes('expired')).length || 0,
          integrityScore: validation.data?.valid ? 100 : Math.max(0, 100 - (validation.data?.issues?.length || 0) * 10),
          lastValidation: new Date().toISOString()
        },
        alerts: validation.data?.issues?.map((issue: any) => ({
          type: issue.type,
          message: issue.message,
          timestamp: new Date().toISOString(),
          count: issue.details?.length
        })) || []
      };

      setMetrics(processedMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RBAC metrics');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await fetchMetrics();
    setRefreshing(false);
  };

  // System operations
  const runSystemValidation = async () => {
    try {
      const response = await fetch('/api/v1/rbac/system/validate', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to run system validation');
      }

      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'System validation failed');
    }
  };

  const cleanupExpiredAssignments = async () => {
    try {
      const response = await fetch('/api/v1/rbac/system/cleanup', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to cleanup expired assignments');
      }

      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cleanup operation failed');
    }
  };

  // Get system health status
  const getHealthStatus = () => {
    if (!metrics) return { status: 'unknown', color: 'gray' };
    
    const { integrityScore } = metrics.systemHealth;
    if (integrityScore >= 90) return { status: 'healthy', color: 'green' };
    if (integrityScore >= 70) return { status: 'warning', color: 'yellow' };
    return { status: 'critical', color: 'red' };
  };

  // Initial load
  useEffect(() => {
    fetchMetrics();
  }, [eventId]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {error || 'Failed to load RBAC metrics'}
        </AlertDescription>
      </Alert>
    );
  }

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">RBAC Dashboard</h1>
          <p className="text-gray-600">Role-Based Access Control management and monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cleanupExpiredAssignments}>
            <Zap className="w-4 h-4 mr-2" />
            Cleanup
          </Button>
          <Button variant="outline" onClick={runSystemValidation}>
            <Database className="w-4 h-4 mr-2" />
            Validate
          </Button>
          <Button onClick={refreshData} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Alert */}
      {healthStatus.status !== 'healthy' && (
        <Alert className={`border-${healthStatus.color}-200 bg-${healthStatus.color}-50`}>
          <AlertTriangle className={`w-4 h-4 text-${healthStatus.color}-600`} />
          <AlertDescription className={`text-${healthStatus.color}-800`}>
            RBAC System Health: {healthStatus.status.toUpperCase()} 
            (Integrity Score: {metrics.systemHealth.integrityScore}%)
            {metrics.alerts.length > 0 && ` - ${metrics.alerts.length} issues detected`}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">Role Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
                <Shield className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.overview.totalRoles}</div>
                <p className="text-xs text-gray-600">
                  {metrics.overview.activeRoles} active, {metrics.overview.totalRoles - metrics.overview.activeRoles} inactive
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Users with Roles</CardTitle>
                <Users className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.overview.totalUsers}</div>
                <p className="text-xs text-gray-600">
                  {metrics.overview.activeAssignments} active assignments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.systemHealth.integrityScore}%</div>
                <p className="text-xs text-gray-600">
                  <span className={`text-${healthStatus.color}-600`}>
                    {healthStatus.status.charAt(0).toUpperCase() + healthStatus.status.slice(1)}
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Permissions</CardTitle>
                <ShieldCheck className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.overview.totalPermissions}</div>
                <p className="text-xs text-gray-600">Available system permissions</p>
              </CardContent>
            </Card>
          </div>

          {/* System Issues */}
          {metrics.alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  System Issues ({metrics.alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.alerts.slice(0, 5).map((alert, index) => (
                    <Alert 
                      key={index}
                      className={
                        alert.type === 'error' ? 'border-red-200 bg-red-50' :
                        alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      }
                    >
                      <AlertDescription className={
                        alert.type === 'error' ? 'text-red-800' :
                        alert.type === 'warning' ? 'text-yellow-800' :
                        'text-blue-800'
                      }>
                        {alert.message}
                        {alert.count && ` (${alert.count} items)`}
                      </AlertDescription>
                    </Alert>
                  ))}
                  {metrics.alerts.length > 5 && (
                    <p className="text-sm text-gray-500">
                      +{metrics.alerts.length - 5} more issues...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Role Distribution</CardTitle>
                <CardDescription>Active role assignments by role type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.roleDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {metrics.roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Permission Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Permission Usage by Resource</CardTitle>
                <CardDescription>How permissions are distributed across resources</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.permissionUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="resource" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill={COLORS.primary} name="Total Permissions" />
                    <Bar dataKey="used" fill={COLORS.secondary} name="Used Permissions" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common RBAC management tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4" onClick={() => setActiveTab('roles')}>
                  <div className="text-center space-y-2">
                    <Shield className="w-8 h-8 mx-auto text-blue-600" />
                    <div>
                      <div className="font-medium">Manage Roles</div>
                      <div className="text-sm text-gray-500">Create and edit system roles</div>
                    </div>
                  </div>
                </Button>

                <Button variant="outline" className="h-auto p-4" onClick={() => setActiveTab('users')}>
                  <div className="text-center space-y-2">
                    <UserCheck className="w-8 h-8 mx-auto text-green-600" />
                    <div>
                      <div className="font-medium">Assign Roles</div>
                      <div className="text-sm text-gray-500">Manage user role assignments</div>
                    </div>
                  </div>
                </Button>

                <Button variant="outline" className="h-auto p-4" onClick={() => setActiveTab('audit')}>
                  <div className="text-center space-y-2">
                    <Activity className="w-8 h-8 mx-auto text-purple-600" />
                    <div>
                      <div className="font-medium">Audit Trail</div>
                      <div className="text-sm text-gray-500">Review system changes</div>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <RoleManagement eventId={eventId} />
        </TabsContent>

        <TabsContent value="users">
          <UserRoleManagement eventId={eventId} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Audit Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>RBAC changes and system events over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.auditActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke={COLORS.primary} 
                    fill={COLORS.primary} 
                    fillOpacity={0.3}
                    name="Activities"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.overview.systemRoles}</div>
                <p className="text-gray-600">Built-in system roles</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Custom Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.overview.customRoles}</div>
                <p className="text-gray-600">User-defined roles</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expired Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{metrics.overview.expiredAssignments}</div>
                <p className="text-gray-600">Need cleanup</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>Detailed log of all RBAC system changes and activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-center text-gray-500 py-8">
                  Audit log functionality would be implemented here, showing detailed logs of all RBAC operations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RBACDashboard;