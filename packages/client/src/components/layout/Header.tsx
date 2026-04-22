import { useWorldStore } from '../../stores/worldStore';
import type { CSSProperties } from 'react';

interface HeaderProps {
  onToggleGodMode?: () => void;
}

export function Header({ onToggleGodMode }: HeaderProps) {
  const worldId = useWorldStore((s) => s.worldId);
  const tick = useWorldStore((s) => s.tick);
  const isRunning = useWorldStore((s) => s.isRunning);
  const godMode = useWorldStore((s) => s.godMode);

  const headerStyles: CSSProperties = {
    height: '56px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 var(--space-md)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  };

  return (
    <header style={headerStyles}>
      {/* Left: Logo & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <span style={{ fontSize: '1.25rem' }}>🌍</span>
        <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>
          Lore
        </span>
        {worldId && (
          <span style={{ 
            fontSize: 'var(--text-xs)', 
            color: 'var(--text-muted)',
            background: 'var(--bg-tertiary)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
          }}>
            Tick {tick}
          </span>
        )}
      </div>

      {/* Center: Status */}
      {worldId && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--space-xs)',
          fontSize: 'var(--text-sm)',
          color: isRunning ? 'var(--accent-success)' : 'var(--text-muted)',
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isRunning ? 'var(--accent-success)' : 'var(--text-muted)',
            animation: isRunning ? 'pulse 2s ease-in-out infinite' : 'none',
          }} />
          {isRunning ? '运行中' : '已暂停'}
        </div>
      )}

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        {worldId && onToggleGodMode && (
          <button
            onClick={onToggleGodMode}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: godMode ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: godMode ? '#fff' : 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            {godMode ? '👁 上帝模式' : '👁 观察'}
          </button>
        )}
      </div>
    </header>
  );
}
