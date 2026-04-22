import { useState } from 'react';
import { useWorldStore } from '../../stores/worldStore';
import type { CSSProperties } from 'react';

export function GodObservationPanel() {
  const godMode = useWorldStore((s) => s.godMode);
  const [isOpen, setIsOpen] = useState(false);
  const [triggerDescription, setTriggerDescription] = useState('');

  if (!godMode) return null;

  const containerStyles: CSSProperties = {
    position: 'fixed',
    top: '72px',
    right: isOpen ? 'var(--space-md)' : '-400px',
    width: '380px',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-subtle)',
    transition: 'right var(--transition-normal)',
    zIndex: 100,
  };

  return (
    <div style={containerStyles}>
      <div style={{
        padding: 'var(--space-md)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 600 }}>👁 上帝观察面板</span>
        <button onClick={() => setIsOpen(!isOpen)} style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
        }}>
          {isOpen ? '✕' : '👁'}
        </button>
      </div>
      <div style={{ padding: 'var(--space-lg)', color: 'var(--text-muted)' }}>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            触发世界事件
          </label>
          <textarea
            value={triggerDescription}
            onChange={(e) => setTriggerDescription(e.target.value)}
            placeholder="描述你想要触发的事件..."
            style={{
              width: '100%',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              marginTop: 'var(--space-sm)',
              minHeight: '80px',
              resize: 'vertical',
            }}
          />
          <button
            onClick={() => setTriggerDescription('')}
            disabled={!triggerDescription.trim()}
            style={{
              width: '100%',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--accent-primary)',
              color: '#fff',
              marginTop: 'var(--space-md)',
              cursor: triggerDescription.trim() ? 'pointer' : 'not-allowed',
              opacity: triggerDescription.trim() ? 1 : 0.5,
            }}
          >
            触发事件
          </button>
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          上帝模式功能开发中...
        </div>
      </div>
    </div>
  );
}
