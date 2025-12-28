import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { CacheItem, CacheAnalysis, CleanupResult } from '../../shared/types';

export class CacheManager {
  async analyzeCache(): Promise<CacheAnalysis> {
    const items: CacheItem[] = [];
    const categories = {
      browser: 0,
      system: 0,
      temp: 0,
      logs: 0,
      thumbnails: 0,
      downloads: 0,
    };

    const cachePaths = this.getCachePaths();

    for (const cachePath of cachePaths) {
      const pathItems = await this.analyzePath(cachePath.path, cachePath.type);
      items.push(...pathItems);
      
      for (const item of pathItems) {
        categories[item.type] += item.size;
      }
    }

    const totalSize = items.reduce((sum, item) => sum + item.size, 0);
    const cleanableSize = items.filter(item => item.cleanable).reduce((sum, item) => sum + item.size, 0);

    return {
      items,
      totalSize,
      cleanableSize,
      categories,
    };
  }

  async cleanCache(types?: string[]): Promise<CleanupResult> {
    const analysis = await this.analyzeCache();
    let freedSpace = 0;
    let itemsCleaned = 0;
    const errors: string[] = [];

    const itemsToClean = analysis.items.filter(item => {
      if (!item.cleanable) return false;
      if (types && types.length > 0) {
        return types.includes(item.type);
      }
      return true;
    });

    for (const item of itemsToClean) {
      try {
        if (fs.existsSync(item.path)) {
          const stat = fs.statSync(item.path);
          
          if (stat.isDirectory()) {
            fs.rmSync(item.path, { recursive: true, force: true });
          } else {
            fs.unlinkSync(item.path);
          }
          
          freedSpace += item.size;
          itemsCleaned++;
        }
      } catch (error) {
        errors.push(`Failed to clean ${item.path}: ${(error as Error).message}`);
      }
    }

    return {
      success: errors.length === 0,
      freedSpace,
      itemsCleaned,
      errors,
    };
  }

  private getCachePaths(): Array<{ path: string; type: CacheItem['type'] }> {
    const homeDir = os.homedir();
    const platform = process.platform;
    const paths: Array<{ path: string; type: CacheItem['type'] }> = [];

    if (platform === 'win32') {
      paths.push(
        { path: path.join(homeDir, 'AppData', 'Local', 'Temp'), type: 'temp' },
        { path: path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache'), type: 'browser' },
        { path: path.join(homeDir, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'), type: 'browser' },
        { path: path.join(homeDir, 'AppData', 'Local', 'Microsoft', 'Windows', 'Explorer'), type: 'thumbnails' },
        { path: path.join(homeDir, 'AppData', 'Local', 'CrashDumps'), type: 'logs' },
        { path: 'C:\\Windows\\Temp', type: 'system' },
      );
    } else if (platform === 'darwin') {
      paths.push(
        { path: path.join(homeDir, 'Library', 'Caches'), type: 'system' },
        { path: path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'Cache'), type: 'browser' },
        { path: path.join(homeDir, 'Library', 'Safari', 'LocalStorage'), type: 'browser' },
        { path: path.join(homeDir, 'Library', 'Logs'), type: 'logs' },
        { path: '/private/var/folders', type: 'temp' },
        { path: '/tmp', type: 'temp' },
      );
    } else {
      paths.push(
        { path: path.join(homeDir, '.cache'), type: 'system' },
        { path: path.join(homeDir, '.config', 'google-chrome', 'Default', 'Cache'), type: 'browser' },
        { path: path.join(homeDir, '.mozilla', 'firefox'), type: 'browser' },
        { path: '/tmp', type: 'temp' },
        { path: '/var/log', type: 'logs' },
        { path: path.join(homeDir, '.thumbnails'), type: 'thumbnails' },
      );
    }

    return paths;
  }

  private async analyzePath(targetPath: string, type: CacheItem['type']): Promise<CacheItem[]> {
    const items: CacheItem[] = [];

    try {
      if (!fs.existsSync(targetPath)) {
        return items;
      }

      const entries = fs.readdirSync(targetPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(targetPath, entry.name);

        try {
          const stat = fs.statSync(fullPath);
          const size = entry.isDirectory() 
            ? await this.getDirectorySize(fullPath) 
            : stat.size;

          if (size > 0) {
            items.push({
              type,
              name: entry.name,
              path: fullPath,
              size,
              lastModified: stat.mtime,
              cleanable: this.isCleanable(fullPath, type),
            });
          }
        } catch (error) {
          // Skip items we can't stat
        }
      }
    } catch (error) {
      // Skip paths we can't read
    }

    return items;
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0;

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        try {
          if (entry.isDirectory()) {
            size += await this.getDirectorySize(fullPath);
          } else {
            const stat = fs.statSync(fullPath);
            size += stat.size;
          }
        } catch (error) {
          // Skip items we can't access
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }

    return size;
  }

  private isCleanable(filePath: string, type: CacheItem['type']): boolean {
    const protectedPatterns = [
      /\.dll$/i,
      /\.exe$/i,
      /\.sys$/i,
      /important/i,
      /config/i,
      /settings/i,
    ];

    const fileName = path.basename(filePath).toLowerCase();

    for (const pattern of protectedPatterns) {
      if (pattern.test(fileName)) {
        return false;
      }
    }

    // Don't clean very recent files
    try {
      const stat = fs.statSync(filePath);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (stat.mtime > hourAgo) {
        return false;
      }
    } catch (error) {
      return false;
    }

    return true;
  }
}
