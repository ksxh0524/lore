import { useWorldStore } from '../../stores/worldStore';
import type { EventInfo } from '../../lib/types';

interface TimelineProps {
  events?: EventInfo[];
}

function formatTimelineDate(timestamp: string): string {
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function Timeline({}: TimelineProps) {
  const events = useWorldStore((s) => s.events);
  const tick = useWorldStore((s) => s.tick);

  const keyEvents = events.slice(0, 20).filter((e) => e.priority >= 60);

  if (keyEvents.length === 0) {
    return (
      <div
        style={{
          height: '60px',
          background: '#12121a',
          borderTop: '1px solid #1a1a25',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#555570',
          fontSize: '0.85rem',
        }}
      >
        <span style={{ marginRight: '0.5rem' }}>📍</span>
        时间线将在关键事件发生时显示
      </div>
    );
  }

  return (
    <div
      style={{
        height: '60px',
        background: '#12121a',
        borderTop: '1px solid #1a1a25',
        padding: '0 1rem',
        display: 'flex',
        alignItems: 'center',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0',
          minWidth: 'max-content',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            color: '#8888a0',
            marginRight: '1rem',
            whiteSpace: 'nowrap',
          }}
        >
          TIMELINE
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#6366f1',
            }}
          />

          {keyEvents.map((event, i) => (
            <div key={event.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: '60px',
                  height: '2px',
                  background: i === 0 ? '#6366f1' : '#333',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
                title={event.title || event.type}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: i === 0 ? '#22c55e' : '#555',
                    border: i === 0 ? '2px solid #22c55e40' : 'none',
                  }}
                />
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: i === 0 ? '#f0f0f5' : '#555570',
                    marginTop: '0.25rem',
                    maxWidth: '80px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}
                >
                  {event.title || event.type}
                </div>
              </div>
            </div>
          ))}

          <div
            style={{
              width: '40px',
              height: '2px',
              background: '#333',
            }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#8888a0',
              }}
            />
            <div
              style={{
                fontSize: '0.65rem',
                color: '#8888a0',
                marginTop: '0.25rem',
              }}
            >
              Tick {tick}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
