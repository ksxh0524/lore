import { useState, useEffect } from 'react';
import { AIProvidersPanel } from '../components/settings/AIProvidersPanel';
import type { CSSProperties } from 'react';

type SettingsTab = 'providers' | 'general' | 'world' | 'about';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: string;
}

const tabs: TabConfig[] = [
  { id: 'providers', label: 'AI 服务商', icon: '🧠' },
  { id: 'general', label: '通用设置', icon: '⚙️' },
  { id: 'world', label: '世界设置', icon: '🌍' },
  { id: 'about', label: '关于', icon: 'ℹ️' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers');

  const containerStyles: CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    background: 'var(--bg-primary)',
  };

  const sidebarStyles: CSSProperties = {
    width: '260px',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  };

  const headerStyles: CSSProperties = {
    padding: 'var(--space-lg)',
    borderBottom: '1px solid var(--border-subtle)',
  };

  const navStyles: CSSProperties = {
    flex: 1,
    padding: 'var(--space-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  };

  const contentStyles: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: 'var(--space-lg)',
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'providers':
        return <AIProvidersPanel />;
      case 'general':
        return (
          <div style={{ padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>通用设置</h2>
            <p>通用设置功能即将推出...</p>
          </div>
        );
      case 'world':
        return (
          <div style={{ padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>世界设置</h2>
            <p>世界默认设置功能即将推出...</p>
          </div>
        );
      case 'about':
        return (
          <div style={{ padding: 'var(--space-xl)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)' }}>关于 Lore</h2>
            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p style={{ marginBottom: 'var(--space-md)' }}>
                <strong>Lore</strong> 是一个开源的 AI 世界模拟器。
              </p>
              <p style={{ marginBottom: 'var(--space-md)' }}>
                每个 AI 角色都有独立的人格、记忆和生活轨迹。世界持续运行，角色自主决策。
              </p>
              <p style={{ marginBottom: 'var(--space-md)' }}>
                <strong>版本:</strong> 0.1.0
              </p>
              <p style={{ marginBottom: 'var(--space-md)' }}>
                <strong>开源地址:</strong> https://github.com/ksxh0524/lore
              </p>
              <p>
                MIT License © 2025
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={containerStyles}>
      {/* Sidebar */}
      <aside style={sidebarStyles}>
        <div style={headerStyles}>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>设置</h1>
        </div>
        <nav style={navStyles}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: isActive ? 'var(--accent-primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-base)',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all var(--transition-fast)',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={contentStyles}>
        {renderTabContent()}
      </main>
    </div>
  );
}
