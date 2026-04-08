import { useState, useEffect, useRef } from 'react';
import { useWorldStore } from '../stores/worldStore';
import { api } from '../services/api';
import { wsClient } from '../services/websocket';
import type { FormEvent } from 'react';
import { Sidebar } from './layout/Sidebar';
import { ChatPanel } from './chat/ChatPanel';
import { MonitorPanel } from './monitor/MonitorPanel';

export function InitPage() {
  const setWorldId = useWorldStore((s) => s.setWorldId);
  const setAgents = useWorldStore((s) => s.setAgents);
  const setRunning = useWorldStore((s) => s.setRunning);
  const setInitializing = useWorldStore((s) => s.setInitializing);
  const initializing = useWorldStore((s) => s.initializing);
  const [location, setLocation] = useState('上海');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInitializing(true);
    try {
      const result = await api.initWorld({
        worldType: 'random',
        randomParams: { age: 25, location, background: '程序员' },
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
      <div style={{ background: '#12121a', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90vw' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>创建你的世界</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#8888a0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>模式</label>
            <select disabled={initializing} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', background: '#1a1a25', color: '#f0f0f5', border: '1px solid #333' }}>
              <option value="random">随机模式</option>
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#8888a0', marginBottom: '0.5rem', fontSize: '0.9rem' }}>地点</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} disabled={initializing} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', background: '#1a1a25', color: '#f0f0f5', border: '1px solid #333', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={initializing} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: initializing ? '#333' : '#6366f1', color: '#fff', border: 'none', cursor: initializing ? 'wait' : 'pointer', fontSize: '1rem' }}>
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
  const [sending, setSending] = useState(false);
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

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0f', color: '#f0f0f5', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedAgent ? (
          <ChatPanel
            agentName={selectedAgent.profile.name}
            agentOccupation={selectedAgent.profile.occupation}
            messages={messages}
            onSend={handleSend}
            sending={sending}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555570' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌍</div>
              <div>世界正在运行中...</div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>点击左侧角色开始对话</div>
            </div>
          </div>
        )}
      </div>

      <MonitorPanel />
    </div>
  );
}
