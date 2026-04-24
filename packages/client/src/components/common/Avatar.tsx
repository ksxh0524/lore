import './avatar.css';

interface AvatarProps {
  name: string;
  emoji?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'idle' | 'busy';
}

const sizeMap = {
  sm: { size: 32 },
  md: { size: 40 },
  lg: { size: 56 },
  xl: { size: 80 },
};

const statusClasses = {
  online: 'online',
  offline: 'offline',
  idle: 'idle',
  busy: 'busy',
};

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

export function Avatar({ name = 'Unknown', emoji, size = 'md', status }: AvatarProps) {
  const displayName = name || 'Unknown';
  const bgColor = getColorFromName(displayName);
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div
      className={`avatar size-${size}`}
      style={{ background: bgColor }}
    >
      {emoji || initial}
      {status && (
        <span
          className={`avatar-status ${statusClasses[status]}`}
          style={{
            width: sizeMap[size].size * 0.3,
            height: sizeMap[size].size * 0.3,
          }}
        />
      )}
    </div>
  );
}

export function getMoodColor(mood: number): string {
  if (mood >= 80) return 'var(--accent-success)';
  if (mood >= 60) return '#84cc16';
  if (mood >= 40) return 'var(--accent-warning)';
  if (mood >= 20) return '#f97316';
  return 'var(--accent-error)';
}