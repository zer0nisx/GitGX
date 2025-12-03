import { MikrotikMonitor } from './mikrotik-client';
import { PatternDetector } from './pattern-detector';
import { telegramNotifier } from './telegram-bot';
import { nodeOperations, logOperations, alertOperations, type Node } from './database';

export class MonitorService {
  private monitors: Map<number, MikrotikMonitor> = new Map();
  private detectors: Map<number, PatternDetector> = new Map();
  private io: any = null;
  private connectionQueue: Array<{ nodeId: number; resolve: (value: boolean) => void }> = [];
  private isConnecting = false;

  constructor() {
    // Auto-start monitoring disabled to prevent automatic connections
    // Uncomment the line below to enable auto-monitoring on startup
    // this.initializeMonitors();
  }

  setSocketIO(io: any): void {
    this.io = io;
  }

  private async initializeMonitors(): Promise<void> {
    const nodes = nodeOperations.getAll();
    for (const node of nodes) {
      if (node.id) {
        await this.startMonitoring(node.id);
      }
    }
  }

  async startMonitoring(nodeId: number): Promise<boolean> {
    // Add to connection queue to ensure sequential connections
    return new Promise((resolve) => {
      this.connectionQueue.push({ nodeId, resolve });
      this.processConnectionQueue();
    });
  }

  private async processConnectionQueue(): Promise<void> {
    if (this.isConnecting || this.connectionQueue.length === 0) {
      return;
    }

    this.isConnecting = true;
    const { nodeId, resolve } = this.connectionQueue.shift()!;

    try {
      const result = await this.connectNode(nodeId);
      resolve(result);
    } catch (error) {
      console.error(`[Monitor] Error connecting node ${nodeId}:`, error);
      resolve(false);
    } finally {
      this.isConnecting = false;
      // Wait 2 seconds before processing next connection to avoid RADIUS issues
      setTimeout(() => {
        this.processConnectionQueue();
      }, 2000);
    }
  }

  private async connectNode(nodeId: number): Promise<boolean> {
    const node = nodeOperations.getById(nodeId);
    if (!node) {
      console.error(`[Monitor] Node ${nodeId} not found`);
      return false;
    }

    // Stop existing monitor if any
    this.stopMonitoring(nodeId);

    console.log(`[Monitor] Starting connection to node ${nodeId} (${node.name})`);

    const monitor = new MikrotikMonitor(node);
    const detector = new PatternDetector(nodeId);

    const connected = await monitor.connect();

    if (connected) {
      nodeOperations.updateStatus(nodeId, 'connected');
      this.emitNodeStatus(nodeId, 'connected');
    } else {
      nodeOperations.updateStatus(nodeId, 'error');
      this.emitNodeStatus(nodeId, 'error');
    }

    this.monitors.set(nodeId, monitor);
    this.detectors.set(nodeId, detector);

    // Start polling for new logs
    monitor.startLogPolling(async (logs) => {
      for (const log of logs) {
        // Save log to database
        const logId = logOperations.create({
          node_id: nodeId,
          message: log.message,
          topics: log.topics,
          time: log.time,
          severity: this.extractSeverity(log.topics)
        });

        // Emit log to connected clients
        this.emitLog(nodeId, {
          id: logId,
          node_id: nodeId,
          message: log.message,
          topics: log.topics,
          time: log.time,
          node_name: node.name
        });

        // Analyze for patterns
        const detections = detector.analyzeLog(log);

        for (const detection of detections) {
          if (detection.detected) {
            detector.createOrUpdateAlert(detection);

            // Get the alert
            const alerts = alertOperations.getByNodeId(nodeId);
            const alert = alerts.find(a =>
              a.type === detection.type &&
              a.message === detection.message &&
              a.resolved === 0
            );

            if (alert && alert.notified === 0) {
              // Send telegram notification
              await telegramNotifier.sendAlert(
                node.name,
                detection.type,
                detection.message,
                detection.severity,
                alert.count || 1
              );

              alertOperations.markNotified(alert.id!);

              // Emit alert to clients
              this.emitAlert(nodeId, {
                ...alert,
                node_name: node.name
              });
            }
          }
        }
      }
    }, 5000); // Check every 5 seconds

    console.log(`[Monitor] Started monitoring node ${nodeId} (${node.name})`);
    return true;
  }

  stopMonitoring(nodeId: number): void {
    const monitor = this.monitors.get(nodeId);
    if (monitor) {
      monitor.stopLogPolling();
      monitor.disconnect();
      this.monitors.delete(nodeId);
    }

    const detector = this.detectors.get(nodeId);
    if (detector) {
      detector.cleanup();
      this.detectors.delete(nodeId);
    }

    nodeOperations.updateStatus(nodeId, 'disconnected');
    this.emitNodeStatus(nodeId, 'disconnected');

    console.log(`[Monitor] Stopped monitoring node ${nodeId}`);
  }

  async restartMonitoring(nodeId: number): Promise<boolean> {
    this.stopMonitoring(nodeId);
    return await this.startMonitoring(nodeId);
  }

  stopAll(): void {
    for (const nodeId of this.monitors.keys()) {
      this.stopMonitoring(nodeId);
    }
  }

  getMonitorStatus(nodeId: number): { connected: boolean; nodeInfo?: Node } {
    const monitor = this.monitors.get(nodeId);
    if (monitor) {
      return {
        connected: monitor.isConnected(),
        nodeInfo: monitor.getNodeInfo()
      };
    }
    return { connected: false };
  }

  getAllMonitorStatuses(): Array<{ nodeId: number; connected: boolean; nodeInfo?: Node }> {
    const statuses = [];
    for (const [nodeId, monitor] of this.monitors.entries()) {
      statuses.push({
        nodeId,
        connected: monitor.isConnected(),
        nodeInfo: monitor.getNodeInfo()
      });
    }
    return statuses;
  }

  private extractSeverity(topics: string): string {
    if (topics.includes('critical') || topics.includes('error')) return 'error';
    if (topics.includes('warning')) return 'warning';
    return 'info';
  }

  private emitLog(nodeId: number, log: any): void {
    if (this.io) {
      this.io.emit('new_log', log);
      this.io.to(`node_${nodeId}`).emit('node_log', log);
    }
  }

  private emitAlert(nodeId: number, alert: any): void {
    if (this.io) {
      this.io.emit('new_alert', alert);
      this.io.to(`node_${nodeId}`).emit('node_alert', alert);
    }
  }

  private emitNodeStatus(nodeId: number, status: string): void {
    if (this.io) {
      this.io.emit('node_status', { nodeId, status });
    }
  }
}

// Singleton instance
export const monitorService = new MonitorService();
