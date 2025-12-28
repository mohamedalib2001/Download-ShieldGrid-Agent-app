import { useState, useEffect } from 'react';

interface AgentConfig {
  apiUrl: string;
  licenseKey: string | null;
  deviceId: string;
  autoUpdate: boolean;
  scanSchedule: string;
  startWithSystem: boolean;
  minimizeToTray: boolean;
  notifications: boolean;
  telemetryEnabled: boolean;
}

interface AgentStatus {
  isAuthenticated: boolean;
  isConnected: boolean;
  lastSync: string | null;
  licenseStatus: string;
}

export function Settings() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [configData, statusData] = await Promise.all([
        window.electronAPI.getConfig(),
        window.electronAPI.getStatus(),
      ]);
      setConfig(configData as AgentConfig);
      setStatus(statusData as AgentStatus);
      if ((configData as AgentConfig).licenseKey) {
        setLicenseKey((configData as AgentConfig).licenseKey || '');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<AgentConfig>) => {
    setSaving(true);
    try {
      const newConfig = await window.electronAPI.updateConfig(updates);
      setConfig(newConfig as AgentConfig);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const authenticate = async () => {
    if (!licenseKey.trim()) return;
    
    setAuthenticating(true);
    try {
      const result = await window.electronAPI.authenticate(licenseKey) as { success: boolean; error?: string };
      if (result.success) {
        setMessage({ type: 'success', text: 'License activated successfully!' });
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.error || 'Invalid license key' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Authentication failed' });
    } finally {
      setAuthenticating(false);
    }
  };

  const checkForUpdates = async () => {
    try {
      await window.electronAPI.checkForUpdates();
      setMessage({ type: 'success', text: 'Checking for updates...' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to check for updates' });
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" />
        <p style={{ marginTop: '16px' }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Configure your ShieldGrid Agent preferences</p>
      </div>

      {message && (
        <div 
          className="card" 
          style={{ 
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            padding: '12px 16px',
            marginBottom: '16px'
          }}
        >
          <span style={{ color: message.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
            {message.text}
          </span>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">License</h2>
          <span className={`badge ${status?.licenseStatus === 'valid' ? 'badge-success' : 'badge-warning'}`}>
            {status?.licenseStatus === 'valid' ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="Enter your license key"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
            data-testid="input-license-key"
          />
          <button 
            className="btn btn-primary"
            onClick={authenticate}
            disabled={authenticating || !licenseKey.trim()}
            data-testid="button-activate"
          >
            {authenticating ? (
              <div className="loading-spinner" style={{ width: '14px', height: '14px' }} />
            ) : (
              'Activate'
            )}
          </button>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
          Device ID: {config?.deviceId}
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">General</h2>
        </div>
        
        <div className="list-item" style={{ marginBottom: '8px' }}>
          <div>
            <div style={{ fontWeight: 500 }}>Start with System</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Launch ShieldGrid automatically when you log in
            </div>
          </div>
          <button
            className={`toggle-btn ${config?.startWithSystem ? 'active' : ''}`}
            onClick={() => updateConfig({ startWithSystem: !config?.startWithSystem })}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              background: config?.startWithSystem ? 'var(--accent)' : 'var(--bg-tertiary)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s ease',
            }}
            data-testid="toggle-start-with-system"
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '3px',
              left: config?.startWithSystem ? '23px' : '3px',
              transition: 'left 0.2s ease',
            }} />
          </button>
        </div>

        <div className="list-item" style={{ marginBottom: '8px' }}>
          <div>
            <div style={{ fontWeight: 500 }}>Minimize to Tray</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Keep running in the background when window is closed
            </div>
          </div>
          <button
            className={`toggle-btn ${config?.minimizeToTray ? 'active' : ''}`}
            onClick={() => updateConfig({ minimizeToTray: !config?.minimizeToTray })}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              background: config?.minimizeToTray ? 'var(--accent)' : 'var(--bg-tertiary)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s ease',
            }}
            data-testid="toggle-minimize-to-tray"
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '3px',
              left: config?.minimizeToTray ? '23px' : '3px',
              transition: 'left 0.2s ease',
            }} />
          </button>
        </div>

        <div className="list-item" style={{ marginBottom: '8px' }}>
          <div>
            <div style={{ fontWeight: 500 }}>Notifications</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Show desktop notifications for important events
            </div>
          </div>
          <button
            className={`toggle-btn ${config?.notifications ? 'active' : ''}`}
            onClick={() => updateConfig({ notifications: !config?.notifications })}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              background: config?.notifications ? 'var(--accent)' : 'var(--bg-tertiary)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s ease',
            }}
            data-testid="toggle-notifications"
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '3px',
              left: config?.notifications ? '23px' : '3px',
              transition: 'left 0.2s ease',
            }} />
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Scanning</h2>
        </div>
        
        <div className="list-item" style={{ marginBottom: '8px' }}>
          <div>
            <div style={{ fontWeight: 500 }}>Scan Schedule</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Automatically run scans on a schedule
            </div>
          </div>
          <select
            value={config?.scanSchedule || 'daily'}
            onChange={(e) => updateConfig({ scanSchedule: e.target.value })}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
            data-testid="select-scan-schedule"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="manual">Manual only</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Updates</h2>
        </div>
        
        <div className="list-item" style={{ marginBottom: '8px' }}>
          <div>
            <div style={{ fontWeight: 500 }}>Auto Updates</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Automatically download and install updates
            </div>
          </div>
          <button
            className={`toggle-btn ${config?.autoUpdate ? 'active' : ''}`}
            onClick={() => updateConfig({ autoUpdate: !config?.autoUpdate })}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              background: config?.autoUpdate ? 'var(--accent)' : 'var(--bg-tertiary)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s ease',
            }}
            data-testid="toggle-auto-update"
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '3px',
              left: config?.autoUpdate ? '23px' : '3px',
              transition: 'left 0.2s ease',
            }} />
          </button>
        </div>

        <button 
          className="btn btn-secondary" 
          onClick={checkForUpdates}
          data-testid="button-check-updates"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          Check for Updates
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Privacy</h2>
        </div>
        
        <div className="list-item">
          <div>
            <div style={{ fontWeight: 500 }}>Usage Telemetry</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Help improve ShieldGrid by sending anonymous usage data
            </div>
          </div>
          <button
            className={`toggle-btn ${config?.telemetryEnabled ? 'active' : ''}`}
            onClick={() => updateConfig({ telemetryEnabled: !config?.telemetryEnabled })}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              background: config?.telemetryEnabled ? 'var(--accent)' : 'var(--bg-tertiary)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s ease',
            }}
            data-testid="toggle-telemetry"
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '3px',
              left: config?.telemetryEnabled ? '23px' : '3px',
              transition: 'left 0.2s ease',
            }} />
          </button>
        </div>
      </div>
    </div>
  );
}
