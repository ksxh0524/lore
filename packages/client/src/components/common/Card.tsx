import { type ReactNode, type CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  style,
  className,
  padding = 'md',
  hoverable = false,
  onClick,
}: CardProps) {
  const paddingMap = {
    none: 0,
    sm: 'var(--space-sm)',
    md: 'var(--space-md)',
    lg: 'var(--space-lg)',
  };

  const baseStyles: CSSProperties = {
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-subtle)',
    padding: paddingMap[padding],
    transition: 'all var(--transition-fast)',
    cursor: onClick ? 'pointer' : 'default',
  };

  return (
    <div
      className={className}
      onClick={onClick}
      style={baseStyles}
      onMouseEnter={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.borderColor = 'var(--border-default)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {children}
    </div>
  );
}

interface EventCardProps {
  type: 'social' | 'work' | 'random' | 'relationship' | 'health' | 'money' | 'world';
  title: string;
  description: string;
  actions?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' }[];
  timestamp?: string;
}

const eventColors: Record<string, string> = {
  social: 'var(--event-social)',
  work: 'var(--event-work)',
  random: 'var(--event-random)',
  relationship: 'var(--event-relationship)',
  health: 'var(--event-health)',
  money: 'var(--event-money)',
  world: 'var(--event-world)',
};

const eventIcons: Record<string, string> = {
  social: '💬',
  work: '💼',
  random: '🎲',
  relationship: '❤️',
  health: '🏥',
  money: '💰',
  world: '🌍',
};

export function EventCard({ type, title, description, actions, timestamp }: EventCardProps) {
  const color = eventColors[type];
  const icon = eventIcons[type];

  return (
    <Card padding="md" style={{ borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
        <span style={{ fontSize: '1.25rem' }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontWeight: 600, 
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-xs)',
          }}>
            {title}
          </div>
          <div style={{ 
            color: 'var(--text-secondary)', 
            fontSize: 'var(--text-sm)',
            lineHeight: 1.5,
            marginBottom: actions && actions.length > 0 ? 'var(--space-md)' : 0,
          }}>
            {description}
          </div>
          {actions && actions.length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
              {actions.map((action, i) => (
                <button
                  key={i}
                  onClick={action.onClick}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    background: action.variant === 'primary' ? color : 'var(--bg-tertiary)',
                    color: action.variant === 'primary' ? '#fff' : 'var(--text-primary)',
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {timestamp && (
          <div style={{ 
            fontSize: 'var(--text-xs)', 
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
          }}>
            {timestamp}
          </div>
        )}
      </div>
    </Card>
  );
}
