import { useState, useEffect } from 'react';
import { useWorldStore } from '../../stores/worldStore';
import { api } from '../../services/api';

export function SaveManager() {
  const worldId = useWorldStore((s) => s.worldId);
  const [saves, setSaves] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadSaves = () => {
    if (!worldId) return;
    setLoading(true);
    api.getSaves(worldId)
      .then(setSaves)
      .catch(() => setSaves([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSaves(); }, [worldId]);

  const handleSave = async () => {
    if (!worldId || saving) return;
    setSaving(true);
    try {
      await api.saveWorld(worldId);
      loadSaves();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (saveId: string) => {
    try {
      await api.loadSave(saveId);
      window.location.reload();
    } catch (err) {
      console.error('Load failed:', err);
    }
  };

  const handleDelete = async (saveId: string) => {
    try {
      await api.deleteSave(saveId);
      loadSaves();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #1a1a25', background: '#12121a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#8888a0' }}>💾 存档管理</span>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.25rem 0.75rem', borderRadius: '6px', border: 'none',
            background: saving ? '#333' : '#6366f1', color: '#fff', fontSize: '0.75rem',
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {loading && <div style={{ color: '#8888a0', fontSize: '0.75rem' }}>加载中...</div>}

      {saves.length === 0 && !loading && (
        <div style={{ color: '#555570', fontSize: '0.75rem' }}>暂无存档</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '150px', overflowY: 'auto' }}>
        {saves.map((save) => (
          <div key={save.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.35rem 0.5rem', background: '#1a1a25', borderRadius: '6px',
            fontSize: '0.75rem',
          }}>
            <span style={{ color: '#f0f0f5' }}>{save.name}</span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                onClick={() => handleLoad(save.id)}
                style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', border: 'none', background: '#6366f1', color: '#fff', fontSize: '0.7rem', cursor: 'pointer' }}
              >加载</button>
              <button
                onClick={() => handleDelete(save.id)}
                style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '0.7rem', cursor: 'pointer' }}
              >删除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
