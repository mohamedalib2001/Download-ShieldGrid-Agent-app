import { useState, useEffect } from 'react';

interface ThreatInfo {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  name: string;
  description: string;
  path?: string;
  status: string;
}

interface ScanResult {
  scanId: string;
  startTime: string;
  endTime: string;
  duration: number;
  filesScanned: number;
  threatsFound: ThreatInfo[];
  status: string;
}

export function Scanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onScanProgress((data) => {
      setProgress(data.progress);
      setStatusText(data.status);
    });

    return () => unsubscribe();
  }, []);

  const startScan = async (type: 'quick' | 'full' | 'custom') => {
    setIsScanning(true);
    setProgress(0);
    setStatusText('Initializing scan...');

    try {
      const result = await window.electronAPI.runScan(type);
      setLastScan(result as ScanResult);
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsScanning(false);
      setProgress(100);
      setStatusText('Scan complete');
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'var(--danger)';
      case 'high': return '#ef4444';
      case 'medium': return 'var(--warning)';
      case 'low': return 'var(--success)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Security Scanner</h1>
        <p className="page-description">Scan your system for threats and vulnerabilities</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Scan Options</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <button
            className="btn btn-primary"
            onClick={() => startScan('quick')}
            disabled={isScanning}
            data-testid="button-quick-scan"
            style={{ padding: '24px 16px', flexDirection: 'column', gap: '8px' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span style={{ fontWeight: 600 }}>Quick Scan</span>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>~2 minutes</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => startScan('full')}
            disabled={isScanning}
            data-testid="button-full-scan"
            style={{ padding: '24px 16px', flexDirection: 'column', gap: '8px' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span style={{ fontWeight: 600 }}>Full Scan</span>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>~15 minutes</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => startScan('custom')}
            disabled={isScanning}
            data-testid="button-custom-scan"
            style={{ padding: '24px 16px', flexDirection: 'column', gap: '8px' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M12 18v-6M9 15h6" />
            </svg>
            <span style={{ fontWeight: 600 }}>Custom Scan</span>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>Select folders</span>
          </button>
        </div>
      </div>

      {isScanning && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Scanning...</h2>
            <span className="badge badge-warning">{progress}%</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: '12px' }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{statusText}</p>
        </div>
      )}

      {lastScan && !isScanning && (
        <>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Scan Results</h2>
              <span className={`badge ${lastScan.threatsFound.length > 0 ? 'badge-danger' : 'badge-success'}`}>
                {lastScan.threatsFound.length} threats found
              </span>
            </div>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Files Scanned</div>
                <div className="stat-value">{lastScan.filesScanned.toLocaleString()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Duration</div>
                <div className="stat-value">{Math.round(lastScan.duration / 1000)}s</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Threats Found</div>
                <div className={`stat-value ${lastScan.threatsFound.length > 0 ? 'danger' : 'success'}`}>
                  {lastScan.threatsFound.length}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Status</div>
                <div className="stat-value success">Complete</div>
              </div>
            </div>
          </div>

          {lastScan.threatsFound.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Detected Threats</h2>
              </div>
              {lastScan.threatsFound.map((threat) => (
                <div key={threat.id} className="list-item" style={{ marginBottom: '8px' }}>
                  <div className="list-item-content">
                    <div 
                      className="status-indicator" 
                      style={{ background: getSeverityColor(threat.severity) }} 
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>{threat.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {threat.description}
                      </div>
                      {threat.path && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {threat.path}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      className="badge" 
                      style={{ 
                        background: `${getSeverityColor(threat.severity)}22`,
                        color: getSeverityColor(threat.severity)
                      }}
                    >
                      {threat.severity}
                    </span>
                    <button className="btn btn-danger" style={{ padding: '6px 12px' }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!isScanning && !lastScan && (
        <div className="card">
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <h3 style={{ marginBottom: '8px' }}>No scans yet</h3>
            <p>Run a scan to check your system for threats and vulnerabilities</p>
          </div>
        </div>
      )}
    </div>
  );
}
