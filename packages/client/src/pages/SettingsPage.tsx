import { useState } from 'react';
import { Brain, Settings, Globe, Info } from 'lucide-react';
import { AIProvidersPanel } from '../components/settings/AIProvidersPanel';
import './settings-page.css';

type SettingsTab = 'providers' | 'general' | 'world' | 'about';

const tabs: { id: SettingsTab; label: string; Icon: typeof Brain }[] = [
  { id: 'providers', label: 'AI 服务商', Icon: Brain },
  { id: 'general', label: '通用设置', Icon: Settings },
  { id: 'world', label: '世界设置', Icon: Globe },
  { id: 'about', label: '关于', Icon: Info },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'providers':
        return <AIProvidersPanel />;
      case 'general':
        return (
          <div className="settings-placeholder">
            <h2>通用设置</h2>
            <p>通用设置功能即将推出...</p>
          </div>
        );
      case 'world':
        return (
          <div className="settings-placeholder">
            <h2>世界设置</h2>
            <p>世界默认设置功能即将推出...</p>
          </div>
        );
      case 'about':
        return (
          <div className="settings-about">
            <h2>关于 Lore</h2>
            <div className="settings-about-content">
              <p>
                <strong>Lore</strong> 是一个开源的 AI 世界模拟器。
              </p>
              <p>
                每个 AI 角色都有独立的人格、记忆和生活轨迹。世界持续运行，角色自主决策。
              </p>
              <p>
                <strong>版本:</strong> 0.1.0
              </p>
              <p>
                <strong>开源地址:</strong> https://github.com/ksxh0524/lore
              </p>
              <p>MIT License © 2025</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-page">
      <aside className="settings-sidebar">
        <div className="settings-header">
          <h1>设置</h1>
        </div>
        <nav className="settings-nav">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`settings-tab ${isActive ? 'active' : ''}`}
              >
                <tab.Icon className="settings-tab-icon" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="settings-content">{renderTabContent()}</main>
    </div>
  );
}