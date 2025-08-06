import React from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RsvpChartProps {
  data: {
    date: string;
    value: number;
  }[];
  period?: "weekly" | "monthly";
  onPeriodChange?: (period: "weekly" | "monthly") => void;
}

export default function RsvpChart({ 
  data, 
  period = "monthly", 
  onPeriodChange 
}: RsvpChartProps) {
  const handlePeriodChange = (newPeriod: "weekly" | "monthly") => {
    if (onPeriodChange) {
      onPeriodChange(newPeriod);
    }
  };

  return (
    <Card>
      <CardHeader className="py-5 px-6 border-b border-border">
        <CardTitle className="text-xl font-serif font-medium text-foreground">RSVP Progress</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Total Response Rate</h4>
            <p className="text-2xl font-bold text-foreground">
              {data.length > 0 ? `${data[data.length - 1].value}%` : "0%"}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={period === "weekly" ? "secondary" : "outline"}
              size="sm"
              className="px-3 py-1 text-xs rounded"
              onClick={() => handlePeriodChange("weekly")}
            >
              Weekly
            </Button>
            <Button
              variant={period === "monthly" ? "secondary" : "outline"}
              size="sm"
              className="px-3 py-1 text-xs rounded"
              onClick={() => handlePeriodChange("monthly")}
            >
              Monthly
            </Button>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="rsvpColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                domain={[0, 100]}
              />
              <Tooltip 
                formatter={(value) => [`${value}%`, "Response Rate"]}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  color: "hsl(var(--foreground))"
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#rsvpColor)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
