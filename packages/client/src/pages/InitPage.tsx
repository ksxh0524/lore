import { useState, type FormEvent, type CSSProperties } from 'react';
import { useWorldStore } from '../stores/worldStore';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

const historyPresets = [
  { id: 'jiuzi', name: '九子夺嫡', description: '清·康熙末年', icon: '🏯' },
  { id: 'jianwen', name: '建文元年', description: '明·靖难之役', icon: '⚔️' },
  { id: 'silicon2020', name: '2020硅谷', description: '科技创业潮', icon: '💻' },
];

export function InitPage() {
  const setWorldId = useWorldStore((s) => s.setWorldId);
  const setAgents = useWorldStore((s) => s.setAgents);
  const setRunning = useWorldStore((s) => s.setRunning);
  const setInitializing = useWorldStore((s) => s.setInitializing);
  const initializing = useWorldStore((s) => s.initializing);

  const [mode, setMode] = useState<'random' | 'history'>('random');
  const [location, setLocation] = useState('上海');
  const [age, setAge] = useState(25);
  const [background, setBackground] = useState('上班族');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [targetCharacter, setTargetCharacter] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInitializing(true);
    
    try {
      const result = await api.initWorld({
        worldType: mode,
        randomParams: mode === 'random' 
          ? { age, location, background } 
          : undefined,
        historyParams: mode === 'history' && selectedPreset
          ? { presetName: selectedPreset, targetCharacter: targetCharacter || undefined } 
          : undefined,
      });
      
      setWorldId(result.worldId);
      const agents = await api.getAgents(result.worldId);
      setAgents(agents);
      setRunning(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建世界失败');
    } finally {
      setInitializing(false);
    }
  };

  const containerStyles: CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-lg)',
    background: 'var(--bg-primary)',
  };

  const modeCardStyles = (isActive: boolean): CSSProperties => ({
    flex: 1,
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    background: isActive ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
    border: `2px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
    transform: isActive ? 'scale(1.02)' : 'scale(1)',
  });

  return (
    <div style={containerStyles}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
        <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>🌍</div>
        <h1 style={{ 
          fontSize: 'var(--text-3xl)', 
          fontWeight: 700,
          marginBottom: 'var(--space-sm)',
          color: 'var(--text-primary)',
        }}>
          Lore
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)' }}>
          AI 世界模拟器 — 与虚拟角色一起生活在另一个世界
        </p>
      </div>

      {/* Mode Selection */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--space-md)', 
        marginBottom: 'var(--space-xl)',
        width: '100%',
        maxWidth: '480px',
      }}>
        <div
          onClick={() => setMode('random')}
          style={modeCardStyles(mode === 'random')}
        >
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🎲</div>
          <div style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
            随机模式
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            生成全新世界
          </div>
        </div>

        <div
          onClick={() => setMode('history')}
          style={modeCardStyles(mode === 'history')}
        >
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>⏳</div>
          <div style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
            历史模式
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            穿越历史时刻
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <Card style={{ width: '100%', maxWidth: '480px' }}>
        <form onSubmit={handleSubmit}>
          {mode === 'random' && (
            <>
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-sm)',
                  fontSize: 'var(--text-sm)',
                }}>
                  年龄
                </label>
                <input
                  type="number"
                  min={15}
                  max={80}
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 25)}
                  disabled={initializing}
                  style={{
                    width: '100%',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 'var(--text-base)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-sm)',
                  fontSize: 'var(--text-sm)',
                }}>
                  地点
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={initializing}
                  style={{
                    width: '100%',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 'var(--text-base)',
                    boxSizing: 'border-box',
                  }}
                  placeholder="例如：上海、纽约、东京..."
                />
              </div>
              
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-sm)',
                  fontSize: 'var(--text-sm)',
                }}>
                  背景
                </label>
                <select
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  disabled={initializing}
                  style={{
                    width: '100%',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 'var(--text-base)',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                >
                  <option value="上班族">上班族</option>
                  <option value="学生">学生</option>
                  <option value="自由职业">自由职业</option>
                  <option value="创业者">创业者</option>
                  <option value="无业">无业</option>
                </select>
              </div>
            </>
          )}

          {mode === 'history' && (
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label style={{
                display: 'block',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-sm)',
                fontSize: 'var(--text-sm)',
              }}>
                选择历史时期
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {historyPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPreset(preset.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-md)',
                      padding: 'var(--space-md)',
                      borderRadius: 'var(--radius-md)',
                      background: selectedPreset === preset.id 
                        ? 'var(--accent-primary)' 
                        : 'var(--bg-tertiary)',
                      color: selectedPreset === preset.id ? '#fff' : 'var(--text-primary)',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{preset.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{preset.name}</div>
                      <div style={{ 
                        fontSize: 'var(--text-sm)', 
                        opacity: selectedPreset === preset.id ? 0.9 : 0.6,
                      }}>
                        {preset.description}
                      </div>
                    </div>
                    {selectedPreset === preset.id && <span>✓</span>}
                  </button>
                ))}
              </div>
              
              <div style={{ marginTop: 'var(--space-lg)' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-sm)',
                  fontSize: 'var(--text-sm)',
                }}>
                  你想成为谁（可选）
                </label>
                <input
                  type="text"
                  value={targetCharacter}
                  onChange={(e) => setTargetCharacter(e.target.value)}
                  disabled={initializing}
                  style={{
                    width: '100%',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 'var(--text-base)',
                    boxSizing: 'border-box',
                  }}
                  placeholder="例如：八阿哥、乔布斯..."
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={initializing}
            disabled={mode === 'history' && !selectedPreset}
          >
            {initializing ? '正在创建世界...' : '创建世界'}
          </Button>
        </form>
      </Card>

      {/* Tips */}
      <div style={{ 
        marginTop: 'var(--space-xl)', 
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: 'var(--text-sm)',
        maxWidth: '400px',
      }}>
        <p>
          💡 提示：世界创建后，AI 角色会自动开始他们的生活。
          你可以与他们聊天、交朋友，或者只是观察这个世界的发展。
        </p>
      </div>
    </div>
  );
}
