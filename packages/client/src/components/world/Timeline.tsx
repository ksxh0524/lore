import { useWorldStore } from '../../stores/worldStore';
import type { CSSProperties } from 'react';

interface TimelineEvent {
  day: number;
  title: string;
  description?: string;
}

export function Timeline() {
  const tick = useWorldStore((s) => s.tick);
  const events = useWorldStore((s) => s.events);

  // Generate timeline events from actual events
  const timelineEvents: TimelineEvent[] = events
    .slice(0, 20)
    .map((e, index) => ({
      day: Math.max(1, tick - index * 3),
      title: e.title || '事件',
      description: e.description,
    }));

  const containerStyles: CSSProperties = {
    background: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border-subtle)',
    padding: 'var(--space-md)',
    maxHeight: '120px',
    overflow: 'auto',
  };

  const timelineStyles: CSSProperties = {
    display: 'flex',
    gap: 'var(--space-md)',
    position: 'relative',
    paddingLeft: 'var(--space-sm)',
  };

  const eventStyles = (isLatest: boolean): CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '80px',
    maxWidth: '120px',
    flexShrink: 0,
    opacity: isLatest ? 1 : 0.6,
  });

  const dotStyles = (isLatest: boolean): CSSProperties => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: isLatest ? 'var(--accent-primary)' : 'var(--border-default)',
    border: `2px solid ${isLatest ? 'var(--accent-primary)' : 'var(--bg-secondary)'}`,
    boxShadow: isLatest ? '0 0 8px var(--accent-primary)' : 'none',
    marginBottom: 'var(--space-sm)',
    position: 'relative',
    zIndex: 2,
  });

  const lineStyles: CSSProperties = {
    position: 'absolute',
    top: 4,
    left: 'var(--space-md)',
    right: 'var(--space-md)',
    height: 2,
    background: 'var(--border-subtle)',
    zIndex: 1,
  };

  if (timelineEvents.length === 0) {
    return (
      <div style={containerStyles}>
        <div style={{ 
          textAlign: 'center', 
          color: 'var(--text-muted)',
          fontSize: 'var(--text-sm)',
          padding: 'var(--space-md)',
        }}>
          时间线将在事件发生后显示
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyles}>
      <div style={{ 
        fontSize: 'var(--text-xs)', 
        color: 'var(--text-muted)',
        marginBottom: 'var(--space-sm)',
        fontWeight: 600,
      }}>
        时间线
      </div>
      <div style={timelineStyles}>
        <div style={lineStyles} />
        {timelineEvents.map((event, index) => {
          const isLatest = index === 0;
          return (
            <div key={index} style={eventStyles(isLatest)}>
              <div style={dotStyles(isLatest)} />
              <div style={{
                fontSize: 'var(--text-xs)',
                color: isLatest ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: isLatest ? 600 : 400,
                marginBottom: '2px',
              }}>
                Day {event.day}
              </div>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                lineHeight: 1.3,
              }}>
                {event.title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
