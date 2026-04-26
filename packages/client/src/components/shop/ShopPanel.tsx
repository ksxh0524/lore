import { useState, useEffect } from 'react';
import { ShoppingBag, DollarSign, Loader2 } from 'lucide-react';
import type { AgentInfo } from '../../lib/types';
import { shop, economy } from '../../services/api';
import { createLogger } from '../../utils/logger';
import type { ShopItem } from '@lore/shared';
import './shop-panel.css';

const logger = createLogger('shop-panel');

interface ShopItemWithIcon extends ShopItem {
  icon?: string;
}

const shopCategories = [
  { id: 'food', name: '餐饮', icon: '🍔' },
  { id: 'entertainment', name: '娱乐', icon: '🎮' },
  { id: 'health', name: '健康', icon: '💊' },
  { id: 'transport', name: '交通', icon: '🚗' },
  { id: 'housing', name: '住房', icon: '🏠' },
  { id: 'luxury', name: '奢侈', icon: '💎' },
  { id: 'education', name: '教育', icon: '📚' },
  { id: 'gift', name: '礼物', icon: '🎁' },
];

const categoryIcons: Record<string, string> = {
  food: '🍜',
  entertainment: '🎮',
  health: '💊',
  transport: '🚗',
  housing: '🏠',
  luxury: '💎',
  education: '📚',
  gift: '🎁',
};

interface ShopPanelProps {
  agent?: AgentInfo;
  onPurchase?: (item: ShopItemWithIcon) => void;
}

export function ShopPanel({ agent, onPurchase }: ShopPanelProps) {
  const [activeCategory, setActiveCategory] = useState('food');
  const [selectedItem, setSelectedItem] = useState<ShopItemWithIcon | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ShopItemWithIcon[]>([]);
  const [balance, setBalance] = useState(agent?.stats?.money ?? 0);

  useEffect(() => {
    shop.list().then(data => {
      setItems(data.map(item => ({
        ...item,
        icon: categoryIcons[item.category] || '📦',
      })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (agent?.id) {
      economy.get(agent.id).then(data => {
        setBalance(data.balance);
      }).catch(() => {
        setBalance(agent.stats?.money ?? 0);
      });
    }
  }, [agent]);

  const filteredItems = items.filter(item => item.category === activeCategory);

  const handlePurchase = async () => {
    if (!selectedItem || !agent?.id || balance < selectedItem.price) return;
    
    setLoading(true);
    try {
      const result = await shop.buy(agent.id, selectedItem.id);
      setBalance(result.newBalance);
      setPurchaseSuccess(true);
      onPurchase?.(selectedItem);
      setTimeout(() => {
        setPurchaseSuccess(false);
        setSelectedItem(null);
      }, 1500);
    } catch (error) {
      console.error('Purchase failed:', error);
      logger.error('Purchase failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEffectColor = (key: string, value: number) => {
    if (value > 0) return 'var(--accent-success)';
    if (value < 0) return 'var(--accent-error)';
    return 'var(--text-muted)';
  };

  const formatEffect = (key: string, value: number) => {
    const labels: Record<string, string> = {
      energy: '精力',
      mood: '心情',
      health: '健康',
      money: '金钱',
    };
    return `${labels[key] || key} ${value > 0 ? '+' : ''}${value}`;
  };

  return (
    <div className="shop-panel">
      <div className="shop-panel-header">
        <h3 className="shop-panel-title">商店</h3>
        <div className="shop-panel-balance">
          <DollarSign size={14} />
          <span>{balance}</span>
        </div>
      </div>

      <div className="shop-category-tabs hide-scrollbar">
        {shopCategories.map(cat => (
          <button
            key={cat.id}
            className={`shop-category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      <div className="shop-items-grid">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className={`shop-item-card ${balance < item.price ? 'disabled' : ''}`}
            onClick={() => {
              if (balance >= item.price) {
                setSelectedItem(item);
              }
            }}
          >
            <div className="shop-item-icon">{item.icon || '📦'}</div>
            <div className="shop-item-name">{item.name}</div>
            <div className="shop-item-desc">{item.description}</div>
            <div className="shop-item-price">
              <DollarSign size={12} />
              {item.price}
            </div>
            {Object.entries(item.effect).length > 0 && (
              <div className="shop-item-effects">
                {Object.entries(item.effect).map(([key, value]) => (
                  <span
                    key={key}
                    className="shop-item-effect"
                    style={{ color: getEffectColor(key, value) }}
                  >
                    {formatEffect(key, value)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedItem && !purchaseSuccess && (
        <div className="shop-purchase-modal" onClick={() => setSelectedItem(null)}>
          <div className="shop-purchase-content" onClick={e => e.stopPropagation()}>
            <h4 className="shop-purchase-title">确认购买</h4>
            
            <div className="shop-purchase-info">
              <div className="shop-purchase-row">
                <span className="shop-purchase-label">物品</span>
                <span className="shop-purchase-value">{selectedItem.name}</span>
              </div>
              <div className="shop-purchase-row">
                <span className="shop-purchase-label">价格</span>
                <span className="shop-purchase-value" style={{ color: 'var(--accent-warning)' }}>
                  ${selectedItem.price}
                </span>
              </div>
              <div className="shop-purchase-row">
                <span className="shop-purchase-label">余额</span>
                <span className="shop-purchase-value">${balance}</span>
              </div>
              <div className="shop-purchase-row">
                <span className="shop-purchase-label">购买后余额</span>
                <span className="shop-purchase-value" style={{ color: balance - selectedItem.price < 100 ? 'var(--accent-error)' : 'var(--accent-success)' }}>
                  ${balance - selectedItem.price}
                </span>
              </div>
            </div>

            <div className="shop-purchase-actions">
              <button className="shop-purchase-btn cancel" onClick={() => setSelectedItem(null)}>
                取消
              </button>
              <button className="shop-purchase-btn confirm" onClick={handlePurchase} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : '购买'}
              </button>
            </div>
          </div>
        </div>
      )}

      {purchaseSuccess && (
        <div className="shop-purchase-modal">
          <div className="shop-purchase-content" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-md)' }}>✅</div>
            <div className="shop-purchase-title">购买成功！</div>
          </div>
        </div>
      )}
    </div>
  );
}