import { useState, useEffect } from 'react';

interface CacheItem {
  type: string;
  name: string;
  path: string;
  size: number;
  cleanable: boolean;
}

interface CacheAnalysis {
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

interface CleanupResult {
  success: boolean;
  freedSpace: number;
  itemsCleaned: number;
  errors: string[];
}

export function CacheCleaner() {
  const [analysis, setAnalysis] = useState<CacheAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['browser', 'temp', 'thumbnails']);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const analyzeCache = async () => {
    setIsAnalyzing(true);
    setResult(null);
    try {
      const data = await window.electronAPI.analyzeCache();
      setAnalysis(data as CacheAnalysis);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const cleanCache = async () => {
    setIsCleaning(true);
    try {
      const data = await window.electronAPI.cleanCache(selectedTypes);
      setResult(data as CleanupResult);
      await analyzeCache();
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      setIsCleaning(false);
    }
  };

  useEffect(() => {
    analyzeCache();
  }, []);

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'browser':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <path d="M21.17 8H12M3.95 6.06L8.54 14M10.88 21.94L15.46 14" />
          </svg>
        );
      case 'system':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        );
      case 'temp':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M10 12l4 4M14 12l-4 4" />
          </svg>
        );
      case 'logs':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
        );
      case 'thumbnails':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        );
      case 'downloads':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        );
      default:
        return null;
    }
  };

  const categories = [
    { type: 'browser', label: 'Browser Cache' },
    { type: 'system', label: 'System Cache' },
    { type: 'temp', label: 'Temporary Files' },
    { type: 'logs', label: 'Log Files' },
    { type: 'thumbnails', label: 'Thumbnails' },
    { type: 'downloads', label: 'Old Downloads' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Cache Cleaner</h1>
        <p className="page-description">Free up disk space by removing unnecessary files</p>
      </div>

      {result && (
        <div className="card" style={{ background: result.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderColor: result.success ? 'var(--success)' : 'var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {result.success ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            )}
            <div>
              <div style={{ fontWeight: 600, color: result.success ? 'var(--success)' : 'var(--danger)' }}>
                {result.success ? 'Cleanup Complete!' : 'Cleanup had some errors'}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Freed {formatBytes(result.freedSpace)} from {result.itemsCleaned} items
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Storage Analysis</h2>
          <button 
            className="btn btn-secondary" 
            onClick={analyzeCache}
            disabled={isAnalyzing}
            data-testid="button-analyze"
          >
            {isAnalyzing ? <div className="loading-spinner" style={{ width: '16px', height: '16px' }} /> : 'Refresh'}
          </button>
        </div>

        {isAnalyzing ? (
          <div className="empty-state">
            <div className="loading-spinner" />
            <p style={{ marginTop: '16px' }}>Analyzing your system...</p>
          </div>
        ) : analysis ? (
          <>
            <div className="stat-grid" style={{ marginBottom: '24px' }}>
              <div className="stat-card">
                <div className="stat-label">Total Found</div>
                <div className="stat-value">{formatBytes(analysis.totalSize)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Cleanable</div>
                <div className="stat-value success">{formatBytes(analysis.cleanableSize)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {categories.map(({ type, label }) => {
                const size = analysis.categories[type as keyof typeof analysis.categories] || 0;
                const isSelected = selectedTypes.includes(type);
                
                return (
                  <button
                    key={type}
                    className={`list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleType(type)}
                    style={{ 
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                    data-testid={`toggle-${type}`}
                  >
                    <div className="list-item-content">
                      <div style={{ width: '24px', height: '24px', color: 'var(--text-secondary)' }}>
                        {getCategoryIcon(type)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{label}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {formatBytes(size)}
                        </div>
                      </div>
                    </div>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '4px',
                      border: isSelected ? 'none' : '1px solid var(--border)',
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--bg-primary)" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button 
          className="btn btn-secondary"
          onClick={() => setSelectedTypes([])}
          disabled={selectedTypes.length === 0}
          data-testid="button-clear-selection"
        >
          Clear Selection
        </button>
        <button 
          className="btn btn-primary"
          onClick={cleanCache}
          disabled={isCleaning || selectedTypes.length === 0}
          data-testid="button-clean"
        >
          {isCleaning ? (
            <>
              <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />
              Cleaning...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Clean Selected ({selectedTypes.length})
            </>
          )}
        </button>
      </div>
    </div>
  );
}
