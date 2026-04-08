import { useWorldStore } from '../../stores/worldStore';
import { api } from '../../services/api';

import { Play, Pause, Settings, Eye, User } from 'lucide-react';

interface HeaderProps {
  onOpenSettings?: () => void;
  onToggleGodMode?: () => void;
}

export function Header({ onOpenSettings, onToggleGodMode }: HeaderProps) {
  const world = useWorldStore((s) => s.world);
  const worldId = useWorldStore((s) => s.worldId);
  const isRunning = useWorldStore((s) => s.isRunning);
  const setRunning = useWorldStore((s) => s.setRunning);
  const tick = useWorldStore((s) => s.tick);
  const godMode = useWorldStore((s) => s.godMode);
  const speed = useWorldStore((s) => s.speed);
  const setSpeed = useWorldStore((s) => s.setSpeed);

  const worldTime = world?.worldTime ? new Date(world.worldTime) : null;
  const formattedTime = worldTime?.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }) ?? '加载中...';

  const handlePausePlay = async () => {
    if (!worldId) return;
    if (isRunning) {
      await api.pause(worldId);
      setRunning(false);
    } else {
      await api.resume(worldId);
      setRunning(true);
    }
  };

  const handleSpeedChange = async (newSpeed: number) => {
    if (!worldId) return;
    try {
      await api.setSpeed(worldId, newSpeed);
      setSpeed(newSpeed);
    } catch (err) {
      console.error('Failed to set speed:', err);
    }
  };

  const handleModeSwitch = async () => {
    if (!worldId) return;
    try {
      const newMode = godMode ? 'character' : 'god';
      await api.switchMode(newMode);
      onToggleGodMode?.();
    } catch (err) {
      console.error('Failed to switch mode:', err);
    }
  };

  const speeds = [1, 5, 10];

  return (
    <div
      style={{
        height: '60px',
        background: '#12121a',
        borderBottom: '1px solid #1a1a25',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>🌍 Lore</span>
        {world && (
          <span style={{ color: '#8888a0', fontSize: '0.85rem' }}>{world.name}</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 500 }}>{formattedTime}</span>
          <span style={{ color: '#555570', fontSize: '0.8rem' }}>Tick {tick}</span>
        </div>

        <button
          onClick={handlePausePlay}
          style={{
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #333',
            background: 'transparent',
            color: '#f0f0f5',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isRunning ? '暂停' : '继续'}
        >
          {isRunning ? <Pause size={18} /> : <Play size={18} />}
        </button>

        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: 'none',
                background: speed === s ? '#6366f1' : '#1a1a25',
                color: speed === s ? '#fff' : '#8888a0',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: speed === s ? 600 : 400,
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={handleModeSwitch}
          style={{
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #333',
            background: godMode ? '#6366f1' : 'transparent',
            color: godMode ? '#fff' : '#8888a0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
          title={godMode ? '上帝模式' : '角色模式'}
        >
          {godMode ? <Eye size={16} /> : <User size={16} />}
          <span style={{ fontSize: '0.8rem' }}>{godMode ? '上帝' : '角色'}</span>
        </button>

        <button
          onClick={onOpenSettings}
          style={{
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #333',
            background: 'transparent',
            color: '#8888a0',
            cursor: 'pointer',
          }}
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}
