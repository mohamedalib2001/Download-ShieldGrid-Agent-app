import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } from 'electron';
import * as path from 'path';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import Store from 'electron-store';
import { machineIdSync } from 'node-machine-id';
import { v4 as uuidv4 } from 'uuid';
import { AgentConfig, AgentStatus } from '../shared/types';
import { SystemScanner } from './services/scanner';
import { CacheManager } from './services/cache';
import { Optimizer } from './services/optimizer';
import { ApiClient } from './services/api';
import { TelemetryService } from './services/telemetry';

const store = new Store<{
  config: AgentConfig;
  status: AgentStatus;
}>();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const DEFAULT_CONFIG: AgentConfig = {
  apiUrl: process.env.API_URL || 'https://shieldgrid.infera.com/api',
  licenseKey: null,
  deviceId: machineIdSync(true),
  autoUpdate: true,
  scanSchedule: 'daily',
  startWithSystem: true,
  minimizeToTray: true,
  notifications: true,
  telemetryEnabled: true,
};

const DEFAULT_STATUS: AgentStatus = {
  isAuthenticated: false,
  isConnected: false,
  lastSync: null,
  sessionToken: null,
  licenseStatus: 'pending',
  commandQueue: [],
};

function getConfig(): AgentConfig {
  return store.get('config', DEFAULT_CONFIG);
}

function getStatus(): AgentStatus {
  return store.get('status', DEFAULT_STATUS);
}

function updateConfig(updates: Partial<AgentConfig>): void {
  const current = getConfig();
  store.set('config', { ...current, ...updates });
}

function updateStatus(updates: Partial<AgentStatus>): void {
  const current = getStatus();
  store.set('status', { ...current, ...updates });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#0a0a0a',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting && getConfig().minimizeToTray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open ShieldGrid',
      click: () => {
        mainWindow?.show();
      },
    },
    { type: 'separator' },
    {
      label: 'Quick Scan',
      click: () => {
        mainWindow?.webContents.send('quick-scan');
      },
    },
    {
      label: 'Clean Cache',
      click: () => {
        mainWindow?.webContents.send('clean-cache');
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('open-settings');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('ShieldGrid Agent');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

const scanner = new SystemScanner();
const cacheManager = new CacheManager();
const optimizer = new Optimizer();
const apiClient = new ApiClient(getConfig, getStatus, updateStatus);
const telemetry = new TelemetryService(getConfig, apiClient);

function setupIpcHandlers(): void {
  ipcMain.handle('get-config', () => getConfig());
  ipcMain.handle('update-config', (_, updates: Partial<AgentConfig>) => {
    updateConfig(updates);
    return getConfig();
  });
  ipcMain.handle('get-status', () => getStatus());

  ipcMain.handle('get-system-info', async () => {
    return scanner.getSystemInfo();
  });

  ipcMain.handle('get-disk-info', async () => {
    return scanner.getDiskInfo();
  });

  ipcMain.handle('analyze-cache', async () => {
    return cacheManager.analyzeCache();
  });

  ipcMain.handle('clean-cache', async (_, types?: string[]) => {
    const result = await cacheManager.cleanCache(types);
    telemetry.track('clean', result.freedSpace, { itemsCleaned: result.itemsCleaned });
    return result;
  });

  ipcMain.handle('run-scan', async (_, scanType: 'quick' | 'full' | 'custom') => {
    mainWindow?.webContents.send('scan-progress', { progress: 0, status: 'starting' });
    
    const result = await scanner.runScan(scanType, (progress, status) => {
      mainWindow?.webContents.send('scan-progress', { progress, status });
    });
    
    telemetry.track('scan', result.filesScanned, { 
      threats: result.threatsFound.length,
      duration: result.duration 
    });
    
    return result;
  });

  ipcMain.handle('get-optimization-actions', async () => {
    return optimizer.getOptimizationActions();
  });

  ipcMain.handle('apply-optimization', async (_, actionId: string) => {
    const result = await optimizer.applyOptimization(actionId);
    if (result.success) {
      telemetry.track('optimize', 1, { action: actionId });
    }
    return result;
  });

  ipcMain.handle('authenticate', async (_, licenseKey: string) => {
    return apiClient.authenticate(licenseKey);
  });

  ipcMain.handle('sync-with-server', async () => {
    return apiClient.sync();
  });

  ipcMain.handle('window-minimize', () => mainWindow?.minimize());
  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window-close', () => mainWindow?.close());

  ipcMain.handle('open-external', (_, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('check-for-updates', async () => {
    return autoUpdater.checkForUpdates();
  });
}

function setupAutoUpdater(): void {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = getConfig().autoUpdate;

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', info);
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-downloaded', info);
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err);
  });
}

async function startHeartbeat(): Promise<void> {
  const HEARTBEAT_INTERVAL = 60000;
  
  setInterval(async () => {
    const status = getStatus();
    if (status.isAuthenticated && status.sessionToken) {
      try {
        const commands = await apiClient.heartbeat();
        if (commands && commands.length > 0) {
          for (const command of commands) {
            await executeRemoteCommand(command);
          }
        }
      } catch (error) {
        log.error('Heartbeat failed:', error);
      }
    }
  }, HEARTBEAT_INTERVAL);
}

async function executeRemoteCommand(command: any): Promise<void> {
  log.info('Executing remote command:', command.type);
  
  switch (command.type) {
    case 'scan':
      mainWindow?.webContents.send('remote-scan', command.payload);
      break;
    case 'clean':
      const cleanResult = await cacheManager.cleanCache();
      await apiClient.reportCommandResult(command.id, cleanResult);
      break;
    case 'optimize':
      if (command.payload?.actionId) {
        const optimizeResult = await optimizer.applyOptimization(command.payload.actionId);
        await apiClient.reportCommandResult(command.id, optimizeResult);
      }
      break;
    case 'update':
      autoUpdater.checkForUpdates();
      break;
    case 'config':
      if (command.payload) {
        updateConfig(command.payload as Partial<AgentConfig>);
        mainWindow?.webContents.send('config-updated');
      }
      break;
    default:
      log.warn('Unknown command type:', command.type);
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupIpcHandlers();
  setupAutoUpdater();
  startHeartbeat();

  if (getConfig().autoUpdate) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

log.info('ShieldGrid Agent started');
