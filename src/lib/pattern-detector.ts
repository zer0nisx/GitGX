import type { MikrotikLog } from './mikrotik-client';
import { alertOperations, type Alert } from './database';

export interface DetectionResult {
  detected: boolean;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
}

export class PatternDetector {
  private nodeId: number;
  private disconnectionTracker: Map<string, number[]> = new Map();
  private linkDownTracker: Map<string, number[]> = new Map();
  private errorTracker: Map<string, number[]> = new Map();

  // Thresholds
  private readonly DISCONNECTION_THRESHOLD = 5; // 5 disconnections in time window
  private readonly LINK_DOWN_THRESHOLD = 3; // 3 link downs in time window
  private readonly ERROR_THRESHOLD = 10; // 10 errors in time window
  private readonly TIME_WINDOW = 3600000; // 1 hour in milliseconds

  constructor(nodeId: number) {
    this.nodeId = nodeId;
  }

  analyzeLog(log: MikrotikLog): DetectionResult[] {
    const results: DetectionResult[] = [];
    const message = log.message.toLowerCase();
    const topics = log.topics.toLowerCase();

    // Detect client disconnections
    if (this.isClientDisconnection(message, topics)) {
      const result = this.trackDisconnection(message);
      if (result) results.push(result);
    }

    // Detect link down events
    if (this.isLinkDown(message, topics)) {
      const result = this.trackLinkDown(message);
      if (result) results.push(result);
    }

    // Detect authentication failures
    if (this.isAuthFailure(message, topics)) {
      results.push({
        detected: true,
        type: 'auth_failure',
        message: `Authentication failure detected: ${log.message}`,
        severity: 'medium',
        details: { topics: log.topics, originalMessage: log.message }
      });
    }

    // Detect DHCP issues
    if (this.isDHCPIssue(message, topics)) {
      results.push({
        detected: true,
        type: 'dhcp_issue',
        message: `DHCP issue detected: ${log.message}`,
        severity: 'low',
        details: { topics: log.topics, originalMessage: log.message }
      });
    }

    // Detect interface errors
    if (this.isInterfaceError(message, topics)) {
      const result = this.trackError(message);
      if (result) results.push(result);
    }

    // Detect high CPU/Memory
    if (this.isResourceIssue(message, topics)) {
      results.push({
        detected: true,
        type: 'resource_issue',
        message: `Resource issue detected: ${log.message}`,
        severity: 'high',
        details: { topics: log.topics, originalMessage: log.message }
      });
    }

    // Detect critical system errors
    if (this.isCriticalError(message, topics)) {
      results.push({
        detected: true,
        type: 'critical_error',
        message: `Critical error: ${log.message}`,
        severity: 'critical',
        details: { topics: log.topics, originalMessage: log.message }
      });
    }

    return results;
  }

  private isClientDisconnection(message: string, topics: string): boolean {
    return (
      (topics.includes('wireless') || topics.includes('ppp') || topics.includes('hotspot')) &&
      (message.includes('disconnected') || message.includes('logged out') || message.includes('connection closed'))
    );
  }

  private isLinkDown(message: string, topics: string): boolean {
    return (
      topics.includes('interface') &&
      (message.includes('link down') || message.includes('interface down') || message.includes('link-down'))
    );
  }

  private isAuthFailure(message: string, topics: string): boolean {
    return (
      message.includes('authentication failed') ||
      message.includes('login failure') ||
      message.includes('invalid password') ||
      message.includes('access denied')
    );
  }

  private isDHCPIssue(message: string, topics: string): boolean {
    return (
      topics.includes('dhcp') &&
      (message.includes('no free address') ||
       message.includes('address already in use') ||
       message.includes('dhcp failed'))
    );
  }

  private isInterfaceError(message: string, topics: string): boolean {
    return (
      topics.includes('interface') &&
      (message.includes('error') ||
       message.includes('timeout') ||
       message.includes('no carrier'))
    );
  }

  private isResourceIssue(message: string, topics: string): boolean {
    return (
      message.includes('high cpu usage') ||
      message.includes('memory low') ||
      message.includes('disk full') ||
      message.includes('resource exhausted')
    );
  }

  private isCriticalError(message: string, topics: string): boolean {
    return (
      topics.includes('critical') ||
      topics.includes('system,error') ||
      message.includes('kernel panic') ||
      message.includes('system failure') ||
      message.includes('reboot')
    );
  }

