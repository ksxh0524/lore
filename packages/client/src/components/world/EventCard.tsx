import type { EventInfo } from '../../lib/types';
import { useState, useEffect } from 'react';

interface EventCardProps {
  event: EventInfo;
  onClose?: () => void;
}

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

  const categoryEmoji: Record<string, string> = {
    routine: '📅',
    random: '🎲',
    social: '👥',
    romantic: '💕',
    career: '💼',
    crisis: '⚠️',
    user: '👤',
    world: '🌍',
    economy: '💰',
    work: '🏢',
    purchase: '🛒',
  };

  const priorityColor = event.priority >= 80 ? '#ef4444' : event.priority >= 50 ? '#f59e0b' : '#6b7280';

  return (
    <div
      style={{
        position: 'relative',
        background: '#1a1a25',
        border: `2px solid ${priorityColor}`,
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '0.75rem',
        opacity: visible && !exiting ? 1 : 0,
        transform: visible && !exiting ? 'translateX(0)' : 'translateX(100%)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      }}
      onClick={() => {
        setExiting(true);
        setTimeout(() => onClose?.(), 300);
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.5rem' }}>{categoryEmoji[event.type] || '📌'}</span>
        <span style={{ fontWeight: 'bold', color: '#f0f0f5' }}>{event.type}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#8888a0' }}>
          {new Date(event.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p style={{ margin: 0, color: '#c0c0d0', fontSize: '0.9rem', lineHeight: 1.5 }}>
        {event.description}
      </p>
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
    <div style={{ position: 'fixed', top: '1rem', right: '1rem', width: '350px', maxHeight: '80vh', overflow: 'auto', zIndex: 1000 }}>
      {displayedEvents.map(event => (
        <EventCard key={event.id} event={event} onClose={() => removeEvent(event.id)} />
      ))}
    </div>
  );
}
