import { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Scanner } from './pages/Scanner';
import { CacheCleaner } from './pages/CacheCleaner';
import { Optimizer } from './pages/Optimizer';
import { Settings } from './pages/Settings';

type Page = 'dashboard' | 'scanner' | 'cache' | 'optimizer' | 'settings';

declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<unknown>;
      updateConfig: (updates: Record<string, unknown>) => Promise<unknown>;
      getStatus: () => Promise<unknown>;
      getSystemInfo: () => Promise<unknown>;
      getDiskInfo: () => Promise<unknown>;
      analyzeCache: () => Promise<unknown>;
      cleanCache: (types?: string[]) => Promise<unknown>;
      runScan: (scanType: 'quick' | 'full' | 'custom') => Promise<unknown>;
      onScanProgress: (callback: (data: { progress: number; status: string }) => void) => () => void;
      getOptimizationActions: () => Promise<unknown>;
      applyOptimization: (actionId: string) => Promise<unknown>;
      authenticate: (licenseKey: string) => Promise<unknown>;
      syncWithServer: () => Promise<void>;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      openExternal: (url: string) => void;
      getAppVersion: () => Promise<string>;
      checkForUpdates: () => Promise<unknown>;
      onUpdateAvailable: (callback: (info: unknown) => void) => () => void;
      onUpdateDownloaded: (callback: (info: unknown) => void) => () => void;
      onQuickScan: (callback: () => void) => () => void;
      onCleanCache: (callback: () => void) => () => void;
      onOpenSettings: (callback: () => void) => () => void;
      onConfigUpdated: (callback: () => void) => () => void;
      onRemoteScan: (callback: (payload: unknown) => void) => () => void;
    };
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [version, setVersion] = useState('1.0.0');

  useEffect(() => {
    window.electronAPI.getAppVersion().then(setVersion);

    const unsubQuickScan = window.electronAPI.onQuickScan(() => {
      setCurrentPage('scanner');
    });

    const unsubCleanCache = window.electronAPI.onCleanCache(() => {
      setCurrentPage('cache');
    });

    const unsubOpenSettings = window.electronAPI.onOpenSettings(() => {
      setCurrentPage('settings');
    });

    return () => {
      unsubQuickScan();
      unsubCleanCache();
      unsubOpenSettings();
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'scanner':
        return <Scanner />;
      case 'cache':
        return <CacheCleaner />;
      case 'optimizer':
        return <Optimizer />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <div className="titlebar">
        <div className="titlebar-title">ShieldGrid Agent v{version}</div>
        <div className="titlebar-controls">
          <button 
            className="titlebar-btn" 
            onClick={() => window.electronAPI.minimizeWindow()}
            data-testid="button-minimize"
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
              <rect width="10" height="1" />
            </svg>
          </button>
          <button 
            className="titlebar-btn" 
            onClick={() => window.electronAPI.maximizeWindow()}
            data-testid="button-maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor">
              <rect x="0.5" y="0.5" width="9" height="9" strokeWidth="1" />
            </svg>
          </button>
          <button 
            className="titlebar-btn close" 
            onClick={() => window.electronAPI.closeWindow()}
            data-testid="button-close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="main-content">
        <nav className="sidebar">
          <button
            className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
            data-testid="nav-dashboard"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <path d="M9 22V12h6v10" />
            </svg>
            Dashboard
          </button>
          <button
            className={`nav-item ${currentPage === 'scanner' ? 'active' : ''}`}
            onClick={() => setCurrentPage('scanner')}
            data-testid="nav-scanner"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Security Scan
          </button>
          <button
            className={`nav-item ${currentPage === 'cache' ? 'active' : ''}`}
            onClick={() => setCurrentPage('cache')}
            data-testid="nav-cache"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Cache Cleaner
          </button>
          <button
            className={`nav-item ${currentPage === 'optimizer' ? 'active' : ''}`}
            onClick={() => setCurrentPage('optimizer')}
            data-testid="nav-optimizer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Optimizer
          </button>
          <button
            className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentPage('settings')}
            data-testid="nav-settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Settings
          </button>
        </nav>

        <main className="content">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
