export interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  osVersion: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
}

export interface DiskInfo {
  device: string;
  mount: string;
  type: string;
  size: number;
  used: number;
  available: number;
  usePercent: number;
}

export interface CacheItem {
  type: 'browser' | 'system' | 'temp' | 'logs' | 'thumbnails' | 'downloads';
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  cleanable: boolean;
}

export interface CacheAnalysis {
  items: CacheItem[];
  totalSize: number;
  cleanableSize: number;
  categories: {
    browser: number;
    system: number;
    temp: number;
    logs: number;
    thumbnails: number;
    downloads: number;
  };
}

export interface CleanupResult {
  success: boolean;
  freedSpace: number;
  itemsCleaned: number;
  errors: string[];
}

export interface ThreatInfo {
  id: string;
  type: 'malware' | 'pup' | 'adware' | 'tracking' | 'vulnerability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  name: string;
  description: string;
  path?: string;
  detectedAt: Date;
  status: 'detected' | 'quarantined' | 'removed' | 'ignored';
}

export interface ScanResult {
  scanId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  filesScanned: number;
  threatsFound: ThreatInfo[];
  status: 'completed' | 'interrupted' | 'error';
}

export interface OptimizationAction {
  id: string;
  type: 'startup' | 'service' | 'registry' | 'memory' | 'disk';
  name: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  enabled: boolean;
  recommended: boolean;
}

export interface OptimizationResult {
  action: OptimizationAction;
  success: boolean;
  message: string;
  beforeValue?: number;
  afterValue?: number;
}

export interface AgentConfig {
  apiUrl: string;
  licenseKey: string | null;
  deviceId: string;
  autoUpdate: boolean;
  scanSchedule: 'daily' | 'weekly' | 'monthly' | 'manual';
  startWithSystem: boolean;
  minimizeToTray: boolean;
  notifications: boolean;
  telemetryEnabled: boolean;
}

export interface AgentStatus {
  isAuthenticated: boolean;
  isConnected: boolean;
  lastSync: Date | null;
  sessionToken: string | null;
  licenseStatus: 'valid' | 'invalid' | 'expired' | 'pending';
  commandQueue: RemoteCommand[];
}

export interface RemoteCommand {
  id: string;
  type: 'scan' | 'clean' | 'optimize' | 'update' | 'restart' | 'shutdown' | 'config';
  payload?: Record<string, unknown>;
  issuedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface TelemetryData {
  deviceId: string;
  timestamp: Date;
  metricType: 'cpu' | 'memory' | 'disk' | 'network' | 'scan' | 'clean' | 'optimize';
  metricValue: number;
  metadata?: Record<string, unknown>;
}

export interface HeartbeatPayload {
  deviceId: string;
  sessionToken: string;
  systemInfo: SystemInfo;
  agentVersion: string;
  status: 'online' | 'scanning' | 'cleaning' | 'optimizing' | 'idle';
}

export interface AuthRequest {
  licenseKey: string;
  deviceFingerprint: string;
  platform: string;
  agentVersion: string;
}

export interface AuthResponse {
  success: boolean;
  sessionToken?: string;
  deviceId?: string;
  error?: string;
  commands?: RemoteCommand[];
}
