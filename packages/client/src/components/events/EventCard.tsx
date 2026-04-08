import { useState } from 'react';

interface EventOption {
  id: string;
  text: string;
}

interface EventCardProps {
  id: string;
  type: string;
  category?: string;
  title: string;
  description: string;
  priority?: number;
  options?: EventOption[];
  timestamp?: string;
  onChoose?: (optionId: string) => void;
}

const typeColors: Record<string, string> = {
  social: '#6366f1',
  work: '#22c55e',
  random: '#f59e0b',
  relationship: '#ec4899',
  health: '#ef4444',
  money: '#84cc16',
  world: '#8b5cf6',
};

const typeIcons: Record<string, string> = {
  social: '💬',
  work: '💼',
  random: '🎲',
  relationship: '❤️',
  health: '🏥',
  money: '💰',
  world: '🌍',
};

export function EventCard({
  type,
  category,
  title,
  description,
  priority = 50,
  options = [],
  onChoose,
}: EventCardProps) {
  const [choosing, setChoosing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isUrgent = priority >= 80;
  const color = typeColors[category || type] || '#6366f1';
  const icon = typeIcons[category || type] || '⚡';

  const handleChoose = async (optionId: string) => {
    if (choosing) return;
    setChoosing(true);
    try {
      await onChoose?.(optionId);
      setDismissed(true);
    } finally {
      setChoosing(false);
    }
  };

  if (dismissed) return null;

  return (
    <div
      style={{
        background: '#12121a',
        borderRadius: '12px',
        border: `1px solid ${isUrgent ? '#ef4444' : '#1a1a25'}`,
        borderLeft: `4px solid ${color}`,
        padding: '1rem',
        marginBottom: '0.75rem',
        boxShadow: isUrgent ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'none',
        animation: isUrgent ? 'pulse-urgent 2s infinite' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>{icon}</span>
        <span
          style={{
            fontSize: '0.75rem',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            background: color + '20',
            color: color,
            textTransform: 'uppercase',
          }}
        >
          {category || type}
        </span>
        {isUrgent && (
          <span
            style={{
              fontSize: '0.7rem',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              background: '#ef444420',
              color: '#ef4444',
              marginLeft: '0.5rem',
            }}
          >
            紧急
          </span>
        )}
      </div>

      <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#f0f0f5' }}>
        {title}
      </div>

      <div
        style={{
          fontSize: '0.875rem',
          color: '#8888a0',
          lineHeight: 1.5,
          marginBottom: options.length > 0 ? '1rem' : 0,
        }}
      >
        {description}
      </div>

      {options.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleChoose(opt.id)}
              disabled={choosing}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#1a1a25',
                color: '#f0f0f5',
                cursor: choosing ? 'wait' : 'pointer',
                fontSize: '0.85rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!choosing) {
                  e.currentTarget.style.background = '#6366f1';
                  e.currentTarget.style.borderColor = '#6366f1';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1a1a25';
                e.currentTarget.style.borderColor = '#333';
              }}
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
