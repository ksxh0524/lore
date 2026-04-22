import type { CSSProperties } from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems: NavItem[] = [
  { id: 'agents', label: '角色', icon: '👥' },
  { id: 'events', label: '事件', icon: '⚡' },
  { id: 'chat', label: '聊天', icon: '💬' },
  { id: 'timeline', label: '时间线', icon: '📜' },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const containerStyles: CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '60px',
    zIndex: 100,
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  };

  return (
    <nav style={containerStyles}>
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              height: '100%',
              background: 'transparent',
              border: 'none',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'color var(--transition-fast)',
              WebkitTapHighlightColor: 'transparent',
            }}

          >
            <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
            <span style={{ fontSize: '0.7rem', fontWeight: isActive ? 600 : 400 }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
