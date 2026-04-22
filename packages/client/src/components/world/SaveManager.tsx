import { useState } from 'react';
import { useWorldStore } from '../../stores/worldStore';
import type { CSSProperties } from 'react';

export function SaveManager() {
  const worldId = useWorldStore((s) => s.worldId);
  const [isOpen, setIsOpen] = useState(false);
  const [saves, setSaves] = useState<Array<{ id: string; name: string; createdAt: string }>>([]);

  if (!worldId) return null;

  const containerStyles: CSSProperties = {
    position: 'fixed',
    bottom: isOpen ? 0 : '-300px',
    left: 'var(--space-md)',
    width: '320px',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
    border: '1px solid var(--border-subtle)',
    borderBottom: 'none',
    transition: 'bottom var(--transition-normal)',
    zIndex: 100,
  };

  return (
    <div style={containerStyles}>
      <div 
        style={{
          padding: 'var(--space-md)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ fontWeight: 600 }}>💾 存档管理</span>
        <span>{isOpen ? '▼' : '▲'}</span>
      </div>
      <div style={{ padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>
        {saves.length === 0 ? (
          <div>暂无存档</div>
        ) : (
          saves.map((save) => (
            <div key={save.id} style={{ marginBottom: 'var(--space-sm)' }}>
              {save.name}
            </div>
          ))
        )}
        <button
          style={{
            width: '100%',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'var(--accent-primary)',
            color: '#fff',
            marginTop: 'var(--space-md)',
            cursor: 'pointer',
          }}
        >
          保存当前世界
        </button>
      </div>
    </div>
  );
}
