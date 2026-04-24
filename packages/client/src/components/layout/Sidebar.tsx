import { Globe, Play, Pause } from 'lucide-react';
import { useWorldStore } from '../../stores/worldStore';
import { WorldClock } from '../world/WorldClock';
import { RelationshipPanel } from '../agent/RelationshipPanel';
import { Avatar } from '../common/Avatar';
import './sidebar.css';

export function Sidebar() {
  const agents = useWorldStore((s) => s.agents);
  const selectedAgentId = useWorldStore((s) => s.selectedAgentId);
  const selectAgent = useWorldStore((s) => s.selectAgent);
  const isRunning = useWorldStore((s) => s.isRunning);
  const tick = useWorldStore((s) => s.tick);
  const worldId = useWorldStore((s) => s.worldId);
  const setRunning = useWorldStore((s) => s.setRunning);

  const npcAgents = agents.filter((a) => a.profile.name !== '玩家');

  const handlePause = async () => {
    if (!worldId) return;
    setRunning(!isRunning);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">
          <Globe className="sidebar-title-icon" />
          Lore
        </span>
        <span className="sidebar-tick">Tick {tick}</span>
      </div>
      <div className="sidebar-clock">
        <WorldClock />
      </div>
      <div className="sidebar-controls">
        <button onClick={handlePause} className="sidebar-pause-btn">
          {isRunning ? <Pause /> : <Play />}
          {isRunning ? '暂停' : '继续'}
        </button>
      </div>

      <div className="sidebar-agent-list">
        <div className="sidebar-agent-header">
          角色 ({npcAgents.length})
        </div>
        {npcAgents.map((agent) => {
          const isSelected = selectedAgentId === agent.id;
          return (
            <div
              key={agent.id}
              onClick={() => selectAgent(agent.id)}
              className={`sidebar-agent-item ${isSelected ? 'selected' : ''}`}
            >
              <Avatar
                name={agent.profile.name}
                size="sm"
              />
              <div className="sidebar-agent-info">
                <div className="sidebar-agent-name">{agent.profile.name}</div>
                <div className="sidebar-agent-occupation">{agent.profile.occupation}</div>
              </div>
            </div>
          );
        })}
      </div>

      <RelationshipPanel />
    </div>
  );
}