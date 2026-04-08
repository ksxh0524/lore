import { useWorldStore } from '../../stores/worldStore';

export function WorldClock() {
  const tick = useWorldStore((s) => s.tick);
  const isRunning = useWorldStore((s) => s.isRunning);
  const world = useWorldStore((s) => s.world);

  const worldTime = world?.worldTime ? new Date(world.worldTime) : null;
  const formattedTime = worldTime?.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }) ?? '未初始化';

  return (
    <div style={{
      padding: '0.75rem 1rem',
      background: '#1a1a25',
      borderRadius: '8px',
      marginBottom: '0.5rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#8888a0' }}>世界时间</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{formattedTime}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#8888a0' }}>Tick</div>
          <div style={{
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: isRunning ? '#6366f1' : '#555',
          }}>
            #{tick}
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isRunning ? '#22c55e' : '#555',
              marginLeft: '0.5rem',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
