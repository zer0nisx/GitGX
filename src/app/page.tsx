'use client';

import { useSocket } from '@/hooks/useSocket';
import { NodeManager } from '@/components/NodeManager';
import { AlertsPanel } from '@/components/AlertsPanel';
import { LogsViewer } from '@/components/LogsViewer';
import { TelegramConfig } from '@/components/TelegramConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Activity, Bell, Terminal, Settings, Wifi, WifiOff } from 'lucide-react';

export default function Home() {
  const { isConnected } = useSocket();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Activity className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">
                  MikroTik Monitor
                </h1>
                <p className="text-muted-foreground mt-1">
                  Real-time monitoring and alerting for your MikroTik network
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-500" />
                  <Badge variant="outline" className="border-green-500 text-green-500">
                    Connected
                  </Badge>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-500" />
                  <Badge variant="outline" className="border-red-500 text-red-500">
                    Disconnected
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <NodeManager />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AlertsPanel />
              <LogsViewer />
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsPanel />
          </TabsContent>

          <TabsContent value="logs">
            <LogsViewer />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <TelegramConfig />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 border rounded-lg bg-card">
                <h3 className="font-semibold mb-2">Detection Thresholds</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure when alerts are triggered
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Disconnections per hour:</span>
                    <Badge variant="secondary">5</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Link downs per hour:</span>
                    <Badge variant="secondary">3</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Errors per hour:</span>
                    <Badge variant="secondary">10</Badge>
                  </div>
                </div>
              </div>

              <div className="p-6 border rounded-lg bg-card">
                <h3 className="font-semibold mb-2">System Info</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Monitor system status
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>WebSocket Status:</span>
                    <Badge variant={isConnected ? 'default' : 'secondary'}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span className="text-muted-foreground">1.0.0</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
