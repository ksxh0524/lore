import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Plus, Settings, ChevronRight, Loader2, Clock, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { useWorldStore } from '../stores/worldStore';
import './HomePage.css';

interface World {
  id: string;
  name: string;
  type: 'random' | 'history';
  status: string;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
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

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-logo">
          <div className="home-logo-icon">
            <Globe size={18} />
          </div>
          <span className="home-logo-text">Lore</span>
        </div>
        <div className="home-header-actions">
          <button className="home-header-btn" onClick={() => navigate('/settings')}>
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="home-main">
        <div className="home-content">
          {loading ? (
            <div className="home-loading">
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : worlds.length === 0 ? (
            <div className="home-empty-state">
              <div className="home-empty-illustration">
                <Globe size={48} strokeWidth={1.5} />
              </div>
              <h2 className="home-empty-title">开始创建你的世界</h2>
              <p className="home-empty-desc">
                创建一个 AI 驱动的虚拟世界，观察角色们的生活和故事
              </p>
              <button className="home-create-btn" onClick={() => navigate('/new')}>
                <Plus size={20} />
                <span>新建世界</span>
              </button>
            </div>
          ) : (
            <div className="home-worlds-section">
              <div className="home-section-header">
                <h2 className="home-section-title">我的世界</h2>
                <button className="home-section-btn" onClick={() => navigate('/new')}>
                  <Plus size={16} />
                  <span>新建</span>
                </button>
              </div>

              <div className="home-worlds-grid">
                {worlds.map((world) => (
                  <div
                    key={world.id}
                    className="home-world-card"
                    onClick={() => handleEnterWorld(world.id)}
                  >
                    <div className="home-world-card-header">
                      <div className="home-world-icon">
                        <Globe size={24} />
                      </div>
                      <span className={`home-world-status-dot ${world.status === 'running' ? 'running' : ''}`} />
                    </div>
                    <div className="home-world-name">{world.name}</div>
                    <div className="home-world-meta">
                      <span className={`home-world-tag ${world.type}`}>
                        {world.type === 'history' ? '历史' : '随机'}
                      </span>
                      <span>{world.status === 'running' ? '运行中' : '已暂停'}</span>
                    </div>
                    <div className="home-world-footer">
                      <span>
                        <Calendar size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {formatDate(world.createdAt)}
                      </span>
                      <span className="home-world-enter">
                        进入
                        <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}