import { useState } from 'react';
import { useWorldStore } from '../../stores/worldStore';
import type { CSSProperties } from 'react';

export function EconomyPanel() {
  const selectedAgentId = useWorldStore((s) => s.selectedAgentId);
  const [isOpen, setIsOpen] = useState(false);

  if (!selectedAgentId) return null;

  const containerStyles: CSSProperties = {
    position: 'fixed',
    bottom: isOpen ? 0 : '-300px',
    right: 'var(--space-md)',
    width: '320px',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
    border: '1px solid var(--border-subtle)',
    borderBottom: 'none',
    transition: 'bottom var(--transition-normal)',
    zIndex: 100,
  };

  const headerStyles: CSSProperties = {
    padding: 'var(--space-md)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  };

  return (
    <div style={containerStyles}>
      <div style={headerStyles} onClick={() => setIsOpen(!isOpen)}>
        <span style={{ fontWeight: 600 }}>💰 经济面板</span>
        <span>{isOpen ? '▼' : '▲'}</span>
      </div>
      <div style={{ padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>
        经济功能开发中...
      </div>
    </div>
  );
}
