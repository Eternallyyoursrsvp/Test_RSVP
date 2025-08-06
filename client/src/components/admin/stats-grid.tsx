import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Server,
  Activity,
  Clock
} from 'lucide-react';

interface StatsGridProps {
  data?: {
    users: {
      total: number;
      active: number;
      pending: number;
      byRole: Record<string, number>;
    };
    events: {
      total: number;
      recentlyCreated: number;
    };
    system: {
      uptime: number;
      memoryUsage: number;
      moduleMetrics: Record<string, number>;
    };
  };
  systemInfo?: any;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ data, systemInfo }) => {
  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: "Total Users",
      value: data.users.total,
      change: data.users.pending > 0 ? `+${data.users.pending} pending` : "All approved",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Active Events",
      value: data.events.total,
      change: data.events.recentlyCreated > 0 ? `+${data.events.recentlyCreated} this week` : "No new events",
      icon: Calendar,
      color: "text-green-600"
    },
    {
      title: "System Uptime",
      value: formatUptime(data.system.uptime),
      change: `Memory: ${Math.round(data.system.memoryUsage)}MB`,
      icon: Server,
      color: "text-purple-600"
    },
    {
      title: "Performance",
      value: calculatePerformanceScore(data.system.moduleMetrics),
      change: "Module metrics",
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Helper function to calculate performance score
function calculatePerformanceScore(moduleMetrics: Record<string, number>): string {
  const metrics = Object.values(moduleMetrics);
  if (metrics.length === 0) return "N/A";
  
  const avgResponseTime = metrics.reduce((acc, val) => acc + val, 0) / metrics.length;
  
  if (avgResponseTime < 100) return "Excellent";
  if (avgResponseTime < 300) return "Good";
  if (avgResponseTime < 500) return "Fair";
  return "Poor";
}
