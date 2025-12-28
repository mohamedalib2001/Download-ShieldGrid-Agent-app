import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (updates: Record<string, unknown>) => ipcRenderer.invoke('update-config', updates),
  getStatus: () => ipcRenderer.invoke('get-status'),

  // System Info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getDiskInfo: () => ipcRenderer.invoke('get-disk-info'),

  // Cache Management
  analyzeCache: () => ipcRenderer.invoke('analyze-cache'),
  cleanCache: (types?: string[]) => ipcRenderer.invoke('clean-cache', types),

  // Scanning
  runScan: (scanType: 'quick' | 'full' | 'custom') => ipcRenderer.invoke('run-scan', scanType),
  onScanProgress: (callback: (data: { progress: number; status: string }) => void) => {
    ipcRenderer.on('scan-progress', (_, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('scan-progress');
  },

  // Optimization
  getOptimizationActions: () => ipcRenderer.invoke('get-optimization-actions'),
  applyOptimization: (actionId: string) => ipcRenderer.invoke('apply-optimization', actionId),

  // Authentication & Sync
  authenticate: (licenseKey: string) => ipcRenderer.invoke('authenticate', licenseKey),
  syncWithServer: () => ipcRenderer.invoke('sync-with-server'),

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),

  // External Links
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // Updates
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateAvailable: (callback: (info: unknown) => void) => {
    ipcRenderer.on('update-available', (_, info) => callback(info));
    return () => ipcRenderer.removeAllListeners('update-available');
  },
  onUpdateDownloaded: (callback: (info: unknown) => void) => {
    ipcRenderer.on('update-downloaded', (_, info) => callback(info));
    return () => ipcRenderer.removeAllListeners('update-downloaded');
  },

  // Remote Events
  onQuickScan: (callback: () => void) => {
    ipcRenderer.on('quick-scan', () => callback());
    return () => ipcRenderer.removeAllListeners('quick-scan');
  },
  onCleanCache: (callback: () => void) => {
    ipcRenderer.on('clean-cache', () => callback());
    return () => ipcRenderer.removeAllListeners('clean-cache');
  },
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on('open-settings', () => callback());
    return () => ipcRenderer.removeAllListeners('open-settings');
  },
  onConfigUpdated: (callback: () => void) => {
    ipcRenderer.on('config-updated', () => callback());
    return () => ipcRenderer.removeAllListeners('config-updated');
  },
  onRemoteScan: (callback: (payload: unknown) => void) => {
    ipcRenderer.on('remote-scan', (_, payload) => callback(payload));
    return () => ipcRenderer.removeAllListeners('remote-scan');
  },
});
