import { useWorldStore } from '../../stores/worldStore';
import { EventCard } from './EventCard';
import { api } from '../../services/api';

export function EventCardList() {
  const events = useWorldStore((s) => s.events);
  const worldId = useWorldStore((s) => s.worldId);

  const handleChoose = async (eventId: string, optionId: string) => {
    if (!worldId) return;
    await api.chooseEventOption(eventId, optionId);
  };

  if (events.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#555570',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌍</div>
        <div style={{ fontSize: '1.1rem' }}>暂无事件</div>
        <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>世界很安静...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', overflow: 'auto', height: '100%' }}>
      {events.map((event) => (
        <EventCard
          key={event.id}
          id={event.id}
          type={event.type}
          category={event.category}
          title={event.title || event.type}
          description={event.description}
          priority={event.priority}
          options={event.options}
          timestamp={event.timestamp}
          onChoose={(optId) => handleChoose(event.id, optId)}
        />
      ))}
    </div>
  );
}
