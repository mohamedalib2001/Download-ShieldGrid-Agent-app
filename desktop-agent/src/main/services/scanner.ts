import * as si from 'systeminformation';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { SystemInfo, DiskInfo, ThreatInfo, ScanResult } from '../../shared/types';

export class SystemScanner {
  async getSystemInfo(): Promise<SystemInfo> {
    const [osInfo, cpu, mem] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem()
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

  async getDiskInfo(): Promise<DiskInfo[]> {
    const disks = await si.fsSize();
    return disks.map(disk => ({
      device: disk.fs,
      mount: disk.mount,
      type: disk.type,
      size: disk.size,
      used: disk.used,
      available: disk.available,
      usePercent: disk.use,
    }));
  }

  async runScan(
    scanType: 'quick' | 'full' | 'custom',
    onProgress?: (progress: number, status: string) => void
  ): Promise<ScanResult> {
    const startTime = new Date();
    const threats: ThreatInfo[] = [];
    let filesScanned = 0;

    const scanPaths = this.getScanPaths(scanType);
    const totalPaths = scanPaths.length;

    for (let i = 0; i < scanPaths.length; i++) {
      const scanPath = scanPaths[i];
      const progress = Math.round(((i + 1) / totalPaths) * 100);
      
      if (onProgress) {
        onProgress(progress, `Scanning: ${path.basename(scanPath)}`);
      }

      const pathThreats = await this.scanPath(scanPath);
      threats.push(...pathThreats);
      filesScanned += await this.countFiles(scanPath);
    }

    const endTime = new Date();

    return {
      scanId: uuidv4(),
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      filesScanned,
      threatsFound: threats,
      status: 'completed',
    };
  }

  private getScanPaths(scanType: 'quick' | 'full' | 'custom'): string[] {
    const homeDir = os.homedir();
    const platform = process.platform;

    switch (scanType) {
      case 'quick':
        if (platform === 'win32') {
          return [
            path.join(homeDir, 'Downloads'),
            path.join(homeDir, 'Desktop'),
            path.join(homeDir, 'AppData', 'Local', 'Temp'),
          ];
        } else if (platform === 'darwin') {
          return [
            path.join(homeDir, 'Downloads'),
            path.join(homeDir, 'Desktop'),
            '/tmp',
          ];
        } else {
          return [
            path.join(homeDir, 'Downloads'),
            path.join(homeDir, 'Desktop'),
            '/tmp',
          ];
        }

      case 'full':
        if (platform === 'win32') {
          return [
            homeDir,
            'C:\\Program Files',
            'C:\\Program Files (x86)',
          ];
        } else if (platform === 'darwin') {
          return [
            homeDir,
            '/Applications',
            '/Library',
          ];
        } else {
          return [
            homeDir,
            '/usr/local',
            '/opt',
          ];
        }

      default:
        return [homeDir];
    }
  }

  private async scanPath(targetPath: string): Promise<ThreatInfo[]> {
    const threats: ThreatInfo[] = [];

    try {
      if (!fs.existsSync(targetPath)) {
        return threats;
      }

      const entries = fs.readdirSync(targetPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(targetPath, entry.name);

        if (entry.isFile()) {
          const threat = await this.analyzeFile(fullPath);
          if (threat) {
            threats.push(threat);
          }
        }
      }
    } catch (error) {
      // Skip paths we can't access
    }

    return threats;
  }

  private async analyzeFile(filePath: string): Promise<ThreatInfo | null> {
    try {
      const stat = fs.statSync(filePath);
      const fileName = path.basename(filePath).toLowerCase();

      // Check for known suspicious patterns
      const suspiciousPatterns = [
        { pattern: /\.exe\.txt$/, type: 'malware' as const, severity: 'high' as const },
        { pattern: /\.scr$/, type: 'malware' as const, severity: 'medium' as const },
        { pattern: /\.bat$/, type: 'pup' as const, severity: 'low' as const },
        { pattern: /tracking/i, type: 'tracking' as const, severity: 'low' as const },
        { pattern: /adware/i, type: 'adware' as const, severity: 'medium' as const },
      ];

      for (const { pattern, type, severity } of suspiciousPatterns) {
        if (pattern.test(fileName)) {
          return {
            id: uuidv4(),
            type,
            severity,
            name: `Suspicious file: ${fileName}`,
            description: `Detected potentially unwanted file matching pattern: ${pattern.toString()}`,
            path: filePath,
            detectedAt: new Date(),
            status: 'detected',
          };
        }
      }

      // Check for very large hidden files
      if (fileName.startsWith('.') && stat.size > 100 * 1024 * 1024) {
        return {
          id: uuidv4(),
          type: 'pup',
          severity: 'low',
          name: `Large hidden file: ${fileName}`,
          description: 'Large hidden file detected that may be consuming disk space',
          path: filePath,
          detectedAt: new Date(),
          status: 'detected',
        };
      }

    } catch (error) {
      // Skip files we can't analyze
    }

    return null;
  }

  private async countFiles(targetPath: string): Promise<number> {
    let count = 0;

    try {
      if (!fs.existsSync(targetPath)) {
        return 0;
      }

      const entries = fs.readdirSync(targetPath, { withFileTypes: true });
      count = entries.filter(e => e.isFile()).length;
    } catch (error) {
      // Skip paths we can't count
    }

    return count;
  }
}
