import type { EventInfo } from '../../lib/types';
import { useState, useEffect } from 'react';
import './event-card.css';

interface EventCardProps {
  event: EventInfo;
  onClose?: () => void;
}

const categoryEmoji: Record<string, string> = {
  routine: '📅',
  random: '🎲',
  social: '👥',
  romantic: '💕',
  career: '💼',
  crisis: '⚠️',
  user: '👤',
  world: '🌍',
  economic: '💰',
  work: '🏢',
  purchase: '🛒',
  health: '🏥',
  disaster: '🌊',
};

export function EventCard({ event, onClose }: EventCardProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    const autoClose = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onClose?.(), 300);
    }, 5000);
    return () => {
      clearTimeout(timer);
      clearTimeout(autoClose);
    };
  }, [onClose]);

  const priorityClass = event.priority >= 80 ? 'high-priority' : event.priority >= 50 ? 'medium-priority' : 'low-priority';

  const handleClick = () => {
    setExiting(true);
    setTimeout(() => onClose?.(), 300);
  };

  return (
    <div
      className={`event-card ${priorityClass} ${visible && !exiting ? 'animate-fadeInScale' : ''}`}
      style={{ opacity: visible && !exiting ? 1 : 0 }}
      onClick={handleClick}
    >
      <div className="event-card-header">
        <span className="event-card-emoji">{categoryEmoji[event.type] || '📌'}</span>
        <span className="event-card-type">{event.type}</span>
        <span className="event-card-time">
          {new Date(event.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p className="event-card-desc">{event.description}</p>
    </div>
  );
}

export function EventCardList({ events }: { events: EventInfo[] }) {
  const [displayedEvents, setDisplayedEvents] = useState<EventInfo[]>([]);

  useEffect(() => {
    if (events.length > displayedEvents.length) {
      setDisplayedEvents(events.slice(0, 10));
    }
  }, [events, displayedEvents.length]);

  const removeEvent = (id: string) => {
    setDisplayedEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="event-card-list hide-scrollbar">
      {displayedEvents.map(event => (
        <EventCard key={event.id} event={event} onClose={() => removeEvent(event.id)} />
      ))}
    </div>
  );
}