  private trackDisconnection(message: string): DetectionResult | null {
    const clientId = this.extractClientId(message);
    const now = Date.now();

    if (!this.disconnectionTracker.has(clientId)) {
      this.disconnectionTracker.set(clientId, []);
    }

    const timestamps = this.disconnectionTracker.get(clientId)!;
    timestamps.push(now);

    // Clean old entries
    const recentTimestamps = timestamps.filter(t => now - t < this.TIME_WINDOW);
    this.disconnectionTracker.set(clientId, recentTimestamps);

    if (recentTimestamps.length >= this.DISCONNECTION_THRESHOLD) {
      return {
        detected: true,
        type: 'frequent_disconnection',
        message: `Client "${clientId}" has disconnected ${recentTimestamps.length} times in the last hour`,
        severity: 'high',
        details: {
          clientId,
          count: recentTimestamps.length,
          timeWindow: '1 hour'
        }
      };
    }

    return null;
  }

  private trackLinkDown(message: string): DetectionResult | null {
    const interfaceName = this.extractInterfaceName(message);
    const now = Date.now();

    if (!this.linkDownTracker.has(interfaceName)) {
      this.linkDownTracker.set(interfaceName, []);
    }

    const timestamps = this.linkDownTracker.get(interfaceName)!;
    timestamps.push(now);

    const recentTimestamps = timestamps.filter(t => now - t < this.TIME_WINDOW);
    this.linkDownTracker.set(interfaceName, recentTimestamps);

    if (recentTimestamps.length >= this.LINK_DOWN_THRESHOLD) {
      return {
        detected: true,
        type: 'frequent_link_down',
        message: `Interface "${interfaceName}" went down ${recentTimestamps.length} times in the last hour`,
        severity: 'critical',
        details: {
          interface: interfaceName,
          count: recentTimestamps.length,
          timeWindow: '1 hour'
        }
      };
    }

    return null;
  }

  private trackError(message: string): DetectionResult | null {
    const errorType = this.extractErrorType(message);
    const now = Date.now();

    if (!this.errorTracker.has(errorType)) {
      this.errorTracker.set(errorType, []);
    }

    const timestamps = this.errorTracker.get(errorType)!;
    timestamps.push(now);

    const recentTimestamps = timestamps.filter(t => now - t < this.TIME_WINDOW);
    this.errorTracker.set(errorType, recentTimestamps);

    if (recentTimestamps.length >= this.ERROR_THRESHOLD) {
      return {
        detected: true,
        type: 'frequent_errors',
        message: `Frequent errors detected: "${errorType}" (${recentTimestamps.length} occurrences in the last hour)`,
        severity: 'high',
        details: {
          errorType,
          count: recentTimestamps.length,
          timeWindow: '1 hour'
        }
      };
    }

    return null;
  }

  private extractClientId(message: string): string {
    // Try to extract MAC address, IP, or username
    const macMatch = message.match(/([0-9a-f]{2}:){5}[0-9a-f]{2}/i);
    if (macMatch) return macMatch[0];

    const ipMatch = message.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
    if (ipMatch) return ipMatch[0];

    const userMatch = message.match(/user[:\s]+(\S+)/i);
    if (userMatch) return userMatch[1];

    return 'unknown';
  }

  private extractInterfaceName(message: string): string {
    const match = message.match(/interface[:\s]+(\S+)/i) ||
                  message.match(/(\S+):\s*link/i) ||
                  message.match(/on\s+(\S+)/i);
    return match ? match[1] : 'unknown';
  }

  private extractErrorType(message: string): string {
    const words = message.split(/\s+/).slice(0, 5).join(' ');
    return words || 'unknown error';
  }

  createOrUpdateAlert(detection: DetectionResult): void {
    const existing = alertOperations.findSimilar(
      this.nodeId,
      detection.type,
      detection.message
    );

    if (existing) {
      alertOperations.increment(existing.id!);
    } else {
      alertOperations.create({
        node_id: this.nodeId,
        type: detection.type,
        message: detection.message,
        severity: detection.severity,
        count: 1
      });
    }
  }

  cleanup(): void {
    this.disconnectionTracker.clear();
    this.linkDownTracker.clear();
    this.errorTracker.clear();
  }
}
