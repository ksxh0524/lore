import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { ProviderCard } from './ProviderCard';
import { ProviderPresetSelector } from './ProviderPresetSelector';
import { ProviderEditModal } from './ProviderEditModal';
import type { ProviderPreset, UserProvider } from '@lore/shared';
import type { CSSProperties } from 'react';

export function AIProvidersPanel() {
  const { providers, presets, loadProviders, loadPresets, selectedProviderId, setSelectedProvider } = useSettingsStore();
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

  const containerStyles: CSSProperties = {
    padding: 'var(--space-lg)',
    maxWidth: '800px',
  };

  const headerStyles: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-xl)',
  };

  const addButtonStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    padding: 'var(--space-md) var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--accent-primary)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 'var(--text-base)',
    fontWeight: 500,
  };

  const emptyStateStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-2xl)',
    textAlign: 'center',
    color: 'var(--text-muted)',
    border: '2px dashed var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
  };

  return (
    <div style={containerStyles}>
      {/* Header */}
      <div style={headerStyles}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
            AI 服务商
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            配置你的 AI 模型服务商，支持 OpenAI、阿里云百炼、Gemini、Claude 等
          </p>
        </div>
        <button onClick={() => setShowPresetSelector(true)} style={addButtonStyles}>
          <span>+</span>
          <span>添加服务商</span>
        </button>
      </div>

      {/* Providers List */}
      {providers.length === 0 ? (
        <div style={emptyStateStyles}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🤖</div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-primary)' }}>
            还没有配置 AI 服务商
          </h3>
          <p style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-lg)', maxWidth: '400px' }}>
            添加一个服务商以开始使用 AI 功能。推荐使用阿里云百炼 (DashScope)。
          </p>
          <button onClick={() => setShowPresetSelector(true)} style={addButtonStyles}>
            <span>+</span>
            <span>添加你的第一个服务商</span>
          </button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 'var(--space-lg)',
        }}>
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onEdit={() => {
                setEditingProvider(provider);
                setSelectedProvider(provider.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
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
