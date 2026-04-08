import { useWorldStore } from '../../stores/worldStore';
import { api } from '../../services/api';
import { WorldClock } from '../world/WorldClock';

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
    if (isRunning) {
      await api.pause(worldId);
      setRunning(false);
    } else {
      await api.resume(worldId);
      setRunning(true);
    }
  };

  return (
    <div style={{ width: '280px', background: '#12121a', borderRight: '1px solid #1a1a25', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #1a1a25', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>🌍 Lore</span>
        <span style={{ color: '#8888a0', fontSize: '0.85rem' }}>Tick {tick}</span>
      </div>
      <div style={{ padding: '0.5rem' }}>
        <WorldClock />
      </div>
      <div style={{ padding: '0.5rem', borderBottom: '1px solid #1a1a25' }}>
        <button onClick={handlePause} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: '#1a1a25', color: '#f0f0f5', border: '1px solid #333', cursor: 'pointer' }}>
          {isRunning ? '⏸ 暂停' : '▶ 继续'}
        </button>
      </div>
      <div style={{ padding: '0.5rem', fontSize: '0.85rem', color: '#8888a0' }}>角色列表</div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {npcAgents.map((agent: any) => (
          <div key={agent.id} onClick={() => selectAgent(agent.id)} style={{
            padding: '0.75rem 1rem', cursor: 'pointer',
            background: selectedAgentId === agent.id ? '#1a1a25' : 'transparent',
            borderLeft: selectedAgentId === agent.id ? '3px solid #6366f1' : '3px solid transparent',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{moodEmoji(agent.stats.mood)}</span>
              <div>
                <div style={{ fontSize: '0.9rem' }}>{agent.profile.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#8888a0' }}>{agent.profile.occupation} · {agent.state.currentActivity || '空闲'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
