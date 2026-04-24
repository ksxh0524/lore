import { useNavigate } from 'react-router-dom';
import { Globe, Settings, Eye } from 'lucide-react';
import { useWorldStore } from '../../stores/worldStore';
import './header.css';

interface HeaderProps {
  onToggleGodMode?: () => void;
}

export function Header({ onToggleGodMode }: HeaderProps) {
  const navigate = useNavigate();
  const worldId = useWorldStore((s) => s.worldId);
  const tick = useWorldStore((s) => s.tick);
  const isRunning = useWorldStore((s) => s.isRunning);
  const godMode = useWorldStore((s) => s.godMode);

  return (
    <header className="header">
      <div className="header-left">
        <Globe className="header-logo" />
        <span className="header-logo">Lore</span>
        {worldId && (
          <span className="header-tick">Tick {tick}</span>
        )}
      </div>

      {worldId && (
        <div className={`header-status ${isRunning ? 'running' : 'paused'}`}>
          <span className={`header-status-dot ${isRunning ? 'running' : 'paused'}`} />
          {isRunning ? '运行中' : '已暂停'}
        </div>
      )}

      <div className="header-actions">
        <button
          onClick={() => navigate('/settings')}
          className="header-btn"
        >
          <Settings />
          <span>设置</span>
        </button>
        {worldId && onToggleGodMode && (
          <button
            onClick={onToggleGodMode}
            className={`header-btn ${godMode ? 'god-mode-active' : ''}`}
          >
            <Eye />
            <span>{godMode ? '上帝模式' : '观察'}</span>
          </button>
        )}
      </div>
    </header>
  );
}