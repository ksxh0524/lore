import { useState } from 'react';
import { useWorldStore } from '../../stores/worldStore';
import { createLogger } from '../../utils/logger';
import './god-panel.css';

const logger = createLogger('god-observation');

export function GodObservationPanel() {
  const godMode = useWorldStore((s) => s.godMode);
  const agents = useWorldStore((s) => s.agents);
  const events = useWorldStore((s) => s.events);
  const [isOpen, setIsOpen] = useState(false);
  const [triggerDescription, setTriggerDescription] = useState('');
  const [triggerType, setTriggerType] = useState<string>('weather');
  const [triggerSeverity, setTriggerSeverity] = useState<string>('minor');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  if (!godMode) return null;

  const triggerWorldEvent = () => {
    if (!triggerDescription.trim()) return;
    logger.info('Triggering world event', { type: triggerType, severity: triggerSeverity, description: triggerDescription });
    setTriggerDescription('');
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const npcAgents = agents.filter(a => a.profile.name !== '玩家');

  const tabs = ['世界事件', 'Agent观察', '触发事件', '统计'];
  const [activeTab, setActiveTab] = useState(0);

  const happyCount = agents.filter(a => a.stats.mood >= 70).length;
  const neutralCount = agents.filter(a => a.stats.mood >= 40 && a.stats.mood < 70).length;
  const sadCount = agents.filter(a => a.stats.mood < 40).length;
  const totalAgents = agents.length || 1;

  const getStatClass = (value: number) => {
    if (value >= 70) return 'high';
    if (value < 40) return 'low';
    return 'normal';
  };

  return (
    <div className={`god-panel ${isOpen ? '' : 'collapsed'}`}>
      <div className="god-panel-header">
        <span className="god-panel-title">👁 上帝观察面板</span>
        <button className="god-panel-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? '✕' : '👁'}
        </button>
      </div>

      <div className="god-panel-tabs">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            className={`god-panel-tab ${activeTab === i ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="god-panel-content">
        {activeTab === 0 && (
          <div>
            <div className="god-panel-section-title">
              最近世界事件 ({events.length})
            </div>
            {events.slice(0, 10).map(e => (
              <div key={e.id} className="god-panel-event-item">
                <div className="god-panel-event-header">
                  <span className="god-panel-event-type">{e.category || e.type}</span>
                  <span className="god-panel-event-time">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="god-panel-event-desc">{e.description}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 1 && (
          <div>
            <div className="god-panel-section-title">
              Agent 列表 ({agents.length})
            </div>
            <select
              className="god-panel-agent-select"
              value={selectedAgentId || ''}
              onChange={(e) => setSelectedAgentId(e.target.value || null)}
            >
              <option value="">选择 Agent...</option>
              {npcAgents.map(a => (
                <option key={a.id} value={a.id}>{a.profile.name} - {a.profile.occupation}</option>
              ))}
            </select>

            {selectedAgent && (
              <div className="god-panel-agent-card">
                <h4 className="god-panel-agent-name">{selectedAgent.profile.name}</h4>
                <div className="god-panel-agent-info">
                  <div>职业: {selectedAgent.profile.occupation}</div>
                  <div>年龄: {selectedAgent.profile.age}</div>
                </div>

                <div className="god-panel-agent-stats">
                  {Object.entries(selectedAgent.stats).map(([key, value]) => (
                    <div key={key}>
                      <span className="god-panel-stat-label">{key}: </span>
                      <span className={`god-panel-stat-value ${getStatClass(value as number)}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="god-panel-agent-state">
                  状态: {selectedAgent.state.status}
                  <br />
                  活动: {selectedAgent.state.currentActivity || '空闲'}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 2 && (
          <div>
            <div className="god-panel-trigger-label">事件类型</div>
            <select
              className="god-panel-trigger-select"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
            >
              <option value="weather">天气</option>
              <option value="economic">经济</option>
              <option value="social">社会</option>
              <option value="political">政治</option>
              <option value="health">健康</option>
              <option value="disaster">灾难</option>
            </select>

            <div className="god-panel-trigger-label" style={{ marginTop: 'var(--space-md)' }}>严重程度</div>
            <select
              className="god-panel-trigger-select"
              value={triggerSeverity}
              onChange={(e) => setTriggerSeverity(e.target.value)}
            >
              <option value="minor">轻微</option>
              <option value="moderate">中等</option>
              <option value="major">重大</option>
              <option value="catastrophic">灾难性</option>
            </select>

            <div className="god-panel-trigger-label" style={{ marginTop: 'var(--space-md)' }}>事件描述</div>
            <textarea
              className="god-panel-trigger-input"
              value={triggerDescription}
              onChange={(e) => setTriggerDescription(e.target.value)}
              placeholder="描述你想要触发的事件..."
            />

            <button
              className={`god-panel-trigger-btn ${triggerDescription.trim() ? 'enabled' : 'disabled'}`}
              onClick={triggerWorldEvent}
              disabled={!triggerDescription.trim()}
            >
              触发世界事件
            </button>
          </div>
        )}

        {activeTab === 3 && (
          <div>
            <div className="god-panel-section-title">世界统计</div>
            <div className="god-panel-stats-grid">
              <div className="god-panel-stat-card">
                <div className="god-panel-stat-card-label">Agent 数量</div>
                <div className="god-panel-stat-card-value">{agents.length}</div>
              </div>
              <div className="god-panel-stat-card">
                <div className="god-panel-stat-card-label">事件数量</div>
                <div className="god-panel-stat-card-value">{events.length}</div>
              </div>
            </div>

            <div className="god-panel-section-title" style={{ marginTop: 'var(--space-lg)' }}>心情分布</div>
            <div className="god-panel-mood-bar">
              <div className="god-panel-mood-bar-happy" style={{ width: `${(happyCount / totalAgents) * 100}%` }} />
              <div className="god-panel-mood-bar-neutral" style={{ width: `${(neutralCount / totalAgents) * 100}%` }} />
              <div className="god-panel-mood-bar-sad" style={{ width: `${(sadCount / totalAgents) * 100}%` }} />
            </div>
            <div className="god-panel-mood-legend">
              <span>开心 {happyCount}</span>
              <span>一般 {neutralCount}</span>
              <span>低落 {sadCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}