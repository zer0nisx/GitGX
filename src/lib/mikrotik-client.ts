import { RouterOSClient } from 'routeros-client';
import type { Node } from './database';

export interface MikrotikLog {
  '.id': string;
  time: string;
  topics: string;
  message: string;
}

export class MikrotikMonitor {
  private client: RouterOSClient | null = null;
  private node: Node;
  private connected = false;
  private lastLogId: string | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private logCheckInterval: NodeJS.Timeout | null = null;

  constructor(node: Node) {
    this.node = node;
  }

  async connect(): Promise<boolean> {
    try {
      this.client = new RouterOSClient({
        host: this.node.ip,
        port: this.node.port || 8728,
        user: this.node.username,
        password: this.node.password,
        timeout: 10000,
      });

      await this.client.connect();
      this.connected = true;
      console.log(`[MikroTik] Connected to ${this.node.name} (${this.node.ip})`);
      return true;
    } catch (error) {
      console.error(`[MikroTik] Connection failed to ${this.node.name}:`, error);
      this.connected = false;
      this.scheduleReconnect();
      return false;
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
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        console.error(`[MikroTik] Error closing connection to ${this.node.name}:`, error);
      }
      this.client = null;
    }
    this.connected = false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      console.log(`[MikroTik] Attempting to reconnect to ${this.node.name}...`);
      this.connect();
    }, 30000); // Retry every 30 seconds
  }

  async getSystemLogs(limit = 50): Promise<MikrotikLog[]> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to MikroTik');
    }

    try {
      const logs = await this.client.write('/log/print') as any[];

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
      const logs = await this.client.write('/log/print') as any[];

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
      const interfaces = await this.client.write('/interface/print');
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
      const resources = await this.client.write('/system/resource/print') as any[];
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
