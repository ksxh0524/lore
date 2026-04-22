import { useWorldStore } from '../../stores/worldStore';
import type { CSSProperties } from 'react';

export function RelationshipPanel() {
  const selectedAgentId = useWorldStore((s) => s.selectedAgentId);

  if (!selectedAgentId) return null;

  return (
    <div style={{
      padding: 'var(--space-md)',
      borderTop: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        fontSize: 'var(--text-xs)',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: 'var(--space-sm)',
      }}>
        关系
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
        关系功能开发中...
      </div>
    </div>
  );
}
