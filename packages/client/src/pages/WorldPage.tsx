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
import type { CSSProperties } from 'react';

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

  // WebSocket connection
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
      
      // Try streaming first
      try {
        for await (const chunk of api.streamChat(selectedAgentId, content)) {
          fullResponse += chunk;
          addMessage('agent_stream', chunk);
        }
      } catch {
        // Fallback to non-streaming
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

  // Desktop layout
  const desktopStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'var(--bg-primary)',
  };

  const desktopContentStyles: CSSProperties = {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '280px 1fr 320px',
    overflow: 'hidden',
    gap: '1px',
    background: 'var(--bg-secondary)',
  };

  const panelStyles: CSSProperties = {
    background: 'var(--bg-primary)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  // Mobile layout
  const mobileStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'var(--bg-primary)',
    paddingBottom: '60px', // Space for bottom nav
  };

  const mobileContentStyles: CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  };

  // Render content based on active tab (mobile)
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

  // Desktop layout
  if (!isMobile) {
    return (
      <div style={desktopStyles}>
        <Header onToggleGodMode={() => setGodMode(!godMode)} />
        
        <div style={desktopContentStyles}>
          {/* Left Panel - Agent List */}
          <div style={panelStyles}>
            <div style={{ 
              padding: 'var(--space-md)', 
              borderBottom: '1px solid var(--border-subtle)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              角色 ({agents.filter(a => a.profile.name !== '玩家').length})
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <AgentList 
                onSelectAgent={handleSelectAgent}
                selectedAgentId={selectedAgentId}
              />
            </div>
          </div>

          {/* Center Panel - Main Content */}
          <div style={panelStyles}>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Events Section */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ 
                  padding: 'var(--space-md)', 
                  borderBottom: '1px solid var(--border-subtle)',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  事件
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <EventList />
                </div>
              </div>
              
              {/* Timeline Section */}
              <Timeline />
            </div>
          </div>

          {/* Right Panel - Chat */}
          <div style={panelStyles}>
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

  // Mobile layout
  return (
    <div style={mobileStyles}>
      <Header onToggleGodMode={() => setGodMode(!godMode)} />
      
      <div style={mobileContentStyles}>
        {renderMobileContent()}
      </div>

      <BottomNav 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab as TabType)} 
      />
    </div>
  );
}
