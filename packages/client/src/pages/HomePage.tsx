import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useWorldStore } from '../stores/worldStore';

interface World {
  id: string;
  name: string;
  type: 'random' | 'history';
  status: string;
  createdAt: string;
}

export function HomePage() {
  const navigate = useNavigate();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const setWorldId = useWorldStore((s) => s.setWorldId);

  useEffect(() => {
    loadWorlds();
  }, []);

  const loadWorlds = async () => {
    try {
      const data = await api.getWorlds();
      setWorlds(data);
    } catch (err) {
      console.error('Failed to load worlds:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterWorld = (worldId: string) => {
    setWorldId(worldId);
    navigate('/world');
  };

  const containerStyles: React.CSSProperties = {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 'var(--space-xl)',
  };

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    marginBottom: 'var(--space-3xl)',
  };

  const logoStyles: React.CSSProperties = {
    fontSize: '2rem',
  };

  const titleStyles: React.CSSProperties = {
    fontSize: 'var(--text-2xl)',
    fontWeight: 700,
    color: 'var(--text-primary)',
  };

  const cardContainerStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-lg)',
  };

  const cardStyles: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-xl)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    border: '1px solid var(--border-subtle)',
  };

  const cardHoverStyles: React.CSSProperties = {
    transform: 'translateY(-2px)',
    boxShadow: 'var(--shadow-md)',
    borderColor: 'var(--accent-primary)',
  };

  const cardHeaderStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    marginBottom: 'var(--space-sm)',
  };

  const iconStyles: React.CSSProperties = {
    fontSize: '1.5rem',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-md)',
  };

  const cardTitleStyles: React.CSSProperties = {
    fontSize: 'var(--text-lg)',
    fontWeight: 600,
    color: 'var(--text-primary)',
  };

  const cardDescStyles: React.CSSProperties = {
    fontSize: 'var(--text-sm)',
    color: 'var(--text-secondary)',
    marginLeft: 'calc(40px + var(--space-md))',
  };

  const worldListStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-sm)',
    marginTop: 'var(--space-md)',
  };

  const worldItemStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-md)',
    background: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    border: '1px solid transparent',
  };

  const worldItemHoverStyles: React.CSSProperties = {
    background: 'var(--bg-hover)',
    borderColor: 'var(--border-default)',
  };

  const worldNameStyles: React.CSSProperties = {
    fontWeight: 500,
    color: 'var(--text-primary)',
  };

  const worldMetaStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    fontSize: 'var(--text-xs)',
    color: 'var(--text-muted)',
  };

  const tagStyles = (type: 'random' | 'history'): React.CSSProperties => ({
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
    background: type === 'history' ? 'var(--accent-warning)' : 'var(--accent-info)',
    color: '#fff',
    fontWeight: 500,
  });

  const statusStyles = (status: string): React.CSSProperties => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: status === 'running' ? 'var(--accent-success)' : 'var(--text-muted)',
    animation: status === 'running' ? 'pulse 2s ease-in-out infinite' : 'none',
  });

  const emptyStyles: React.CSSProperties = {
    textAlign: 'center',
    padding: 'var(--space-xl)',
    color: 'var(--text-muted)',
    fontSize: 'var(--text-sm)',
  };

  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredWorld, setHoveredWorld] = useState<string | null>(null);

  return (
    <div style={containerStyles}>
      {/* Header */}
      <div style={headerStyles}>
        <span style={logoStyles}>🌍</span>
        <span style={titleStyles}>Lore</span>
      </div>

      {/* Cards */}
      <div style={cardContainerStyles}>
        {/* New World Card */}
        <div
          style={{
            ...cardStyles,
            ...(hoveredCard === 'new' ? cardHoverStyles : {}),
          }}
          onMouseEnter={() => setHoveredCard('new')}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => navigate('/new')}
        >
          <div style={cardHeaderStyles}>
            <div style={iconStyles}>➕</div>
            <div style={cardTitleStyles}>新建</div>
          </div>
          <div style={cardDescStyles}>创建一个新世界</div>
        </div>

        {/* History Worlds Card */}
        <div style={cardStyles}>
          <div style={cardHeaderStyles}>
            <div style={iconStyles}>📜</div>
            <div style={cardTitleStyles}>历史的世界</div>
          </div>
          
          {loading ? (
            <div style={{ ...cardDescStyles, color: 'var(--text-muted)' }}>
              加载中...
            </div>
          ) : worlds.length === 0 ? (
            <div style={emptyStyles}>
              暂无世界，去创建一个吧
            </div>
          ) : (
            <div style={worldListStyles}>
              {worlds.map((world) => (
                <div
                  key={world.id}
                  style={{
                    ...worldItemStyles,
                    ...(hoveredWorld === world.id ? worldItemHoverStyles : {}),
                  }}
                  onMouseEnter={() => setHoveredWorld(world.id)}
                  onMouseLeave={() => setHoveredWorld(null)}
                  onClick={() => handleEnterWorld(world.id)}
                >
                  <div>
                    <div style={worldNameStyles}>{world.name}</div>
                    <div style={worldMetaStyles}>
                      <span style={tagStyles(world.type)}>
                        {world.type === 'history' ? '历史' : '随机'}
                      </span>
                      <span>·</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={statusStyles(world.status)} />
                        {world.status === 'running' ? '运行中' : '已暂停'}
                      </span>
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-lg)' }}>
                    →
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings Card */}
        <div
          style={{
            ...cardStyles,
            ...(hoveredCard === 'settings' ? cardHoverStyles : {}),
          }}
          onMouseEnter={() => setHoveredCard('settings')}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={() => navigate('/settings')}
        >
          <div style={cardHeaderStyles}>
            <div style={iconStyles}>⚙️</div>
            <div style={cardTitleStyles}>设置</div>
          </div>
          <div style={cardDescStyles}>配置 AI 提供商和其他选项</div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
