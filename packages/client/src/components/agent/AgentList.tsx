import { useWorldStore } from '../../stores/worldStore';
import { Avatar, getMoodEmoji, getMoodColor } from '../common/Avatar';
import type { CSSProperties } from 'react';

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
  
  // Filter out player avatar, show only NPCs
  const npcAgents = agents.filter((a) => a.profile.name !== '玩家');

  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
    padding: 'var(--space-md)',
    height: '100%',
    overflow: 'auto',
  };

  const agentItemStyles = (isSelected: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-md)',
    background: isSelected ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
    color: isSelected ? '#fff' : 'var(--text-primary)',
    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'transparent'}`,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    position: 'relative',
  });

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

  return (
    <div style={containerStyles}>
      {npcAgents.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-xl)',
          color: 'var(--text-muted)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>👥</div>
          <div>暂无角色</div>
          <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-sm)' }}>
            等待世界初始化...
          </div>
        </div>
      ) : (
        npcAgents.map((agent) => {
          const isSelected = selectedAgentId === agent.id;
          const moodEmoji = getMoodEmoji(agent.stats.mood);
          const moodColor = getMoodColor(agent.stats.mood);

          return (
            <div
              key={agent.id}
              onClick={() => onSelectAgent?.(agent.id)}
              style={agentItemStyles(isSelected)}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }
              }}
            >
              <Avatar 
                name={agent.profile.name} 
                emoji={moodEmoji}
                size="md"
              />
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--space-xs)',
                  marginBottom: '2px',
                }}>
                  <span style={{ 
                    fontWeight: 600,
                    fontSize: 'var(--text-base)',
                  }}>
                    {agent.profile.name}
                  </span>
                  {godMode && (
                    <span style={{
                      fontSize: 'var(--text-xs)',
                      opacity: 0.8,
                      color: moodColor,
                    }}>
                      {agent.stats.mood}
                    </span>
                  )}
                </div>
                
                <div style={{
                  fontSize: 'var(--text-sm)',
                  opacity: 0.7,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                }}>
                  <span>{agent.profile.occupation}</span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>{getStatusText(agent.state.status)}</span>
                </div>

                {agent.state.currentActivity && (
                  <div style={{
                    fontSize: 'var(--text-xs)',
                    opacity: 0.6,
                    marginTop: '2px',
                  }}>
                    {agent.state.currentActivity}
                  </div>
                )}
              </div>

              {/* Status indicator */}
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: agent.state.status === 'active' 
                  ? 'var(--accent-success)' 
                  : agent.state.status === 'sleeping'
                  ? 'var(--accent-warning)'
                  : 'var(--text-muted)',
                flexShrink: 0,
              }} />
            </div>
          );
        })
      )}
    </div>
  );
}
