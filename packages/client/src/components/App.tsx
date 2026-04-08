import { useState, useEffect, useRef } from 'react';
import { useWorldStore } from '../stores/worldStore';
import { api } from '../services/api';
import { wsClient } from '../services/websocket';
import type { FormEvent } from 'react';
import { Sidebar } from './layout/Sidebar';
import { ChatPanel } from './chat/ChatPanel';
import { MonitorPanel } from './monitor/MonitorPanel';
import { EventCardList } from './events/EventCardList';
import { PlatformFeed } from './platform/PlatformFeed';
import { Timeline } from './world/Timeline';
import { Header } from './layout/Header';

type MainTab = 'events' | 'chat' | 'platform';

const historyPresets = [
  { id: 'jiuzi', name: '九子夺嫡', era: '清·康熙末年' },
  { id: 'jianwen', name: '大明·建文元年', era: '明·建文年间' },
  { id: 'silicon2020', name: '2020 Silicon Valley', era: '2020·硅谷' },
];

export function InitPage() {
  const setWorldId = useWorldStore((s) => s.setWorldId);
  const setAgents = useWorldStore((s) => s.setAgents);
  const setRunning = useWorldStore((s) => s.setRunning);
  const setInitializing = useWorldStore((s) => s.setInitializing);
  const initializing = useWorldStore((s) => s.initializing);
  const [location, setLocation] = useState('上海');
  const [mode, setMode] = useState<'random' | 'history'>('random');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInitializing(true);
    try {
      const result = await api.initWorld({
        worldType: mode,
        randomParams: mode === 'random' ? { age: 25, location, background: '程序员' } : undefined,
        historyParams: mode === 'history' ? { presetId: selectedPreset } : undefined,
      });
      setWorldId(result.worldId);
      const agents = await api.getAgents(result.worldId);
      setAgents(agents);
      setRunning(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Init failed');
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f5', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🌍 Lore</h1>
      <p style={{ color: '#8888a0', marginBottom: '2rem', fontSize: '1.1rem' }}>AI 世界模拟器</p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <div
          onClick={() => setMode('random')}
          style={{
            padding: '1.5rem',
            borderRadius: '12px',
            width: '220px',
            cursor: 'pointer',
            background: mode === 'random' ? '#6366f120' : '#12121a',
            border: mode === 'random' ? '2px solid #6366f1' : '2px solid #1a1a25',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎲</div>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>随机模式</div>
          <div style={{ fontSize: '0.8rem', color: '#8888a0' }}>生成一个全新的世界</div>
        </div>
        <div
          onClick={() => setMode('history')}
          style={{
            padding: '1.5rem',
            borderRadius: '12px',
            width: '220px',
            cursor: 'pointer',
            background: mode === 'history' ? '#6366f120' : '#12121a',
            border: mode === 'history' ? '2px solid #6366f1' : '2px solid #1a1a25',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>历史模式</div>
          <div style={{ fontSize: '0.8rem', color: '#8888a0' }}>穿越到历史时代</div>
        </div>
      </div>

      <div style={{ background: '#12121a', padding: '2rem', borderRadius: '12px', width: '460px', maxWidth: '90vw' }}>
        <form onSubmit={handleSubmit}>
          {mode === 'random' && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: '#8888a0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>地点</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} disabled={initializing} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', background: '#1a1a25', color: '#f0f0f5', border: '1px solid #333', boxSizing: 'border-box' }} />
              </div>
            </>
          )}

          {mode === 'history' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: '#8888a0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>选择预设</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {historyPresets.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPreset(p.id)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: selectedPreset === p.id ? '#6366f120' : '#1a1a25',
                      border: selectedPreset === p.id ? '1px solid #6366f1' : '1px solid #333',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#8888a0' }}>{p.era}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={initializing || (mode === 'history' && !selectedPreset)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: initializing ? '#333' : '#6366f1', color: '#fff', border: 'none', cursor: initializing ? 'wait' : 'pointer', fontSize: '1rem' }}>
            {initializing ? '正在生成世界...' : '创建世界'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function WorldPage() {
  const worldId = useWorldStore((s) => s.worldId);
  const agents = useWorldStore((s) => s.agents);
  const selectedAgentId = useWorldStore((s) => s.selectedAgentId);
  const messages = useWorldStore((s) => s.messages);
  const addMessage = useWorldStore((s) => s.addMessage);
  const setAgents = useWorldStore((s) => s.setAgents);
  const setTick = useWorldStore((s) => s.setTick);
  const addEvent = useWorldStore((s) => s.addEvent);
  const setRunning = useWorldStore((s) => s.setRunning);
  const setGodMode = useWorldStore((s) => s.setGodMode);
  const godMode = useWorldStore((s) => s.godMode);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>('events');
  const wsInitialized = useRef(false);

  useEffect(() => {
    if (wsInitialized.current) return;
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
      setAgents(agents.map(a => a.id === data.agentId ? { ...a, state: data.state, stats: data.stats } : a));
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
  }, []);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const handleSend = async (content: string) => {
    if (!content || !selectedAgentId) return;
    addMessage('user', content);
    setSending(true);
    try {
      const res = await api.sendMessage(selectedAgentId, content);
      addMessage('agent', res.content);
    } catch (err) {
      addMessage('agent', `[错误] ${err instanceof Error ? err.message : 'Failed'}`);
    } finally {
      setSending(false);
    }
  };

  if (!worldId) return <InitPage />;

  const tabs: Array<{ id: MainTab; label: string; icon: string }> = [
    { id: 'events', label: '事件', icon: '⚡' },
    { id: 'chat', label: '聊天', icon: '💬' },
    { id: 'platform', label: '平台', icon: '📱' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0f', color: '#f0f0f5', fontFamily: 'Inter, sans-serif' }}>
      <Header
        onToggleGodMode={() => setGodMode(!godMode)}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #1a1a25', background: '#12121a' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
                  background: 'transparent',
                  color: activeTab === tab.id ? '#f0f0f5' : '#8888a0',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'events' && <EventCardList />}
            {activeTab === 'chat' && selectedAgent && (
              <ChatPanel
                agentName={selectedAgent.profile.name}
                agentOccupation={selectedAgent.profile.occupation}
                messages={messages}
                onSend={handleSend}
                sending={sending}
              />
            )}
            {activeTab === 'chat' && !selectedAgent && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555570' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
                  <div>点击左侧角色开始对话</div>
                </div>
              </div>
            )}
            {activeTab === 'platform' && <PlatformFeed />}
          </div>

          <Timeline />
        </div>
      </div>

      <MonitorPanel />
    </div>
  );
}
