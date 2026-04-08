import { useState } from 'react';
import { IPhone } from '../phone/PhoneHome';
import { MacBookPro } from './computer/MacDesktop';

type DeviceView = 'select' | 'phone' | 'computer';

const bg = 'linear-gradient(145deg, #0a0a1a 0%, #1a1a2e 40%, #0f0f2a 100%)';

const containerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  background: bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: '-apple-system, SF Pro Display, system-ui, sans-serif',
  overflow: 'hidden',
};

export function DeviceSelector() {
  const [device, setDevice] = useState<DeviceView>('select');
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);

  const backBtn = (
    <div
      onClick={() => setDevice('select')}
      style={{
        position: 'absolute', top: 24, left: 24, cursor: 'pointer',
        color: 'rgba(255,255,255,0.45)', fontSize: 14, zIndex: 100,
        padding: '6px 14px', borderRadius: 8,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        transition: 'all 200ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
    >
      ← 返回桌面
    </div>
  );

  if (device === 'phone') {
    return <div style={containerStyle}>{backBtn}<IPhone /></div>;
  }

  if (device === 'computer') {
    return <div style={containerStyle}>{backBtn}<MacBookPro /></div>;
  }

  return (
    <div style={{ ...containerStyle, flexDirection: 'column', gap: 52 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 44, fontWeight: 300, color: '#f0f0f5', letterSpacing: -1, margin: 0 }}>
          Lore{' '}
          <span style={{
            fontWeight: 600,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            World
          </span>
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', marginTop: 10, fontWeight: 300 }}>
          选择一个设备进入世界
        </p>
      </div>

      <div style={{ display: 'flex', gap: 52, alignItems: 'center' }}>
        <DeviceCard
          icon="📱"
          label="iPhone"
          sublabel="聊天 · 社交 · 通讯录"
          hovered={hoveredDevice === 'phone'}
          onHover={() => setHoveredDevice('phone')}
          onLeave={() => setHoveredDevice(null)}
          onClick={() => setDevice('phone')}
        />
        <DeviceCard
          icon="💻"
          label="MacBook Pro"
          sublabel="浏览器 · 文件 · 监控"
          hovered={hoveredDevice === 'computer'}
          onHover={() => setHoveredDevice('computer')}
          onLeave={() => setHoveredDevice(null)}
          onClick={() => setDevice('computer')}
        />
      </div>
    </div>
  );
}

function DeviceCard({ icon, label, sublabel, hovered, onHover, onLeave, onClick }: {
  icon: string; label: string; sublabel: string; hovered: boolean;
  onHover: () => void; onLeave: () => void; onClick: () => void;
}) {
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        width: 220,
        padding: '44px 32px',
        borderRadius: 24,
        background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.025)',
        border: hovered ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 300ms cubic-bezier(0.22, 1, 0.36, 1)',
        transform: hovered ? 'translateY(-6px) scale(1.03)' : 'translateY(0) scale(1)',
        boxShadow: hovered ? '0 12px 48px rgba(99,102,241,0.18)' : 'none',
      }}
    >
      <div style={{
        fontSize: 56, marginBottom: 16,
        filter: hovered ? 'none' : 'grayscale(0.25) brightness(0.8)',
        transition: 'filter 300ms',
        transform: hovered ? 'scale(1.08)' : 'scale(1)',
      }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#f0f0f5', marginBottom: 6, letterSpacing: -0.3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>{sublabel}</div>
    </div>
  );
}
