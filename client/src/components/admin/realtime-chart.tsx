import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface RealtimeChartProps {
  data: Record<string, number>;
  type: 'performance' | 'memory' | 'activity';
}

export const RealtimeChart: React.FC<RealtimeChartProps> = ({ data, type }) => {
  const formatMetric = (key: string, value: number) => {
    switch (type) {
      case 'performance':
        return `${value.toFixed(1)}ms`;
      case 'memory':
        return `${(value / 1024 / 1024).toFixed(1)}MB`;
      case 'activity':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const getProgressValue = (value: number) => {
    switch (type) {
      case 'performance':
        return Math.min((value / 1000) * 100, 100); // 1000ms = 100%
      case 'memory':
        return Math.min((value / (512 * 1024 * 1024)) * 100, 100); // 512MB = 100%
      case 'activity':
        return Math.min((value / 100) * 100, 100); // 100 = 100%
      default:
        return 0;
    }
  };

  const getProgressColor = (value: number) => {
    if (value < 50) return 'bg-green-500';
    if (value < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (Object.keys(data).length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, value]) => {
        const progressValue = getProgressValue(value);
        return (
          <div key={key} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{key}</span>
              <span className="text-muted-foreground">
                {formatMetric(key, value)}
              </span>
            </div>
            <Progress 
              value={progressValue}
              className="h-2"
            />
          </div>
        );
      })}
    </div>
  );
};
