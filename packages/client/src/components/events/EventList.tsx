import { Zap } from 'lucide-react';
import { useWorldStore } from '../../stores/worldStore';
import { EventCard } from '../common/Card';
import type { EventInfo } from '../../lib/types';
import './event-list.css';

interface EventListProps {
  onEventAction?: (eventId: string, action: string) => void;
}

export function EventList({ onEventAction }: EventListProps) {
  const events = useWorldStore((s) => s.events as EventInfo[]);

  const displayEvents = events
    .filter((e) => !e.processed)
    .slice(0, 10);

  if (displayEvents.length === 0) {
    return (
      <div className="event-list-empty">
        <Zap className="event-list-empty-icon" />
        <div className="event-list-empty-title">暂无事件</div>
        <div className="event-list-empty-subtitle">
          世界正在运行中，当有趣的事情发生时，事件卡片会在这里显示
        </div>
      </div>
    );
  }

  return (
    <div className="event-list">
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
                onClick: () => onEventAction?.(event.id, 'intervene'),
                variant: 'primary',
              },
              {
                label: '旁观',
                onClick: () => onEventAction?.(event.id, 'watch'),
                variant: 'secondary',
              },
            ]}
          />
        </div>
      ))}
    </div>
  );
}