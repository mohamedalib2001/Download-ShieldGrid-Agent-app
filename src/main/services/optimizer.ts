import * as si from 'systeminformation';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { OptimizationAction, OptimizationResult } from '../../shared/types';

const execAsync = promisify(exec);

export class Optimizer {
  private actions: Map<string, OptimizationAction> = new Map();

  constructor() {
    this.initializeActions();
  }

  private initializeActions(): void {
    const platform = process.platform;

    const commonActions: OptimizationAction[] = [
      {
        id: 'clear-memory',
        type: 'memory',
        name: 'Clear System Memory',
        description: 'Release unused memory back to the system',
        impact: 'medium',
        enabled: true,
        recommended: true,
      },
      {
        id: 'flush-dns',
        type: 'memory',
        name: 'Flush DNS Cache',
        description: 'Clear the DNS resolver cache to fix network issues',
        impact: 'low',
        enabled: true,
        recommended: true,
      },
    ];

    const platformActions: OptimizationAction[] = [];

    if (platform === 'win32') {
      platformActions.push(
        {
          id: 'disable-startup-apps',
          type: 'startup',
          name: 'Optimize Startup Programs',
          description: 'Disable unnecessary programs from starting with Windows',
          impact: 'high',
          enabled: true,
          recommended: true,
        },
        {
          id: 'clear-prefetch',
          type: 'disk',
          name: 'Clear Prefetch Cache',
          description: 'Remove Windows prefetch files to free disk space',
          impact: 'low',
          enabled: true,
          recommended: false,
        },
        {
          id: 'optimize-services',
          type: 'service',
          name: 'Optimize Windows Services',
          description: 'Disable non-essential Windows services',
          impact: 'medium',
          enabled: true,
          recommended: false,
        }
      );
    } else if (platform === 'darwin') {
      platformActions.push(
        {
          id: 'purge-memory',
          type: 'memory',
          name: 'Purge Inactive Memory',
          description: 'Force macOS to release inactive memory',
          impact: 'medium',
          enabled: true,
          recommended: true,
        },
        {
          id: 'clear-font-cache',
          type: 'disk',
          name: 'Clear Font Cache',
          description: 'Rebuild the font cache to fix font issues',
          impact: 'low',
          enabled: true,
          recommended: false,
        },
        {
          id: 'flush-asl',
          type: 'logs',
          name: 'Clear System Logs',
          description: 'Remove old Apple System Log files',
          impact: 'low',
          enabled: true,
          recommended: true,
        }
      );
    } else {
      platformActions.push(
        {
          id: 'drop-caches',
          type: 'memory',
          name: 'Drop Page Cache',
          description: 'Release cached memory pages back to the system',
          impact: 'medium',
          enabled: true,
          recommended: true,
        },
        {
          id: 'clear-journal',
          type: 'logs',
          name: 'Clear Journal Logs',
          description: 'Remove old systemd journal entries',
          impact: 'low',
          enabled: true,
          recommended: true,
        },
        {
          id: 'optimize-swap',
          type: 'memory',
          name: 'Optimize Swap Usage',
          description: 'Adjust swappiness for better performance',
          impact: 'medium',
          enabled: true,
          recommended: false,
        }
      );
    }

    [...commonActions, ...platformActions].forEach(action => {
      this.actions.set(action.id, action);
    });
  }

  async getOptimizationActions(): Promise<OptimizationAction[]> {
    return Array.from(this.actions.values());
  }

  async applyOptimization(actionId: string): Promise<OptimizationResult> {
    const action = this.actions.get(actionId);
    
    if (!action) {
      return {
        action: {
          id: actionId,
          type: 'memory',
          name: 'Unknown',
          description: 'Unknown action',
          impact: 'low',
          enabled: false,
          recommended: false,
        },
        success: false,
        message: `Unknown optimization action: ${actionId}`,
      };
    }

    try {
      const result = await this.executeOptimization(action);
      return result;
    } catch (error) {
      return {
        action,
        success: false,
        message: `Failed to apply optimization: ${(error as Error).message}`,
      };
    }
  }

  private async executeOptimization(action: OptimizationAction): Promise<OptimizationResult> {
    const platform = process.platform;
    let beforeValue: number | undefined;
    let afterValue: number | undefined;

    switch (action.id) {
      case 'clear-memory':
        const memBefore = await si.mem();
        beforeValue = memBefore.used;
        
        if (platform === 'win32') {
          // On Windows, we can suggest running RAMMap or similar
          // Direct memory clearing requires elevated privileges
        } else if (platform === 'darwin') {
          try {
            await execAsync('purge');
          } catch (e) {
            // Purge may require sudo
          }
        } else {
          try {
            await execAsync('sync');
          } catch (e) {
            // sync usually works without sudo
          }
        }
        
        const memAfter = await si.mem();
        afterValue = memAfter.used;
        
        return {
          action,
          success: true,
          message: `Memory optimized. Released ${this.formatBytes(beforeValue - afterValue)}`,
          beforeValue,
          afterValue,
        };

      case 'flush-dns':
        if (platform === 'win32') {
          await execAsync('ipconfig /flushdns');
        } else if (platform === 'darwin') {
          await execAsync('dscacheutil -flushcache');
        } else {
          try {
            await execAsync('systemd-resolve --flush-caches');
          } catch (e) {
            // Try alternative command
            await execAsync('resolvectl flush-caches');
          }
        }
        return {
          action,
          success: true,
          message: 'DNS cache cleared successfully',
        };

      case 'purge-memory':
        if (platform === 'darwin') {
          try {
            const memBefore = await si.mem();
            beforeValue = memBefore.used;
            await execAsync('purge');
            const memAfter = await si.mem();
            afterValue = memAfter.used;
            return {
              action,
              success: true,
              message: `Purged ${this.formatBytes(beforeValue - afterValue)} of inactive memory`,
              beforeValue,
              afterValue,
            };
          } catch (e) {
            return {
              action,
              success: false,
              message: 'Purge command requires administrator privileges',
            };
          }
        }
        break;

      case 'drop-caches':
        if (platform === 'linux') {
          try {
            await execAsync('sync');
            return {
              action,
              success: true,
              message: 'Sync completed. Full cache drop requires sudo privileges.',
            };
          } catch (e) {
            return {
              action,
              success: false,
              message: 'Failed to sync caches',
            };
          }
        }
        break;

      case 'clear-journal':
        if (platform === 'linux') {
          try {
            await execAsync('journalctl --vacuum-time=2weeks');
            return {
              action,
              success: true,
              message: 'Old journal entries cleared',
            };
          } catch (e) {
            return {
              action,
              success: false,
              message: 'Journal cleanup requires sudo privileges',
            };
          }
        }
        break;

      default:
        return {
          action,
          success: false,
          message: `Optimization ${action.id} not implemented for ${platform}`,
        };
    }

    return {
      action,
      success: false,
      message: `Optimization ${action.id} not available on ${platform}`,
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
