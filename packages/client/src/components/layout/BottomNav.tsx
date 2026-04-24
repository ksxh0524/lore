import { Users, Zap, MessageSquare, ScrollText } from 'lucide-react';
import './bottom-nav.css';

interface NavItem {
  id: string;
  label: string;
  Icon: typeof Users;
}

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems: NavItem[] = [
  { id: 'agents', label: '角色', Icon: Users },
  { id: 'events', label: '事件', Icon: Zap },
  { id: 'chat', label: '聊天', Icon: MessageSquare },
  { id: 'timeline', label: '时间线', Icon: ScrollText },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <item.Icon className="bottom-nav-icon" />
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}