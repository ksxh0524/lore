import { useWorldStore } from '../../stores/worldStore';
import { WorldClock } from '../world/WorldClock';
import { RelationshipPanel } from '../agent/RelationshipPanel';
import type { CSSProperties } from 'react';

function moodEmoji(mood: number): string {
  if (mood >= 80) return '😊';
  if (mood >= 60) return '🙂';
  if (mood >= 40) return '😐';
  if (mood >= 20) return '😔';
  return '😢';
}

export function Sidebar() {
  const agents = useWorldStore((s) => s.agents);
  const selectedAgentId = useWorldStore((s) => s.selectedAgentId);
  const selectAgent = useWorldStore((s) => s.selectAgent);
  const isRunning = useWorldStore((s) => s.isRunning);
  const tick = useWorldStore((s) => s.tick);
  const worldId = useWorldStore((s) => s.worldId);
  const setRunning = useWorldStore((s) => s.setRunning);

  const npcAgents = agents.filter((a: any) => a.profile.name !== '玩家');

  const handlePause = async () => {
    if (!worldId) return;
    // TODO: Implement pause/resume via API
    setRunning(!isRunning);
  };

  const containerStyles: CSSProperties = {
    width: '280px',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  };

  return (
    <div style={containerStyles}>
      <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>🌍 Lore</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Tick {tick}</span>
      </div>
      <div style={{ padding: 'var(--space-sm)' }}>
        <WorldClock />
      </div>
      <div style={{ padding: 'var(--space-sm)', borderBottom: '1px solid var(--border-subtle)' }}>
        <button onClick={handlePause} style={{ width: '100%', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
          {isRunning ? '⏸ 暂停' : '▶ 继续'}
        </button>
      </div>
      
      {/* Agent List */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-sm)' }}>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--space-sm)' }}>
          角色 ({npcAgents.length})
        </div>
        {npcAgents.map((agent: any) => {
          const isSelected = selectedAgentId === agent.id;
          const mood = moodEmoji(agent.stats.mood);
          return (
            <div
              key={agent.id}
              onClick={() => selectAgent(agent.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-md)',
                background: isSelected ? 'var(--accent-primary)' : 'transparent',
                color: isSelected ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer',
                marginBottom: 'var(--space-xs)',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{mood}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{agent.profile.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}>{agent.profile.occupation}</div>
              </div>
            </div>
          );
        })}
      </div>
      
      <RelationshipPanel />
    </div>
  );
}
