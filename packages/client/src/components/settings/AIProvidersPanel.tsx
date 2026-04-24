import { useEffect, useState } from 'react';
import { Bot, Plus } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { ProviderCard } from './ProviderCard';
import { ProviderPresetSelector } from './ProviderPresetSelector';
import { ProviderEditModal } from './ProviderEditModal';
import type { ProviderPreset, UserProvider } from '@lore/shared';
import './ai-providers-panel.css';

export function AIProvidersPanel() {
  const { providers, presets, loadProviders, loadPresets } = useSettingsStore();
  const [showPresetSelector, setShowPresetSelector] = useState(false);
  const [editingProvider, setEditingProvider] = useState<UserProvider | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<ProviderPreset | null>(null);

  useEffect(() => {
    loadProviders();
    loadPresets();
  }, [loadProviders, loadPresets]);

  const handleSelectPreset = (preset: ProviderPreset) => {
    setSelectedPreset(preset);
    setShowPresetSelector(false);
  };

  const handleCloseEdit = () => {
    setSelectedPreset(null);
    setEditingProvider(null);
  };

  const handleSaveSuccess = () => {
    handleCloseEdit();
    loadProviders();
  };

  return (
    <div className="ai-providers-panel">
      <div className="ai-providers-header">
        <div>
          <h1 className="ai-providers-title">AI 服务商</h1>
          <p className="ai-providers-desc">
            配置你的 AI 模型服务商，支持 OpenAI、阿里云百炼、Gemini、Claude 等
          </p>
        </div>
        <button onClick={() => setShowPresetSelector(true)} className="ai-providers-add-btn">
          <Plus />
          <span>添加服务商</span>
        </button>
      </div>

      {providers.length === 0 ? (
        <div className="ai-providers-empty">
          <Bot className="ai-providers-empty-icon" />
          <h3 className="ai-providers-empty-title">还没有配置 AI 服务商</h3>
          <p className="ai-providers-empty-desc">
            添加一个服务商以开始使用 AI 功能。推荐使用阿里云百炼 (DashScope)。
          </p>
          <button onClick={() => setShowPresetSelector(true)} className="ai-providers-add-btn">
            <Plus />
            <span>添加你的第一个服务商</span>
          </button>
        </div>
      ) : (
        <div className="ai-providers-grid">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onEdit={() => setEditingProvider(provider)}
            />
          ))}
        </div>
      )}

      {showPresetSelector && (
        <ProviderPresetSelector
          onSelect={handleSelectPreset}
          onCancel={() => setShowPresetSelector(false)}
        />
      )}

      {(selectedPreset || editingProvider) && (
        <ProviderEditModal
          preset={selectedPreset || undefined}
          provider={editingProvider || undefined}
          onClose={handleCloseEdit}
          onSave={handleSaveSuccess}
        />
      )}
    </div>
  );
}