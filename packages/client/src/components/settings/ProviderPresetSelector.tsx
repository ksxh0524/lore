import { ChevronRight, Sparkles, Brain, CircleDot, Bot, type LucideIcon } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import type { ProviderPreset } from '@lore/shared';
import './provider-preset-selector.css';

interface ProviderPresetSelectorProps {
  onSelect: (preset: ProviderPreset) => void;
  onCancel: () => void;
}

const presetIcons: Record<string, LucideIcon> = {
  dashscope: Sparkles,
  openai: Brain,
  gemini: CircleDot,
  claude: Bot,
};

const presetColors: Record<string, string> = {
  dashscope: '#ff6b35',
  openai: '#10a37f',
  gemini: '#4285f4',
  claude: '#d4a574',
};

export function ProviderPresetSelector({ onSelect, onCancel }: ProviderPresetSelectorProps) {
  const presets = useSettingsStore((s) => s.presets);

  return (
    <div className="provider-preset-selector-overlay" onClick={onCancel}>
      <div className="provider-preset-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="provider-preset-selector-header">
          <h2 className="provider-preset-selector-title">选择 AI 服务商</h2>
          <p className="provider-preset-selector-desc">选择一个预设配置，或自定义配置</p>
        </div>

        <div className="provider-preset-selector-list">
          {presets.map((preset) => {
            const IconComponent = presetIcons[preset.id] || Bot;
            const presetColor = presetColors[preset.id] || 'var(--accent-primary)';
            return (
              <div
                key={preset.id}
                onClick={() => onSelect(preset)}
                className="provider-preset-selector-item"
                style={{ borderLeftColor: presetColor }}
              >
                <div className="provider-preset-selector-item-icon">
                  <IconComponent style={{ color: presetColor }} />
                </div>
                <div className="provider-preset-selector-item-content">
                  <div className="provider-preset-selector-item-name">{preset.name}</div>
                  <div className="provider-preset-selector-item-desc">{preset.baseUrl}</div>
                </div>
                <ChevronRight className="provider-preset-selector-item-arrow" />
              </div>
            );
          })}
        </div>

        <div className="provider-preset-selector-footer">
          <button onClick={onCancel} className="provider-preset-selector-cancel-btn">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}