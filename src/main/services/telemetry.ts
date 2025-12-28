import log from 'electron-log';
import { AgentConfig, TelemetryData } from '../../shared/types';
import { ApiClient } from './api';

export class TelemetryService {
  private queue: TelemetryData[] = [];
  private getConfig: () => AgentConfig;
  private apiClient: ApiClient;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(getConfig: () => AgentConfig, apiClient: ApiClient) {
    this.getConfig = getConfig;
    this.apiClient = apiClient;
    this.startFlushInterval();
  }

  track(
    metricType: TelemetryData['metricType'],
    metricValue: number,
    metadata?: Record<string, unknown>
  ): void {
    const config = this.getConfig();

    if (!config.telemetryEnabled) {
      return;
    }

    const data: TelemetryData = {
      deviceId: config.deviceId,
      timestamp: new Date(),
      metricType,
      metricValue,
      metadata,
    };

    this.queue.push(data);

    // Flush immediately if queue is large
    if (this.queue.length >= 10) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const itemsToSend = [...this.queue];
    this.queue = [];

    try {
      for (const item of itemsToSend) {
        await this.apiClient.reportTelemetry({
          metricType: item.metricType,
          metricValue: item.metricValue,
          metadata: item.metadata,
        });
      }
      log.debug(`Flushed ${itemsToSend.length} telemetry items`);
    } catch (error) {
      log.error('Failed to flush telemetry:', error);
      // Re-queue failed items
      this.queue.unshift(...itemsToSend);
    }
  }

  private startFlushInterval(): void {
    // Flush every 5 minutes
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5 * 60 * 1000);
  }

  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    // Final flush
    this.flush();
  }
}
