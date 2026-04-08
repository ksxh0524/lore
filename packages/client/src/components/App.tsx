import { useWorldStore } from '../stores/worldStore';
import { api } from '../services/api';
import type { FormEvent } from 'react';

function moodEmoji(mood: number): string {
  if (mood >= 80) return '😊';
  if (mood >= 60) return '🙂';
  if (mood >= 40) return '😐';
  if (mood >= 20) return '😔';
  return '😢';
}

export function InitPage() {
  const setWorldId = useWorldStore((s) => s.setWorldId);
  const setAgents = useWorldStore((s) => s.setAgents);
  const setRunning = useWorldStore((s) => s.setRunning);
  const setInitializing = useWorldStore((s) => s.setInitializing);
  const initializing = useWorldStore((s) => s.initializing);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInitializing(true);
    try {
      const result = await api.initWorld({
        worldType: 'random',
        randomParams: { age: 25, location: '上海', background: '程序员' },
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
            <input type="text" defaultValue="上海" disabled={initializing} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', background: '#1a1a25', color: '#f0f0f5', border: '1px solid #333', boxSizing: 'border-box' }} />
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
  const events = useWorldStore((s) => s.events);
  const selectedAgentId = useWorldStore((s) => s.selectedAgentId);
  const messages = useWorldStore((s) => s.messages);
  const tick = useWorldStore((s) => s.tick);
  const isRunning = useWorldStore((s) => s.isRunning);
  const selectAgent = useWorldStore((s) => s.selectAgent);
  const addMessage = useWorldStore((s) => s.addMessage);
  const setAgents = useWorldStore((s) => s.setAgents);
  const setRunning = useWorldStore((s) => s.setRunning);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const npcAgents = agents.filter((a) => a.profile.name !== '玩家');

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem('msg') as HTMLInputElement;
    const content = input.value.trim();
    if (!content || !selectedAgentId) return;
    input.value = '';
    addMessage('user', content);
    try {
      const res = await api.sendMessage(selectedAgentId, content);
      addMessage('agent', res.content);
    } catch (err) {
      addMessage('agent', `[错误] ${err instanceof Error ? err.message : 'Failed'}`);
    }
  };

  const handlePause = async () => {
    if (!worldId) return;
    if (isRunning) {
      await api.pause(worldId);
      setRunning(false);
    } else {
      await api.resume(worldId);
      setRunning(true);
    }
  };

  if (!worldId) return <InitPage />;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0f', color: '#f0f0f5', fontFamily: 'Inter, sans-serif' }}>
      {/* Left Sidebar */}
      <div style={{ width: '280px', background: '#12121a', borderRight: '1px solid #1a1a25', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #1a1a25', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>🌍 Lore</span>
          <span style={{ color: '#8888a0', fontSize: '0.85rem' }}>Tick {tick}</span>
        </div>
        <div style={{ padding: '0.5rem', borderBottom: '1px solid #1a1a25' }}>
          <button onClick={handlePause} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: '#1a1a25', color: '#f0f0f5', border: '1px solid #333', cursor: 'pointer' }}>
            {isRunning ? '⏸ 暂停' : '▶ 继续'}
          </button>
        </div>
        <div style={{ padding: '0.5rem', fontSize: '0.85rem', color: '#8888a0' }}>角色列表</div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {npcAgents.map((agent) => (
            <div key={agent.id} onClick={() => selectAgent(agent.id)} style={{
              padding: '0.75rem 1rem', cursor: 'pointer',
              background: selectedAgentId === agent.id ? '#1a1a25' : 'transparent',
              borderLeft: selectedAgentId === agent.id ? '3px solid #6366f1' : '3px solid transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{moodEmoji(agent.stats.mood)}</span>
                <div>
                  <div style={{ fontSize: '0.9rem' }}>{agent.profile.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#8888a0' }}>{agent.profile.occupation} · {agent.state.currentActivity || '空闲'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedAgent ? (
          <>
            {/* Chat Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #1a1a25', background: '#12121a' }}>
              <span style={{ fontWeight: 'bold' }}>{selectedAgent.profile.name}</span>
              <span style={{ color: '#8888a0', marginLeft: '0.5rem' }}>{selectedAgent.profile.occupation}</span>
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {messages.length === 0 && (
                <div style={{ color: '#555570', textAlign: 'center', marginTop: '2rem' }}>
                  向 {selectedAgent.profile.name} 发一条消息开始对话
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                  <div style={{
                    padding: '0.75rem 1rem', borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    background: msg.role === 'user' ? '#6366f1' : '#1a1a25', color: '#f0f0f5',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid #1a1a25', display: 'flex', gap: '0.5rem', background: '#12121a' }}>
              <input name="msg" placeholder="输入消息..." style={{
                flex: 1, padding: '0.75rem', borderRadius: '8px',
                background: '#1a1a25', color: '#f0f0f5', border: '1px solid #333', outline: 'none',
              }} />
              <button type="submit" style={{
                padding: '0.75rem 1.5rem', borderRadius: '8px',
                background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer',
              }}>发送</button>
            </form>
          </>
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
    </div>
  );
}
