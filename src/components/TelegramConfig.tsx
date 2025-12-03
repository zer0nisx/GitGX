'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, CheckCircle2, XCircle, Info } from 'lucide-react';

export function TelegramConfig() {
  const [config, setConfig] = useState({ token: '', chatId: '' });
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/telegram/config');
      const data = await response.json();
      setIsConfigured(data.configured);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setIsConfigured(true);
        setTestResult({ success: true, message: 'Telegram bot configured successfully!' });
      } else {
        const data = await response.json();
        setTestResult({ success: false, message: data.error || 'Failed to configure bot' });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/telegram/test', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.error });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Telegram Notifications</CardTitle>
            <CardDescription>
              Configure Telegram bot to receive alerts
            </CardDescription>
          </div>
          <Badge variant={isConfigured ? 'default' : 'secondary'}>
            {isConfigured ? 'Configured' : 'Not Configured'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2 text-sm">
              <p><strong>How to get your Telegram credentials:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Open Telegram and search for <code className="bg-muted px-1 rounded">@BotFather</code></li>
                <li>Send <code className="bg-muted px-1 rounded">/newbot</code> and follow instructions to get your <strong>Bot Token</strong></li>
                <li>Start your bot and send a message</li>
                <li>Visit: <code className="bg-muted px-1 rounded text-xs">https://api.telegram.org/bot{'<YOUR_BOT_TOKEN>'}/getUpdates</code></li>
                <li>Copy the <strong>Chat ID</strong> from the response</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="token">Bot Token</Label>
            <Input
              id="token"
              type="password"
              value={config.token}
              onChange={(e) => setConfig({ ...config, token: e.target.value })}
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              required
            />
          </div>

          <div>
            <Label htmlFor="chatId">Chat ID</Label>
            <Input
              id="chatId"
              value={config.chatId}
              onChange={(e) => setConfig({ ...config, chatId: e.target.value })}
              placeholder="123456789"
              required
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
            {isConfigured && (
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={loading}
              >
                <Send className="w-4 h-4 mr-2" />
                Test
              </Button>
            )}
          </div>
        </form>

        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>{testResult.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
