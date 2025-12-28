import { useState, useEffect } from 'react';

interface OptimizationAction {
  id: string;
  type: string;
  name: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  enabled: boolean;
  recommended: boolean;
}

interface OptimizationResult {
  action: OptimizationAction;
  success: boolean;
  message: string;
  beforeValue?: number;
  afterValue?: number;
}

export function Optimizer() {
  const [actions, setActions] = useState<OptimizationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [results, setResults] = useState<OptimizationResult[]>([]);

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    try {
      const data = await window.electronAPI.getOptimizationActions();
      setActions(data as OptimizationAction[]);
    } catch (error) {
      console.error('Failed to load actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyOptimization = async (actionId: string) => {
    setApplying(actionId);
    try {
      const result = await window.electronAPI.applyOptimization(actionId);
      setResults(prev => [...prev, result as OptimizationResult]);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setApplying(null);
    }
  };

  const applyRecommended = async () => {
    const recommended = actions.filter(a => a.recommended);
    for (const action of recommended) {
      await applyOptimization(action.id);
    }
  };

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case 'high': return 'var(--success)';
      case 'medium': return 'var(--warning)';
      case 'low': return 'var(--text-muted)';
      default: return 'var(--text-muted)';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'memory':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 19v-3M10 19v-3M14 19v-3M18 19v-3M4 15h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        );
      case 'startup':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        );
      case 'disk':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
        );
      case 'service':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        );
      case 'logs':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" />
        <p style={{ marginTop: '16px' }}>Loading optimization options...</p>
      </div>
    );
  }

  const recommendedActions = actions.filter(a => a.recommended);
  const otherActions = actions.filter(a => !a.recommended);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">System Optimizer</h1>
        <p className="page-description">Boost your system performance with these optimizations</p>
      </div>

      {results.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Results</h2>
            <button 
              className="btn btn-secondary"
              onClick={() => setResults([])}
              style={{ padding: '6px 12px' }}
            >
              Clear
            </button>
          </div>
          {results.slice(-3).reverse().map((result, index) => (
            <div 
              key={index}
              className="list-item"
              style={{ 
                marginBottom: '8px',
                borderLeft: `3px solid ${result.success ? 'var(--success)' : 'var(--danger)'}`,
                borderRadius: '0 var(--radius) var(--radius) 0'
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{result.action.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {result.message}
                </div>
              </div>
              <span className={`badge ${result.success ? 'badge-success' : 'badge-danger'}`}>
                {result.success ? 'Success' : 'Failed'}
              </span>
            </div>
          ))}
        </div>
      )}

      {recommendedActions.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recommended Optimizations</h2>
            <button 
              className="btn btn-primary"
              onClick={applyRecommended}
              disabled={applying !== null}
              data-testid="button-apply-recommended"
            >
              Apply All Recommended
            </button>
          </div>
          {recommendedActions.map((action) => (
            <div key={action.id} className="list-item" style={{ marginBottom: '8px' }}>
              <div className="list-item-content">
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <div style={{ width: '20px', height: '20px' }}>
                    {getTypeIcon(action.type)}
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 500 }}>{action.name}</span>
                    <span 
                      className="badge" 
                      style={{ 
                        background: `${getImpactColor(action.impact)}22`,
                        color: getImpactColor(action.impact)
                      }}
                    >
                      {action.impact} impact
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {action.description}
                  </div>
                </div>
              </div>
              <button 
                className="btn btn-secondary"
                onClick={() => applyOptimization(action.id)}
                disabled={applying === action.id}
                data-testid={`button-apply-${action.id}`}
              >
                {applying === action.id ? (
                  <div className="loading-spinner" style={{ width: '14px', height: '14px' }} />
                ) : (
                  'Apply'
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {otherActions.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Additional Optimizations</h2>
          </div>
          {otherActions.map((action) => (
            <div key={action.id} className="list-item" style={{ marginBottom: '8px' }}>
              <div className="list-item-content">
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ width: '20px', height: '20px' }}>
                    {getTypeIcon(action.type)}
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 500 }}>{action.name}</span>
                    <span 
                      className="badge" 
                      style={{ 
                        background: `${getImpactColor(action.impact)}22`,
                        color: getImpactColor(action.impact)
                      }}
                    >
                      {action.impact} impact
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {action.description}
                  </div>
                </div>
              </div>
              <button 
                className="btn btn-secondary"
                onClick={() => applyOptimization(action.id)}
                disabled={applying === action.id}
                data-testid={`button-apply-${action.id}`}
              >
                {applying === action.id ? (
                  <div className="loading-spinner" style={{ width: '14px', height: '14px' }} />
                ) : (
                  'Apply'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
