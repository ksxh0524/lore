import { useWorldStore } from '../../stores/worldStore';
import { EventCard } from '../common/Card';
import type { CSSProperties } from 'react';
import type { EventInfo } from '../../lib/types';

export function EventCardList() {
  const events = useWorldStore((s) => s.events as EventInfo[]);

  const displayEvents = events
    .filter((e) => !e.processed)
    .slice(0, 10);

  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
    padding: 'var(--space-md)',
    height: '100%',
    overflow: 'auto',
  };

  if (displayEvents.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 'var(--space-xl)',
        color: 'var(--text-muted)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>⚡</div>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
          暂无事件
        </div>
        <div style={{ fontSize: 'var(--text-sm)', maxWidth: '300px' }}>
          世界正在运行中，当有趣的事情发生时，事件卡片会在这里显示
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyles}>
        {displayEvents.map((event) => (
        <div key={event.id} className="animate-slideUp">
          <EventCard
            type={event.type}
            title={event.title ?? '事件'}
            description={event.description}
            timestamp={event.timestamp}
            actions={[
              {
                label: '介入',
                onClick: () => {},
                variant: 'primary',
              },
              {
                label: '旁观',
                onClick: () => {},
                variant: 'secondary',
              },
            ]}
          />
        </div>
      ))}
    </div>
  );
}
