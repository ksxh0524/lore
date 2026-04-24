import { useState, useEffect, useRef } from 'react';
import { useWorldStore } from '../stores/worldStore';
import { useMobile } from '../hooks/useMobile';
import { api } from '../services/api';
import { wsClient } from '../services/websocket';
import { Header } from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { AgentList } from '../components/agent/AgentList';
import { EventList } from '../components/events/EventList';
import { ChatPanel } from '../components/chat/ChatPanel';
import { Timeline } from '../components/world/Timeline';
import './world-page.css';

type TabType = 'agents' | 'events' | 'chat' | 'timeline';

export function WorldPage() {
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState<TabType>('events');
  const [sending, setSending] = useState(false);
  const wsInitialized = useRef(false);

  const worldId = useWorldStore((s) => s.worldId);
  const agents = useWorldStore((s) => s.agents);
  const selectedAgentId = useWorldStore((s) => s.selectedAgentId);
  const messages = useWorldStore((s) => s.messages);
  const setSelectedAgentId = useWorldStore((s) => s.selectAgent);
  const addMessage = useWorldStore((s) => s.addMessage);
  const setAgents = useWorldStore((s) => s.setAgents);
  const setTick = useWorldStore((s) => s.setTick);
  const addEvent = useWorldStore((s) => s.addEvent);
  const setRunning = useWorldStore((s) => s.setRunning);
  const setGodMode = useWorldStore((s) => s.setGodMode);
  const godMode = useWorldStore((s) => s.godMode);

  useEffect(() => {
    if (wsInitialized.current || !worldId) return;
    wsInitialized.current = true;

    wsClient.connect();

    wsClient.on('world_state', (data) => {
      if (data.tick) setTick(data.tick);
      if (data.status === 'paused') setRunning(false);
      if (data.status === 'running') setRunning(true);
    });

    wsClient.on('event', (data) => {
      if (data.event) addEvent(data.event);
    });

    wsClient.on('agent_update', (data) => {
      setAgents(agents.map(a => 
        a.id === data.agentId 
          ? { ...a, state: data.state, stats: data.stats } 
          : a
      ));
    });

    wsClient.on('init_complete', async (data) => {
      if (data.worldId) {
        const updatedAgents = await api.getAgents(data.worldId);
        setAgents(updatedAgents);
      }
    });

    wsClient.subscribe(['world_state', 'event', 'agent_update', 'init_complete']);

    return () => {
      wsClient.disconnect();
      wsInitialized.current = false;
    };
  }, [worldId]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const handleSendMessage = async (content: string) => {
    if (!content || !selectedAgentId) return;
    
    addMessage('user', content);
    setSending(true);

    try {
      let fullResponse = '';
      
      try {
        for await (const chunk of api.streamChat(selectedAgentId, content)) {
          fullResponse += chunk;
          addMessage('agent_stream', chunk);
        }
      } catch {
        const res = await api.sendMessage(selectedAgentId, content);
        fullResponse = res.content;
        addMessage('agent', fullResponse);
      }
    } catch (err) {
      addMessage('agent', `[错误] ${err instanceof Error ? err.message : '发送失败'}`);
    } finally {
      setSending(false);
    }
  };

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    if (isMobile) {
      setActiveTab('chat');
    }
  };

  const renderMobileContent = () => {
    switch (activeTab) {
      case 'agents':
        return (
          <AgentList 
            onSelectAgent={handleSelectAgent}
            selectedAgentId={selectedAgentId}
          />
        );
      case 'events':
        return <EventList />;
      case 'chat':
        return (
          <ChatPanel
            agentName={selectedAgent?.profile?.name}
            agentOccupation={selectedAgent?.profile?.occupation}
            messages={messages.map(m => ({ ...m, id: m.id || Math.random().toString() }))}
            onSend={handleSendMessage}
            sending={sending}
          />
        );
      case 'timeline':
        return <Timeline />;
      default:
        return <EventList />;
    }
  };

  if (!isMobile) {
    return (
      <div className="world-page">
        <Header onToggleGodMode={() => setGodMode(!godMode)} />
        
        <div className="world-page-content">
          <div className="world-page-panel">
            <div className="world-page-panel-header">
              角色 ({agents.filter(a => a.profile.name !== '玩家').length})
            </div>
            <div className="world-page-panel-content">
              <AgentList 
                onSelectAgent={handleSelectAgent}
                selectedAgentId={selectedAgentId}
              />
            </div>
          </div>

          <div className="world-page-panel">
            <div className="world-page-section">
              <div className="world-page-section-header">事件</div>
              <div className="world-page-section-content">
                <EventList />
              </div>
            </div>
            
            <Timeline />
          </div>

          <div className="world-page-panel">
            <ChatPanel
              agentName={selectedAgent?.profile?.name}
              agentOccupation={selectedAgent?.profile?.occupation}
              messages={messages.map(m => ({ ...m, id: m.id || Math.random().toString() }))}
              onSend={handleSendMessage}
              sending={sending}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="world-page mobile">
      <Header onToggleGodMode={() => setGodMode(!godMode)} />
      
      <div className="world-page-content mobile">
        {renderMobileContent()}
      </div>

      <BottomNav 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab as TabType)} 
      />
    </div>
  );
}