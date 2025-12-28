import axios, { AxiosInstance } from 'axios';
import { machineIdSync } from 'node-machine-id';
import * as os from 'os';
import log from 'electron-log';
import { 
  AgentConfig, 
  AgentStatus, 
  AuthRequest, 
  AuthResponse, 
  RemoteCommand,
  HeartbeatPayload,
  SystemInfo 
} from '../../shared/types';
import * as si from 'systeminformation';

export class ApiClient {
  private client: AxiosInstance;
  private getConfig: () => AgentConfig;
  private getStatus: () => AgentStatus;
  private updateStatus: (updates: Partial<AgentStatus>) => void;

  constructor(
    getConfig: () => AgentConfig,
    getStatus: () => AgentStatus,
    updateStatus: (updates: Partial<AgentStatus>) => void
  ) {
    this.getConfig = getConfig;
    this.getStatus = getStatus;
    this.updateStatus = updateStatus;

    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `ShieldGrid-Agent/${process.env.npm_package_version || '1.0.0'}`,
      },
    });

    this.client.interceptors.request.use((config) => {
      config.baseURL = this.getConfig().apiUrl;
      const status = this.getStatus();
      if (status.sessionToken) {
        config.headers['Authorization'] = `Bearer ${status.sessionToken}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.updateStatus({
            isAuthenticated: false,
            sessionToken: null,
            licenseStatus: 'invalid',
          });
        }
        throw error;
      }
    );
  }

  async authenticate(licenseKey: string): Promise<AuthResponse> {
    try {
      const deviceFingerprint = machineIdSync(true);
      const config = this.getConfig();

      const request: AuthRequest = {
        licenseKey,
        deviceFingerprint,
        platform: `${os.platform()}-${os.arch()}`,
        agentVersion: process.env.npm_package_version || '1.0.0',
      };

      const response = await this.client.post<AuthResponse>('/agents/auth', request);
      const data = response.data;

      if (data.success && data.sessionToken) {
        this.updateStatus({
          isAuthenticated: true,
          isConnected: true,
          sessionToken: data.sessionToken,
          licenseStatus: 'valid',
          lastSync: new Date(),
          commandQueue: data.commands || [],
        });

        log.info('Authentication successful');
      } else {
        this.updateStatus({
          isAuthenticated: false,
          licenseStatus: 'invalid',
        });
        log.warn('Authentication failed:', data.error);
      }

      return data;
    } catch (error) {
      log.error('Authentication error:', error);
      this.updateStatus({
        isAuthenticated: false,
        isConnected: false,
        licenseStatus: 'invalid',
      });

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async heartbeat(): Promise<RemoteCommand[]> {
    try {
      const status = this.getStatus();
      if (!status.sessionToken) {
        throw new Error('Not authenticated');
      }

      const systemInfo = await this.getSystemInfo();
      const config = this.getConfig();

      const payload: HeartbeatPayload = {
        deviceId: config.deviceId,
        sessionToken: status.sessionToken,
        systemInfo,
        agentVersion: process.env.npm_package_version || '1.0.0',
        status: 'online',
      };

      const response = await this.client.post<{ commands: RemoteCommand[] }>(
        '/agents/heartbeat',
        payload
      );

      this.updateStatus({
        isConnected: true,
        lastSync: new Date(),
        commandQueue: response.data.commands || [],
      });

      return response.data.commands || [];
    } catch (error) {
      log.error('Heartbeat failed:', error);
      this.updateStatus({ isConnected: false });
      throw error;
    }
  }

  async sync(): Promise<void> {
    try {
      await this.heartbeat();
      log.info('Sync completed successfully');
    } catch (error) {
      log.error('Sync failed:', error);
      throw error;
    }
  }

  async reportCommandResult(commandId: string, result: unknown): Promise<void> {
    try {
      await this.client.post(`/agents/commands/${commandId}/result`, {
        result,
        completedAt: new Date().toISOString(),
      });
      log.info(`Command ${commandId} result reported`);
    } catch (error) {
      log.error(`Failed to report command ${commandId} result:`, error);
    }
  }

  async reportTelemetry(data: {
    metricType: string;
    metricValue: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const config = this.getConfig();
      
      if (!config.telemetryEnabled) {
        return;
      }

      await this.client.post('/agents/telemetry', {
        deviceId: config.deviceId,
        timestamp: new Date().toISOString(),
        ...data,
      });
    } catch (error) {
      log.warn('Failed to report telemetry:', error);
    }
  }

  async checkForUpdates(): Promise<{
    updateAvailable: boolean;
    version?: string;
    downloadUrl?: string;
    releaseNotes?: string;
  }> {
    try {
      const response = await this.client.get('/agents/releases/latest');
      const currentVersion = process.env.npm_package_version || '1.0.0';
      const latestVersion = response.data.version;

      return {
        updateAvailable: this.compareVersions(latestVersion, currentVersion) > 0,
        version: latestVersion,
        downloadUrl: response.data.downloadUrl,
        releaseNotes: response.data.releaseNotes,
      };
    } catch (error) {
      log.error('Failed to check for updates:', error);
      return { updateAvailable: false };
    }
  }

  private async getSystemInfo(): Promise<SystemInfo> {
    const [osInfo, cpu, mem] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
    ]);

    return {
      hostname: os.hostname(),
      platform: osInfo.platform,
      arch: osInfo.arch,
      osVersion: `${osInfo.distro} ${osInfo.release}`,
      cpuModel: `${cpu.manufacturer} ${cpu.brand}`,
      cpuCores: cpu.cores,
      totalMemory: mem.total,
      freeMemory: mem.free,
      uptime: os.uptime(),
    };
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }
}
