import { useState, useEffect } from 'react';
import { useWorldStore } from '../../stores/worldStore';
import { api } from '../../services/api';

export function EconomyPanel() {
  const selectedAgentId = useWorldStore((s) => s.selectedAgentId);
  const [economy, setEconomy] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedAgentId) return;
    setLoading(true);
    api.getEconomy(selectedAgentId)
      .then(setEconomy)
      .catch(() => setEconomy(null))
      .finally(() => setLoading(false));
  }, [selectedAgentId]);

  if (!selectedAgentId) return null;
  if (loading) return <div style={{ padding: '1rem', color: '#8888a0', fontSize: '0.85rem' }}>加载经济数据...</div>;
  if (!economy) return null;

  return (
    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #1a1a25', background: '#12121a' }}>
      <div style={{ fontSize: '0.8rem', color: '#8888a0', marginBottom: '0.5rem' }}>💰 经济状况</div>
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
        <div>
          <span style={{ color: '#8888a0' }}>余额 </span>
          <span style={{ color: '#4ade80', fontWeight: 600 }}>¥{economy.balance?.toFixed(0) ?? 0}</span>
        </div>
        <div>
          <span style={{ color: '#8888a0' }}>收入 </span>
          <span style={{ color: '#22c55e' }}>+{economy.income?.toFixed(0) ?? 0}</span>
        </div>
        <div>
          <span style={{ color: '#8888a0' }}>支出 </span>
          <span style={{ color: '#ef4444' }}>-{economy.expenses?.toFixed(0) ?? 0}</span>
        </div>
      </div>
    </div>
  );
}
