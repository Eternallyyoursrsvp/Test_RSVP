import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Server, 
  Database, 
  Activity, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Memory,
  HardDrive
} from "lucide-react";

export default function SystemHealthDashboard() {
  return (
    <div style={{ padding: '20px' }}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">System Health Dashboard</h2>
            <p className="text-sm text-gray-500">Monitor system performance and operational metrics</p>
          </div>
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh All
          </Button>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Server Status</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Uptime: 2d 14h 32m</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">5/100 connections</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23%</div>
              <Progress value={23} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory</CardTitle>
              <Memory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">67%</div>
              <Progress value={67} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-2">2.1GB / 3.2GB</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed System Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Node.js Version</span>
                <span className="text-sm">v20.14.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Environment</span>
                <Badge variant="outline">Development</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Platform</span>
                <span className="text-sm">darwin x64</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Total Memory</span>
                <span className="text-sm">3.2GB</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HardDrive className="mr-2 h-5 w-5" />
                Storage Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Disk Usage</span>
                  <span>45%</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
              <div className="text-center py-4">
                <div className="text-2xl font-bold">128GB</div>
                <p className="text-sm text-muted-foreground">Available Space</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}