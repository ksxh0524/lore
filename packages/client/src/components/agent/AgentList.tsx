import { Users } from 'lucide-react';
import { useWorldStore } from '../../stores/worldStore';
import { Avatar, getMoodColor } from '../common/Avatar';
import './agent-list.css';

interface Agent {
  id: string;
  profile: {
    name: string;
    age: number;
    occupation: string;
  };
  stats: {
    mood: number;
    health: number;
    energy: number;
    money: number;
  };
  state: {
    status: string;
    currentActivity: string;
  };
}

interface AgentListProps {
  onSelectAgent?: (agentId: string) => void;
  selectedAgentId?: string | null;
}

export function AgentList({ onSelectAgent, selectedAgentId }: AgentListProps) {
  const agents = useWorldStore((s) => s.agents);
  const godMode = useWorldStore((s) => s.godMode);

  const npcAgents = agents.filter((a) => a.profile.name !== '玩家');

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      idle: '空闲',
      active: '活跃',
      sleeping: '睡眠',
      working: '工作',
      dead: '死亡',
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status: string) => {
    if (status === 'active') return 'active';
    if (status === 'sleeping') return 'sleeping';
    return 'default';
  };

  if (npcAgents.length === 0) {
    return (
      <div className="agent-list-empty">
        <Users className="agent-list-empty-icon" />
        <div className="agent-list-empty-title">暂无角色</div>
        <div className="agent-list-empty-subtitle">等待世界初始化...</div>
      </div>
    );
  }

  return (
    <div className="agent-list">
      {npcAgents.map((agent) => {
        const isSelected = selectedAgentId === agent.id;
        const moodColor = getMoodColor(agent.stats.mood);

        return (
          <div
            key={agent.id}
            onClick={() => onSelectAgent?.(agent.id)}
            className={`agent-item ${isSelected ? 'selected' : ''}`}
          >
            <Avatar name={agent.profile.name} size="md" />

            <div className="agent-item-content">
              <div className="agent-item-header">
                <span className="agent-item-name">{agent.profile.name}</span>
                {godMode && (
                  <span className="agent-item-mood" style={{ color: moodColor }}>
                    {agent.stats.mood}
                  </span>
                )}
              </div>

              <div className="agent-item-meta">
                <span>{agent.profile.occupation}</span>
                <span className="agent-item-meta-separator">·</span>
                <span>{getStatusText(agent.state.status)}</span>
              </div>

              {agent.state.currentActivity && (
                <div className="agent-item-activity">
                  {agent.state.currentActivity}
                </div>
              )}
            </div>

            <div className={`agent-item-status ${getStatusClass(agent.state.status)}`} />
          </div>
        );
      })}
    </div>
  );
}