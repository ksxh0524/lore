import { useState, useEffect } from 'react';
import { useWorldStore } from '../../stores/worldStore';
import { api } from '../../services/api';

export function RelationshipPanel() {
  const selectedAgentId = useWorldStore((s) => s.selectedAgentId);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedAgentId) return;
    setLoading(true);
    api.getRelationships(selectedAgentId)
      .then(setRelationships)
      .catch(() => setRelationships([]))
      .finally(() => setLoading(false));
  }, [selectedAgentId]);

  if (!selectedAgentId) return null;
  if (loading) return <div style={{ color: '#8888a0', fontSize: '0.8rem' }}>加载关系...</div>;
  if (relationships.length === 0) return null;

  const typeColors: Record<string, string> = {
    stranger: '#555570',
    acquaintance: '#8888a0',
    friend: '#6366f1',
    close_friend: '#8b5cf6',
    partner: '#ec4899',
    enemy: '#ef4444',
    rival: '#f97316',
    family: '#22c55e',
    colleague: '#06b6d4',
    ex: '#94a3b8',
    boss: '#eab308',
    subordinate: '#84cc16',
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      <div style={{ fontSize: '0.8rem', color: '#8888a0', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>🔗 关系</div>
      {relationships.map((rel, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.35rem 0.75rem', fontSize: '0.8rem',
        }}>
          <span style={{ color: '#f0f0f5' }}>{rel.targetAgentId?.slice(0, 8) ?? 'Unknown'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: typeColors[rel.type] ?? '#8888a0', fontSize: '0.75rem' }}>
              {rel.type}
            </span>
            <div style={{ width: '40px', height: '4px', background: '#1a1a25', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.max(0, Math.min(100, rel.intimacy ?? 0))}%`,
                height: '100%',
                background: typeColors[rel.type] ?? '#6366f1',
                borderRadius: '2px',
              }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
