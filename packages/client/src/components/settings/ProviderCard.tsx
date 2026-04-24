import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  CircleDot,
  Brain,
  Sparkles,
  Bot,
  type LucideIcon
} from 'lucide-react';
import type { UserProvider } from '@lore/shared';
import './provider-card.css';

interface ProviderCardProps {
  provider: UserProvider;
  onEdit: () => void;
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

export function ProviderCard({ provider, onEdit }: ProviderCardProps) {
  const { deleteProvider, testProvider } = useSettingsStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    setTestStatus(null);
    const result = await testProvider(provider.id);
    setTestStatus(result);
    setIsTesting(false);
  };

  const handleDelete = async () => {
    if (!confirm(`确定要删除 "${provider.name}" 吗？`)) return;
    setIsDeleting(true);
    try {
      await deleteProvider(provider.id);
    } catch {
      setIsDeleting(false);
    }
  };

  const IconComponent = presetIcons[provider.presetId] || Bot;
  const presetColor = presetColors[provider.presetId] || 'var(--accent-primary)';

  return (
    <div className="provider-card">
      <div className="provider-card-header">
        <div
          className="provider-card-icon"
          style={{
            background: `${presetColor}20`,
            borderColor: presetColor,
          }}
        >
          <IconComponent style={{ color: presetColor }} />
        </div>
        <div className="provider-card-info">
          <div className="provider-card-name-row">
            <span className="provider-card-name">{provider.name}</span>
            <span
              className={`provider-card-status-dot ${provider.enabled ? 'enabled' : 'disabled'}`}
            />
          </div>
          <div className="provider-card-status-text">
            {provider.enabled ? '已启用' : '已禁用'}
          </div>
        </div>
      </div>

      <div className="provider-card-models">
        <div className="provider-card-models-header">
          已启用模型 ({provider.models.length})
        </div>
        <div className="provider-card-models-list">
          {provider.models.map((model) => (
            <span
              key={model}
              className={`provider-card-model-tag ${model === provider.defaultModel ? 'default' : 'other'}`}
            >
              {model}
              {model === provider.defaultModel && ' ★'}
            </span>
          ))}
        </div>
      </div>

      {testStatus && (
        <div
          className={`provider-card-test-result ${testStatus.success ? 'success' : 'error'}`}
        >
          {testStatus.message}
        </div>
      )}

      <div className="provider-card-actions">
        <button
          onClick={handleTest}
          disabled={isTesting}
          className="provider-card-action-btn default"
        >
          {isTesting ? '测试中...' : '测试'}
        </button>
        <button onClick={onEdit} className="provider-card-action-btn default">
          编辑
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="provider-card-action-btn danger"
        >
          {isDeleting ? '删除中...' : '删除'}
        </button>
      </div>
    </div>
  );
}