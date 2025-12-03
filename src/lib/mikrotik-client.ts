import { RouterOSClient } from 'routeros-client';
import type { Node } from './database';

export interface MikrotikLog {
  '.id': string;
  time: string;
  topics: string;
  message: string;
}

export class MikrotikMonitor {
  private api: RouterOSClient | null = null;
  private client: any = null;
  private node: Node;
  private connected = false;
  private lastLogId: string | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private logCheckInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(node: Node) {
    this.node = node;
  }

  async connect(): Promise<boolean> {
    try {
      // Check if we're within monitoring hours
      if (!this.isWithinMonitoringHours()) {
        console.log(`[MikroTik] ${this.node.name} is outside monitoring hours`);
        this.connected = false;
        return false;
      }

      // Determine port based on auth method
      let port = this.node.port || 8728;
      const authMethod = this.node.auth_method || 'api';

      if (!this.node.port) {
        switch (authMethod) {
          case 'api':
            port = 8728;
            break;
          case 'web':
            port = 80;
            break;
          case 'winbox':
            port = 8291;
            break;
        }
      }

      this.api = new RouterOSClient({
        host: this.node.ip,
        port: port,
        user: this.node.username,
        password: this.node.password,
        timeout: 10000,
      });

      this.client = await this.api.connect();
      this.connected = true;
      this.reconnectAttempts = 0; // Reset attempts on successful connection
      console.log(`[MikroTik] Connected to ${this.node.name} (${this.node.ip}) via ${authMethod}`);
      return true;
    } catch (error) {
      console.error(`[MikroTik] Connection failed to ${this.node.name}:`, error);
      this.connected = false;
      this.scheduleReconnect();
      return false;
    }
  }

  private isWithinMonitoringHours(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const startHour = this.node.monitor_start_hour ?? 0;
    const endHour = this.node.monitor_end_hour ?? 24;

    if (startHour <= endHour) {
      // Same day range (e.g., 8-17)
      return currentHour >= startHour && currentHour < endHour;
    } else {
      // Overnight range (e.g., 22-6)
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.logCheckInterval) {
      clearInterval(this.logCheckInterval);
      this.logCheckInterval = null;
    }
    if (this.api) {
      try {
        await this.api.close();
      } catch (error) {
        console.error(`[MikroTik] Error closing connection to ${this.node.name}:`, error);
      }
      this.api = null;
      this.client = null;
    }
    this.connected = false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.log(`[MikroTik] Max reconnection attempts (${this.maxReconnectAttempts}) reached for ${this.node.name}. Stopping reconnection attempts.`);
      return;
    }

    console.log(`[MikroTik] Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} for ${this.node.name}`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      console.log(`[MikroTik] Attempting to reconnect to ${this.node.name}... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, 30000); // Retry every 30 seconds
  }

  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  async getSystemLogs(limit = 50): Promise<MikrotikLog[]> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to MikroTik');
    }

    try {
      const menu = this.client.menu('/log');
      const logs = await menu.getAll() as any[];

      return logs.slice(0, limit).map(log => ({
        '.id': log['.id'] || '',
        time: log.time || '',
        topics: log.topics || '',
        message: log.message || ''
      }));
    } catch (error) {
      console.error(`[MikroTik] Error getting logs from ${this.node.name}:`, error);
      this.connected = false;
      this.scheduleReconnect();
      throw error;
    }
  }

  async getNewLogs(): Promise<MikrotikLog[]> {
    if (!this.client || !this.connected) {
      return [];
    }

    try {
      const menu = this.client.menu('/log');
      const logs = await menu.getAll() as any[];

      // Filter logs after last known ID
      let newLogs = logs;
      if (this.lastLogId) {
        const lastIndex = logs.findIndex(log => log['.id'] === this.lastLogId);
        if (lastIndex !== -1) {
          newLogs = logs.slice(lastIndex + 1);
        }
      } else {
        // First time, get last 10 logs
        newLogs = logs.slice(-10);
      }

      if (logs.length > 0) {
        this.lastLogId = logs[logs.length - 1]['.id'];
      }

      return newLogs.map(log => ({
        '.id': log['.id'] || '',
        time: log.time || '',
        topics: log.topics || '',
        message: log.message || ''
      }));
    } catch (error) {
      console.error(`[MikroTik] Error getting new logs from ${this.node.name}:`, error);
      this.connected = false;
      this.scheduleReconnect();
      return [];
    }
  }

  async getInterfaceStatus(): Promise<any[]> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to MikroTik');
    }

    try {
      const menu = this.client.menu('/interface');
      const interfaces = await menu.getAll();
      return interfaces as any[];
    } catch (error) {
      console.error(`[MikroTik] Error getting interfaces from ${this.node.name}:`, error);
      throw error;
    }
  }

  async getSystemResources(): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to MikroTik');
    }

    try {
      const menu = this.client.menu('/system/resource');
      const resources = await menu.getAll() as any[];
      return resources[0];
    } catch (error) {
      console.error(`[MikroTik] Error getting system resources from ${this.node.name}:`, error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getNodeInfo(): Node {
    return this.node;
  }

  startLogPolling(callback: (logs: MikrotikLog[]) => void, intervalMs = 5000): void {
    if (this.logCheckInterval) {
      clearInterval(this.logCheckInterval);
    }

    this.logCheckInterval = setInterval(async () => {
      if (this.connected) {
        const newLogs = await this.getNewLogs();
        if (newLogs.length > 0) {
          callback(newLogs);
        }
      }
    }, intervalMs);
  }

  stopLogPolling(): void {
    if (this.logCheckInterval) {
      clearInterval(this.logCheckInterval);
      this.logCheckInterval = null;
    }
  }
}
