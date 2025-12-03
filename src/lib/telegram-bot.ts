import TelegramBot from 'node-telegram-bot-api';
import { settingsOperations } from './database';

export class TelegramNotifier {
  private bot: TelegramBot | null = null;
  private chatId: string | null = null;
  private enabled = false;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const token = settingsOperations.get('telegram_token');
    const chatId = settingsOperations.get('telegram_chat_id');

    if (token && chatId) {
      this.initialize(token, chatId);
    }
  }

  initialize(token: string, chatId: string): boolean {
    try {
      this.bot = new TelegramBot(token, { polling: false });
      this.chatId = chatId;
      this.enabled = true;

      settingsOperations.set('telegram_token', token);
      settingsOperations.set('telegram_chat_id', chatId);

      console.log('[Telegram] Bot initialized successfully');
      return true;
    } catch (error) {
      console.error('[Telegram] Failed to initialize bot:', error);
      this.enabled = false;
      return false;
    }
  }

  async sendNotification(message: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<boolean> {
    if (!this.enabled || !this.bot || !this.chatId) {
      console.warn('[Telegram] Bot not configured, notification not sent');
      return false;
    }

    try {
      const icon = this.getSeverityIcon(severity);
      const formattedMessage = `${icon} *MikroTik Monitor Alert*\n\n${message}\n\n_${new Date().toLocaleString()}_`;

      await this.bot.sendMessage(this.chatId, formattedMessage, {
        parse_mode: 'Markdown'
      });

      console.log('[Telegram] Notification sent successfully');
      return true;
    } catch (error) {
      console.error('[Telegram] Failed to send notification:', error);
      return false;
    }
  }

  async sendAlert(nodeName: string, alertType: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical', count: number): Promise<boolean> {
    const severityEmoji = this.getSeverityIcon(severity);
    const typeEmoji = this.getAlertTypeIcon(alertType);

    const notification = `${severityEmoji} *${severity.toUpperCase()} Alert*

${typeEmoji} *Type:* ${alertType.replace(/_/g, ' ').toUpperCase()}
🖥️ *Node:* ${nodeName}
📊 *Occurrences:* ${count}

📝 *Details:*
${message}`;

    return this.sendNotification(notification, severity);
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.enabled || !this.bot || !this.chatId) {
      return {
        success: false,
        message: 'Telegram bot not configured'
      };
    }

    try {
      await this.bot.sendMessage(
        this.chatId,
        '✅ *Test Successful!*\n\nMikroTik Monitor is connected and ready to send notifications.',
        { parse_mode: 'Markdown' }
      );
      return {
        success: true,
        message: 'Test message sent successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to send test message'
      };
    }
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'low': return '🔵';
      case 'medium': return '🟡';
      case 'high': return '🟠';
      case 'critical': return '🔴';
      default: return 'ℹ️';
    }
  }

  private getAlertTypeIcon(type: string): string {
    switch (type) {
      case 'frequent_disconnection': return '📵';
      case 'frequent_link_down': return '🔌';
      case 'auth_failure': return '🔐';
      case 'dhcp_issue': return '🌐';
      case 'frequent_errors': return '⚠️';
      case 'resource_issue': return '💾';
      case 'critical_error': return '💥';
      default: return '🔔';
    }
  }

  disable(): void {
    this.enabled = false;
    this.bot = null;
    this.chatId = null;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getConfig(): { token: string | undefined; chatId: string | undefined } {
    return {
      token: settingsOperations.get('telegram_token'),
      chatId: settingsOperations.get('telegram_chat_id')
    };
  }
}

// Singleton instance
export const telegramNotifier = new TelegramNotifier();
