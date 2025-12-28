import { useState, useEffect } from 'react';

interface SystemInfo {
  hostname: string;
  platform: string;
  osVersion: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
}

interface Status {
  isAuthenticated: boolean;
  isConnected: boolean;
  lastSync: string | null;
  licenseStatus: string;
}

export function Dashboard() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sysInfo, agentStatus] = await Promise.all([
        window.electronAPI.getSystemInfo(),
        window.electronAPI.getStatus(),
      ]);
      setSystemInfo(sysInfo as SystemInfo);
      setStatus(agentStatus as Status);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" />
        <p style={{ marginTop: '16px' }}>Loading system information...</p>
      </div>
    );
  }

  const memoryUsed = systemInfo ? systemInfo.totalMemory - systemInfo.freeMemory : 0;
  const memoryPercent = systemInfo ? Math.round((memoryUsed / systemInfo.totalMemory) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">System overview and protection status</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Protection Status</div>
          <div className={`stat-value ${status?.isAuthenticated ? 'success' : 'warning'}`}>
            {status?.isAuthenticated ? 'Active' : 'Inactive'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Connection</div>
          <div className={`stat-value ${status?.isConnected ? 'success' : 'danger'}`}>
            {status?.isConnected ? 'Online' : 'Offline'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">License</div>
          <div className={`stat-value ${status?.licenseStatus === 'valid' ? 'success' : 'warning'}`}>
            {status?.licenseStatus === 'valid' ? 'Valid' : 'Pending'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Last Sync</div>
          <div className="stat-value" style={{ fontSize: '16px' }}>
            {status?.lastSync ? new Date(status.lastSync).toLocaleString() : 'Never'}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">System Information</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div className="list-item">
            <span style={{ color: 'var(--text-secondary)' }}>Hostname</span>
            <span>{systemInfo?.hostname || 'Unknown'}</span>
          </div>
          <div className="list-item">
            <span style={{ color: 'var(--text-secondary)' }}>Platform</span>
            <span>{systemInfo?.platform || 'Unknown'}</span>
          </div>
          <div className="list-item">
            <span style={{ color: 'var(--text-secondary)' }}>OS Version</span>
            <span>{systemInfo?.osVersion || 'Unknown'}</span>
          </div>
          <div className="list-item">
            <span style={{ color: 'var(--text-secondary)' }}>CPU</span>
            <span>{systemInfo?.cpuModel || 'Unknown'}</span>
          </div>
          <div className="list-item">
            <span style={{ color: 'var(--text-secondary)' }}>CPU Cores</span>
            <span>{systemInfo?.cpuCores || 0}</span>
          </div>
          <div className="list-item">
            <span style={{ color: 'var(--text-secondary)' }}>System Uptime</span>
            <span>{systemInfo ? formatUptime(systemInfo.uptime) : 'Unknown'}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Memory Usage</h2>
          <span className={memoryPercent > 80 ? 'badge badge-danger' : memoryPercent > 60 ? 'badge badge-warning' : 'badge badge-success'}>
            {memoryPercent}%
          </span>
        </div>
        <div className="progress-bar" style={{ marginBottom: '12px' }}>
          <div 
            className="progress-fill" 
            style={{ 
              width: `${memoryPercent}%`,
              background: memoryPercent > 80 ? 'var(--danger)' : memoryPercent > 60 ? 'var(--warning)' : 'var(--success)'
            }} 
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-secondary)' }}>
          <span>Used: {formatBytes(memoryUsed)}</span>
          <span>Total: {formatBytes(systemInfo?.totalMemory || 0)}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" data-testid="button-quick-scan">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Quick Scan
          </button>
          <button className="btn btn-secondary" data-testid="button-clean-cache">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Clean Cache
          </button>
          <button className="btn btn-secondary" data-testid="button-optimize">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Optimize
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => window.electronAPI.syncWithServer()}
            data-testid="button-sync"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Sync Now
          </button>
        </div>
      </div>
    </div>
  );
}
