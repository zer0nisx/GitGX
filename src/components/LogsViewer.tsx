'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal } from 'lucide-react';
import { getSocket } from '@/hooks/useSocket';

interface Log {
  id: number;
  node_id: number;
  node_name: string;
  message: string;
  topics: string;
  time: string;
  severity: string;
  created_at: string;
}

export function LogsViewer() {
  const [logs, setLogs] = useState<Log[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    loadLogs();

    const socket = getSocket();
    if (socket) {
      socket.on('new_log', (log: Log) => {
        setLogs((prev) => [log, ...prev].slice(0, 200)); // Keep last 200 logs

        if (autoScroll && scrollRef.current) {
          scrollRef.current.scrollTop = 0;
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('new_log');
      }
    };
  }, [autoScroll]);

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/logs?limit=100');
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
      default:
        return 'text-blue-500';
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            <CardTitle>System Logs</CardTitle>
          </div>
          <Badge variant="secondary">{logs.length} logs</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6 pb-6" ref={scrollRef}>
          <div className="space-y-2 font-mono text-sm">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border-l-2 border-border pl-3 py-1 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground min-w-[140px]">
                    {new Date(log.created_at || log.time).toLocaleString()}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {log.node_name}
                  </Badge>
                  <span className={`text-xs font-semibold ${getSeverityColor(log.severity)}`}>
                    [{log.topics}]
                  </span>
                  <span className="text-xs flex-1">{log.message}</span>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                No logs yet. Start monitoring a node to see logs.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
