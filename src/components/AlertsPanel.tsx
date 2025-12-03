'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, AlertCircle, Bell } from 'lucide-react';
import { getSocket } from '@/hooks/useSocket';

interface AlertData {
  id: number;
  node_id: number;
  node_name: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  first_occurrence: string;
  last_occurrence: string;
  notified: number;
  resolved: number;
}

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  useEffect(() => {
    loadAlerts();

    const socket = getSocket();
    if (socket) {
      socket.on('new_alert', (alert: AlertData) => {
        setAlerts((prev) => [alert, ...prev]);
      });
    }

    return () => {
      if (socket) {
        socket.off('new_alert');
      }
    };
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await fetch(`/api/alerts/${id}/resolve`, { method: 'POST' });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case 'medium':
        return <Bell className="w-5 h-5 text-yellow-500" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
      case 'high':
        return 'border-orange-500 bg-orange-50 dark:bg-orange-950';
      case 'critical':
        return 'border-red-500 bg-red-50 dark:bg-red-950';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Active Alerts</h2>
        <Badge variant="secondary">{alerts.length} active</Badge>
      </div>

      {alerts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
            <p className="text-muted-foreground text-center">
              No active alerts. Your network is running smoothly!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Alert key={alert.id} className={`border-l-4 ${getSeverityColor(alert.severity)}`}>
              <div className="flex items-start gap-3">
                {getSeverityIcon(alert.severity)}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{alert.node_name}</Badge>
                        <Badge variant="secondary">{alert.type.replace(/_/g, ' ')}</Badge>
                        <Badge>{alert.severity.toUpperCase()}</Badge>
                      </div>
                      <AlertDescription className="text-sm">
                        {alert.message}
                      </AlertDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResolve(alert.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Occurrences: {alert.count}</span>
                    <span>Last: {new Date(alert.last_occurrence).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}
