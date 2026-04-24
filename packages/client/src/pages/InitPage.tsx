import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Shuffle, History, Check, Loader2, Lightbulb } from 'lucide-react';
import { useWorldStore } from '../stores/worldStore';
import { api } from '../services/api';
import './InitPage.css';

const historyPresets = [
  { id: 'jiuzi', name: '九子夺嫡', description: '清·康熙末年' },
  { id: 'jianwen', name: '建文元年', description: '明·靖难之役' },
  { id: 'silicon2020', name: '2020硅谷', description: '科技创业潮' },
];

export function InitPage() {
  const navigate = useNavigate();
  const setWorldId = useWorldStore((s) => s.setWorldId);
  const setAgents = useWorldStore((s) => s.setAgents);
  const setRunning = useWorldStore((s) => s.setRunning);
  const setInitializing = useWorldStore((s) => s.setInitializing);
  const initializing = useWorldStore((s) => s.initializing);

  const [mode, setMode] = useState<'random' | 'history'>('random');
  const [location, setLocation] = useState('上海');
  const [age, setAge] = useState(25);
  const [background, setBackground] = useState('上班族');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [targetCharacter, setTargetCharacter] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInitializing(true);

    try {
      const result = await api.initWorld({
        worldType: mode,
        randomParams: mode === 'random'
          ? { age, location, background }
          : undefined,
        historyParams: mode === 'history' && selectedPreset
          ? { presetName: selectedPreset, targetCharacter: targetCharacter || undefined }
          : undefined,
      });

      setWorldId(result.worldId);
      const agents = await api.getAgents(result.worldId);
      setAgents(agents);
      setRunning(true);
      navigate('/world');
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建世界失败');
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className="init-page">
      <header className="init-header">
        <button className="init-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
          <span>返回</span>
        </button>
        <div className="init-logo">
          <div className="init-logo-icon">
            <Globe size={18} />
          </div>
          <span className="init-logo-text">Lore</span>
        </div>
      </header>

      <main className="init-main">
        <div className="init-content">
          <div className="init-title">
            <h1>创建新世界</h1>
            <p>选择模式，开始你的 AI 世界之旅</p>
          </div>

          <div className="init-mode-selector">
            <button
              className={`init-mode-btn ${mode === 'random' ? 'active' : ''}`}
              onClick={() => setMode('random')}
            >
              <div className="init-mode-icon">
                <Shuffle size={24} />
              </div>
              <div className="init-mode-name">随机模式</div>
              <div className="init-mode-desc">生成全新世界</div>
            </button>

            <button
              className={`init-mode-btn ${mode === 'history' ? 'active' : ''}`}
              onClick={() => setMode('history')}
            >
              <div className="init-mode-icon">
                <History size={24} />
              </div>
              <div className="init-mode-name">历史模式</div>
              <div className="init-mode-desc">穿越历史时刻</div>
            </button>
          </div>

          <form className="init-form" onSubmit={handleSubmit}>
            {mode === 'random' && (
              <>
                <div className="init-form-group">
                  <label className="init-form-label">年龄</label>
                  <input
                    type="number"
                    className="init-form-input"
                    min={15}
                    max={80}
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 25)}
                    disabled={initializing}
                  />
                </div>

                <div className="init-form-group">
                  <label className="init-form-label">地点</label>
                  <input
                    type="text"
                    className="init-form-input"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={initializing}
                    placeholder="例如：上海、纽约、东京..."
                  />
                </div>

                <div className="init-form-group">
                  <label className="init-form-label">背景</label>
                  <select
                    className="init-form-select"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    disabled={initializing}
                  >
                    <option value="上班族">上班族</option>
                    <option value="学生">学生</option>
                    <option value="自由职业">自由职业</option>
                    <option value="创业者">创业者</option>
                    <option value="无业">无业</option>
                  </select>
                </div>
              </>
            )}

            {mode === 'history' && (
              <>
                <div className="init-form-group">
                  <label className="init-form-label">选择历史时期</label>
                  <div className="init-presets">
                    {historyPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`init-preset-btn ${selectedPreset === preset.id ? 'active' : ''}`}
                        onClick={() => setSelectedPreset(preset.id)}
                      >
                        <div className="init-preset-icon">
                          <History size={20} />
                        </div>
                        <div className="init-preset-info">
                          <div className="init-preset-name">{preset.name}</div>
                          <div className="init-preset-desc">{preset.description}</div>
                        </div>
                        {selectedPreset === preset.id && <Check size={20} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="init-form-group">
                  <label className="init-form-label">你想成为谁（可选）</label>
                  <input
                    type="text"
                    className="init-form-input"
                    value={targetCharacter}
                    onChange={(e) => setTargetCharacter(e.target.value)}
                    disabled={initializing}
                    placeholder="例如：八阿哥、乔布斯..."
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              className="init-submit-btn"
              disabled={initializing || (mode === 'history' && !selectedPreset)}
            >
              {initializing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>正在创建世界...</span>
                </>
              ) : (
                <span>创建世界</span>
              )}
            </button>
          </form>

          <div className="init-tips">
            <Lightbulb size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            世界创建后，AI 角色会自动开始他们的生活。你可以与他们聊天、交朋友，或者只是观察这个世界的发展。
          </div>
        </div>
      </main>
    </div>
  );
}