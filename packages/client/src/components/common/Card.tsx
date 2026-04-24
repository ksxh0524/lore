import { type ReactNode } from 'react';
import {
  MessageSquare,
  Briefcase,
  Dice5,
  Heart,
  Activity,
  Coins,
  Globe
} from 'lucide-react';
import './card.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = '',
  padding = 'md',
  hoverable = false,
  onClick,
}: CardProps) {
  const classes = [
    'card',
    `padding-${padding}`,
    hoverable ? 'hoverable' : '',
    onClick ? 'clickable' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick}>
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

const eventIcons = {
  social: MessageSquare,
  work: Briefcase,
  random: Dice5,
  relationship: Heart,
  health: Activity,
  money: Coins,
  world: Globe,
};

const eventColors: Record<string, string> = {
  social: 'var(--event-social)',
  work: 'var(--event-work)',
  random: 'var(--event-random)',
  relationship: 'var(--event-relationship)',
  health: 'var(--event-health)',
  money: 'var(--event-money)',
  world: 'var(--event-world)',
};

export function EventCard({ type, title, description, actions, timestamp }: EventCardProps) {
  const IconComponent = eventIcons[type];
  const color = eventColors[type];

  return (
    <Card padding="md" className={`event-card type-${type}`}>
      <div className="event-card-header">
        <IconComponent className="event-card-icon" style={{ color }} />
        <div className="event-card-content">
          <div className="event-card-title">{title}</div>
          <div className="event-card-description" style={{ marginBottom: actions && actions.length > 0 ? 'var(--space-md)' : 0 }}>
            {description}
          </div>
          {actions && actions.length > 0 && (
            <div className="event-card-actions">
              {actions.map((action, i) => (
                <button
                  key={i}
                  onClick={action.onClick}
                  className={`event-card-action-btn ${action.variant || 'secondary'}`}
                  style={{
                    background: action.variant === 'primary' ? color : undefined,
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {timestamp && (
          <div className="event-card-timestamp">{timestamp}</div>
        )}
      </div>
    </Card>
  );
}