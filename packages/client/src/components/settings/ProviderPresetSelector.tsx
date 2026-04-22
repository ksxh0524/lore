import { useSettingsStore } from '../../stores/settingsStore';
import type { ProviderPreset } from '@lore/shared';
import type { CSSProperties } from 'react';

interface ProviderPresetSelectorProps {
  onSelect: (preset: ProviderPreset) => void;
  onCancel: () => void;
}

const presetIcons: Record<string, string> = {
  dashscope: '🔷',
  openai: '🔵',
  gemini: '🔴',
  claude: '🟣',
};

const presetColors: Record<string, string> = {
  dashscope: '#ff6b35', // Alibaba orange
  openai: '#10a37f',    // OpenAI green
  gemini: '#4285f4',    // Google blue
  claude: '#d4a574',    // Anthropic beige
};

export function ProviderPresetSelector({ onSelect, onCancel }: ProviderPresetSelectorProps) {
  const presets = useSettingsStore((s) => s.presets);

  const containerStyles: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 'var(--space-md)',
  };

  const modalStyles: CSSProperties = {
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '80vh',
    overflow: 'auto',
  };

  const headerStyles: CSSProperties = {
    padding: 'var(--space-lg)',
    borderBottom: '1px solid var(--border-subtle)',
  };

  const listStyles: CSSProperties = {
    padding: 'var(--space-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  };

  const cardStyles = (presetId: string): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    borderLeft: `3px solid ${presetColors[presetId] || 'var(--accent-primary)'}`,
  });

  return (
    <div style={containerStyles} onClick={onCancel}>
      <div style={modalStyles} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyles}>
          <h2 style={{ 
            fontSize: 'var(--text-xl)', 
            fontWeight: 600,
            marginBottom: 'var(--space-xs)',
          }}>
            选择 AI 服务商
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            选择一个预设配置，或自定义配置
          </p>
        </div>

        <div style={listStyles}>
          {presets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => onSelect(preset)}
              style={cardStyles(preset.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-elevated)';
                e.currentTarget.style.borderColor = 'var(--border-default)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <div style={{ fontSize: '2rem' }}>{presetIcons[preset.id] || '🤖'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                  {preset.name}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {preset.description}
                </div>
              </div>
              <div style={{ color: 'var(--text-muted)' }}>→</div>
            </div>
          ))}
        </div>

        <div style={{ 
          padding: 'var(--space-md)', 
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: 'var(--space-md) var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 'var(--text-base)',
            }}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
