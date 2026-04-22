import type { CSSProperties } from 'react';

interface AvatarProps {
  name: string;
  emoji?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'idle' | 'busy';
  style?: CSSProperties;
}

const sizeMap = {
  sm: { size: 32, fontSize: '0.875rem' },
  md: { size: 40, fontSize: '1rem' },
  lg: { size: 56, fontSize: '1.5rem' },
  xl: { size: 80, fontSize: '2rem' },
};

const statusColors = {
  online: 'var(--accent-success)',
  offline: 'var(--text-muted)',
  idle: 'var(--accent-warning)',
  busy: 'var(--accent-error)',
};

// Generate consistent color from name
function getColorFromName(name: string): string {
  const colors = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#f59e0b', '#84cc16', '#22c55e', '#10b981',
    '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  ];
  let hash = 0;
  const safeName = name || 'Unknown';
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex]!;
}

export function Avatar({ name = 'Unknown', emoji, size = 'md', status, style }: AvatarProps) {
  const { size: pixelSize, fontSize } = sizeMap[size];
  const displayName = name || 'Unknown';
  const bgColor = getColorFromName(displayName);
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div
      style={{
        position: 'relative',
        width: pixelSize,
        height: pixelSize,
        borderRadius: '50%',
        background: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 600,
        color: '#fff',
        flexShrink: 0,
        ...style,
      }}
    >
      {emoji || initial}
      
      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: pixelSize * 0.3,
            height: pixelSize * 0.3,
            borderRadius: '50%',
            background: statusColors[status],
            border: `2px solid var(--bg-secondary)`,
          }}
        />
      )}
    </div>
  );
}

// Mood emoji helper
export function getMoodEmoji(mood: number): string {
  if (mood >= 80) return '😊';
  if (mood >= 60) return '🙂';
  if (mood >= 40) return '😐';
  if (mood >= 20) return '😔';
  return '😢';
}

export function getMoodColor(mood: number): string {
  if (mood >= 80) return 'var(--accent-success)';
  if (mood >= 60) return '#84cc16';
  if (mood >= 40) return 'var(--accent-warning)';
  if (mood >= 20) return '#f97316';
  return 'var(--accent-error)';
}
