import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Wifi,
  WifiOff,
  Server,
  Activity
} from 'lucide-react';

interface SystemHealthProps {
  isConnected: boolean;
  systemInfo?: {
    nodeVersion: string;
    uptime: number;
    memoryUsage: any;
    environment: string;
  };
  notificationMetrics?: {
    activeConnections: number;
    totalConnections: number;
    messagesSent: number;
    messagesReceived: number;
    errors: number;
  };
}

export const SystemHealth: React.FC<SystemHealthProps> = ({
  isConnected,
  systemInfo,
  notificationMetrics
}) => {
  const getHealthStatus = () => {
    const issues = [];
    
    if (!isConnected) {
      issues.push('WebSocket disconnected');
    }
    
    if (systemInfo?.memoryUsage) {
      const memoryUsage = (systemInfo.memoryUsage.heapUsed / systemInfo.memoryUsage.heapTotal) * 100;
      if (memoryUsage > 80) {
        issues.push('High memory usage');
      }
    }
    
    if (notificationMetrics?.errors && notificationMetrics.errors > 10) {
      issues.push('High error rate in notifications');
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : issues.length < 2 ? 'warning' : 'critical',
      issues
    };
  };

  const health = getHealthStatus();
  
  const getStatusIcon = () => {
    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (): "default" | "destructive" | undefined => {
    switch (health.status) {
      case 'healthy':
        return 'default';
      case 'warning':
        return undefined;
      case 'critical':
        return 'destructive';
      default:
        return undefined;
    }
  };

  return (
    <Alert variant={getStatusVariant()} className="border-l-4">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold">System Status</span>
              <Badge variant={health.status === 'healthy' ? 'default' : 'secondary'}>
                {health.status.toUpperCase()}
              </Badge>
            </div>
            <AlertDescription className="mt-1">
              {health.status === 'healthy' 
                ? 'All systems operational'
                : `Issues detected: ${health.issues.join(', ')}`
              }
            </AlertDescription>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-sm">
          {/* WebSocket Status */}
          <div className="flex items-center space-x-1">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              WebSocket
            </span>
          </div>

          {/* Active Connections */}
          {notificationMetrics && (
            <div className="flex items-center space-x-1">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-blue-600">
                {notificationMetrics.activeConnections} clients
              </span>
            </div>
          )}

          {/* Memory Usage */}
          {systemInfo?.memoryUsage && (
            <div className="flex items-center space-x-2">
              <Server className="h-4 w-4 text-purple-500" />
              <div className="flex items-center space-x-1">
                <span className="text-purple-600">Memory:</span>
                <div className="w-16">
                  <Progress 
                    value={(systemInfo.memoryUsage.heapUsed / systemInfo.memoryUsage.heapTotal) * 100}
                    className="h-2"
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round((systemInfo.memoryUsage.heapUsed / systemInfo.memoryUsage.heapTotal) * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Environment */}
          {systemInfo?.environment && (
            <Badge variant="outline">
              {systemInfo.environment}
            </Badge>
          )}
        </div>
      </div>
    </Alert>
  );
};
