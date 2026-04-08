import { useState } from 'react';
import { IPhone } from '../phone/PhoneHome';
import { IMac } from './computer/MacDesktop';

type DeviceView = 'select' | 'phone' | 'computer';

const containerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  background: '#0a0a0f',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: '-apple-system, SF Pro Display, system-ui, sans-serif',
  overflow: 'hidden',
};

export function DeviceSelector() {
  const [device, setDevice] = useState<DeviceView>('select');
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);

  if (device === 'phone') {
    return (
      <div style={{ ...containerStyle, background: 'linear-gradient(145deg, #0a0a1a 0%, #1a1a2e 40%, #0f0f2a 100%)' }}>
        <div style={{ position: 'absolute', top: 20, left: 20, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 14, zIndex: 100 }} onClick={() => setDevice('select')}>
          ← 返回桌面
        </div>
        <IPhone />
      </div>
    );
  }

  if (device === 'computer') {
    return (
      <div style={{ ...containerStyle, background: 'linear-gradient(145deg, #0a0a1a 0%, #1a1a2e 40%, #0f0f2a 100%)' }}>
        <div style={{ position: 'absolute', top: 20, left: 20, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 14, zIndex: 100 }} onClick={() => setDevice('select')}>
          ← 返回桌面
        </div>
        <IMac />
      </div>
    );
  }

  return (
    <div style={{
      ...containerStyle,
      background: 'linear-gradient(145deg, #0a0a1a 0%, #1a1a2e 40%, #0f0f2a 100%)',
      flexDirection: 'column',
      gap: 48,
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 42, fontWeight: 300, color: '#f0f0f5', letterSpacing: -1, margin: 0 }}>
          Lore <span style={{ fontWeight: 600, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>World</span>
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', marginTop: 8, fontWeight: 300 }}>选择一个设备进入世界</p>
      </div>

      <div style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
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
          icon="🖥️"
          label="Mac"
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
        padding: '40px 32px',
        borderRadius: 24,
        background: hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
        border: hovered ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 250ms cubic-bezier(0.175, 0.885, 0.32, 1.05)',
        transform: hovered ? 'translateY(-4px) scale(1.02)' : 'none',
        boxShadow: hovered ? '0 8px 40px rgba(99,102,241,0.15)' : 'none',
      }}
    >
      <div style={{ fontSize: 56, marginBottom: 16, filter: hovered ? 'none' : 'grayscale(0.3)', transition: 'filter 250ms' }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f5', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{sublabel}</div>
    </div>
  );
}
