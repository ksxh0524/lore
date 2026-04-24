import { useWorldStore } from '../../stores/worldStore';
import './timeline.css';

interface TimelineEvent {
  day: number;
  title: string;
  description?: string;
}

export function Timeline() {
  const tick = useWorldStore((s) => s.tick);
  const events = useWorldStore((s) => s.events);

  const timelineEvents: TimelineEvent[] = events
    .slice(0, 20)
    .map((e, index) => ({
      day: Math.max(1, tick - index * 3),
      title: e.title || '事件',
      description: e.description,
    }));

  if (timelineEvents.length === 0) {
    return (
      <div className="timeline">
        <div className="timeline-empty">时间线将在事件发生后显示</div>
      </div>
    );
  }

  return (
    <div className="timeline">
      <div className="timeline-header">时间线</div>
      <div className="timeline-container">
        <div className="timeline-line" />
        {timelineEvents.map((event, index) => {
          const isLatest = index === 0;
          return (
            <div
              key={index}
              className={`timeline-event ${isLatest ? 'latest' : 'old'}`}
            >
              <div className={`timeline-dot ${isLatest ? 'latest' : 'old'}`} />
              <div className={`timeline-day ${isLatest ? 'latest' : 'old'}`}>
                Day {event.day}
              </div>
              <div className="timeline-title">{event.title}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}