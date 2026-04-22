import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import type { UserProvider } from '@lore/shared';
import type { CSSProperties } from 'react';

interface ProviderCardProps {
  provider: UserProvider;
  onEdit: () => void;
}

const presetIcons: Record<string, string> = {
  dashscope: '🔷',
  openai: '🔵',
  gemini: '🔴',
  claude: '🟣',
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

  const cardStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-subtle)',
    transition: 'all var(--transition-fast)',
    position: 'relative',
  };

  const headerStyles: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-md)',
    marginBottom: 'var(--space-md)',
  };

  const iconStyles: CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    background: `${presetColors[provider.presetId] || 'var(--accent-primary)'}20`,
    border: `2px solid ${presetColors[provider.presetId] || 'var(--accent-primary)'}`,
  };

  const statusColor = provider.enabled ? 'var(--accent-success)' : 'var(--text-muted)';

  return (
    <div style={cardStyles}>
      {/* Header */}
      <div style={headerStyles}>
        <div style={iconStyles}>
          {presetIcons[provider.presetId] || '🤖'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-xs)',
          }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--text-lg)' }}>
              {provider.name}
            </span>
            <span 
              style={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                background: statusColor,
                display: 'inline-block',
              }} 
            />
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {provider.enabled ? '已启用' : '已禁用'}
          </div>
        </div>
      </div>

      {/* Models */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div style={{ 
          fontSize: 'var(--text-xs)', 
          color: 'var(--text-muted)', 
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 'var(--space-xs)',
        }}>
          已启用模型 ({provider.models.length})
        </div>
        <div style={{ 
          display: 'flex', 
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
        }}>
          {provider.models.map((model) => (
            <span
              key={model}
              style={{
                padding: 'var(--space-xs) var(--space-sm)',
                borderRadius: 'var(--radius-sm)',
                background: model === provider.defaultModel ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: model === provider.defaultModel ? '#fff' : 'var(--text-secondary)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {model}
              {model === provider.defaultModel && ' ★'}
            </span>
          ))}
        </div>
      </div>

      {/* Test Result */}
      {testStatus && (
        <div style={{ 
          marginBottom: 'var(--space-md)',
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 'var(--radius-md)',
          background: testStatus.success ? 'var(--accent-success)20' : 'var(--accent-error)20',
          color: testStatus.success ? 'var(--accent-success)' : 'var(--accent-error)',
          fontSize: 'var(--text-sm)',
        }}>
          {testStatus.message}
        </div>
      )}

      {/* Actions */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--space-sm)',
        marginTop: 'auto',
      }}>
        <button
          onClick={handleTest}
          disabled={isTesting}
          style={{
            flex: 1,
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: isTesting ? 'not-allowed' : 'pointer',
            fontSize: 'var(--text-sm)',
            opacity: isTesting ? 0.6 : 1,
          }}
        >
          {isTesting ? '测试中...' : '测试'}
        </button>
        <button
          onClick={onEdit}
          style={{
            flex: 1,
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
          }}
        >
          编辑
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          style={{
            flex: 1,
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--accent-error)',
            background: 'transparent',
            color: 'var(--accent-error)',
            cursor: isDeleting ? 'not-allowed' : 'pointer',
            fontSize: 'var(--text-sm)',
            opacity: isDeleting ? 0.6 : 1,
          }}
        >
          {isDeleting ? '删除中...' : '删除'}
        </button>
      </div>
    </div>
  );
}
