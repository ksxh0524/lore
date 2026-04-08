import { useState } from 'react';
import { useWorldStore } from '../../stores/worldStore';
import { api } from '../../services/api';

export function GodObservationPanel() {
  const agents = useWorldStore((s) => s.agents);
  const godMode = useWorldStore((s) => s.godMode);
  const worldId = useWorldStore((s) => s.worldId);
  const [observingAgentId, setObservingAgentId] = useState<string | null>(null);
  const [observationData, setObservationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [triggerDescription, setTriggerDescription] = useState('');

  const handleObserve = async (agentId: string) => {
    setObservingAgentId(agentId);
    setLoading(true);
    try {
      const data = await api.getGodAgent(agentId);
      setObservationData(data);
    } catch (err) {
      console.error('Failed to observe agent:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerEvent = async () => {
    if (!worldId || !triggerDescription.trim()) return;
    try {
      await api.godTriggerEvent('other', triggerDescription.trim(), 5);
      setTriggerDescription('');
    } catch (err) {
      console.error('Failed to trigger event:', err);
    }
  };

  if (!godMode) return null;

  return (
    <div style={{ padding: '1rem', overflow: 'auto', height: '100%' }}>
      <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#f0f0f5' }}>👁 上帝模式</h3>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.85rem', color: '#8888a0', marginBottom: '0.5rem' }}>触发世界事件</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={triggerDescription}
            onChange={(e) => setTriggerDescription(e.target.value)}
            placeholder="描述一个事件..."
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '6px',
              background: '#1a1a25',
              color: '#f0f0f5',
              border: '1px solid #333',
            }}
          />
          <button
            onClick={handleTriggerEvent}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              background: '#6366f1',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            触发
          </button>
        </div>
      </div>

      <div style={{ fontSize: '0.85rem', color: '#8888a0', marginBottom: '0.5rem' }}>观察 Agent</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => handleObserve(agent.id)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: observingAgentId === agent.id ? '1px solid #6366f1' : '1px solid #333',
              background: observingAgentId === agent.id ? '#6366f120' : '#1a1a25',
              color: '#f0f0f5',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.85rem',
            }}
          >
            {agent.profile.name} — {agent.profile.occupation}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: '#8888a0', fontSize: '0.85rem' }}>加载中...</div>}

      {observationData && !loading && (
        <div style={{ background: '#1a1a25', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
            {observationData.fullState?.name || 'Agent 详情'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#8888a0', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(observationData, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}
