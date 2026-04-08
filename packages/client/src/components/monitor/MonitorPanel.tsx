import { useState } from 'react';
import { useWorldStore } from '../../stores/worldStore';

interface MonitorData {
  tick: number;
  worldTime: string;
  agentCount: number;
  isRunning: boolean;
  totalLLMCalls?: number;
  totalTokens?: number;
}

export function MonitorPanel() {
  const [expanded, setExpanded] = useState(false);
  const tick = useWorldStore((s) => s.tick);
  const isRunning = useWorldStore((s) => s.isRunning);
  const agents = useWorldStore((s) => s.agents);

  const data: MonitorData = {
    tick,
    worldTime: new Date().toISOString(),
    agentCount: agents.length,
    isRunning,
  };

  if (!expanded) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          background: '#1a1a25',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '0.5rem 1rem',
          cursor: 'pointer',
          fontSize: '0.85rem',
          color: '#8888a0',
          zIndex: 1000,
        }}
        onClick={() => setExpanded(true)}
      >
        📊 Monitor | Tick: {tick} | Agents: {agents.length}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        width: '300px',
        background: '#12121a',
        border: '1px solid #333',
        borderRadius: '12px',
        padding: '1rem',
        zIndex: 1000,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>📊 Monitor</span>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8888a0',
            cursor: 'pointer',
            fontSize: '1.2rem',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ fontSize: '0.85rem', color: '#8888a0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Tick</span>
          <span style={{ color: '#f0f0f5' }}>{data.tick}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Agent Count</span>
          <span style={{ color: '#f0f0f5' }}>{data.agentCount}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>Status</span>
          <span style={{ color: data.isRunning ? '#22c55e' : '#f59e0b' }}>
            {data.isRunning ? 'Running' : 'Paused'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span>World Time</span>
          <span style={{ color: '#f0f0f5', fontSize: '0.75rem' }}>
            {new Date(data.worldTime).toLocaleString()}
          </span>
        </div>
      </div>

      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #333' }}>
        <div style={{ fontSize: '0.8rem', color: '#555570' }}>
          Agent Stats:
        </div>
        <div style={{ maxHeight: '150px', overflow: 'auto', marginTop: '0.5rem' }}>
          {agents.slice(0, 5).map((agent) => (
            <div
              key={agent.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                padding: '0.25rem 0',
                color: '#8888a0',
              }}
            >
              <span>{agent.profile.name}</span>
              <span>
                😊{agent.stats.mood} 💪{agent.stats.energy} 💰{agent.stats.money}
              </span>
            </div>
          ))}
          {agents.length > 5 && (
            <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>
              +{agents.length - 5} more...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
