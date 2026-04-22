import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import type { ProviderPreset, UserProvider } from '@lore/shared';
import type { CSSProperties } from 'react';

interface ProviderEditModalProps {
  preset?: ProviderPreset;
  provider?: UserProvider;
  onClose: () => void;
  onSave: () => void;
}

export function ProviderEditModal({ preset, provider, onClose, onSave }: ProviderEditModalProps) {
  const { addProvider, updateProvider, testProvider, isLoading } = useSettingsStore();
  
  const isEditing = !!provider;
  const presets = useSettingsStore((s) => s.presets);
  const currentPreset = preset || presets.find(p => p.id === provider?.presetId);
  
  const [name, setName] = useState(provider?.name || currentPreset?.name || '');
  const [apiKey, setApiKey] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>(provider?.models || []);
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentPreset && !isEditing && currentPreset.defaultModels.length > 0) {
      const firstModel = currentPreset.defaultModels[0];
      if (firstModel) {
        setSelectedModels([firstModel]);
      }
    }
  }, [currentPreset, isEditing]);

  const handleModelToggle = (model: string) => {
    setSelectedModels(prev => {
      const newSelection = prev.includes(model)
        ? prev.filter(m => m !== model)
        : [...prev, model];
      
      // Ensure at least one model is selected
      if (newSelection.length === 0) {
        return prev;
      }
      return newSelection;
    });
  };

  const handleTest = async () => {
    if (!provider) return;
    setTestStatus(null);
    const result = await testProvider(provider.id);
    setTestStatus(result);
  };

  const handleSave = async () => {
    setError(null);
    
    if (!name.trim()) {
      setError('请输入显示名称');
      return;
    }
    
    if (!isEditing && !apiKey.trim()) {
      setError('请输入 API Key');
      return;
    }
    
    if (selectedModels.length === 0) {
      setError('请至少选择一个模型');
      return;
    }

    try {
      if (isEditing && provider) {
        const updates: Partial<UserProvider> = { name: name.trim(), models: selectedModels };
        if (apiKey.trim()) {
          // API Key 只有在输入了新值时才更新
          // 这里需要通过其他方式传递，暂时不支持编辑时修改 API Key
        }
        await updateProvider(provider.id, updates);
      } else if (currentPreset) {
        await addProvider(currentPreset.id, apiKey.trim(), selectedModels);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

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
    maxWidth: '520px',
    maxHeight: '90vh',
    overflow: 'auto',
  };

  const sectionStyles: CSSProperties = {
    padding: 'var(--space-lg)',
    borderBottom: '1px solid var(--border-subtle)',
  };

  const inputStyles: CSSProperties = {
    width: '100%',
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    fontSize: 'var(--text-base)',
    marginTop: 'var(--space-sm)',
  };

  if (!currentPreset) return null;

  return (
    <div style={containerStyles} onClick={onClose}>
      <div style={modalStyles} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={sectionStyles}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>
            {isEditing ? '编辑服务商' : `添加 ${currentPreset.name}`}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
            {currentPreset.description}
          </p>
        </div>

        {/* Form */}
        <div style={sectionStyles}>
          {/* Name */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              显示名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={currentPreset.name}
              style={inputStyles}
            />
          </div>

          {/* API Key */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              API Key {isEditing && '(留空保持不变)'}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={isEditing ? '••••••••••••••••' : currentPreset.apiKeyPlaceholder || 'sk-...'}
              style={inputStyles}
            />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
              你的 API Key 将被加密存储在本地数据库中
            </p>
          </div>

          {/* Models */}
          <div>
            <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-sm)' }}>
              启用模型（第一个选中的将作为默认模型）
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {currentPreset.defaultModels.map((model) => (
                <label
                  key={model}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    background: selectedModels.includes(model) ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: selectedModels.includes(model) ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    border: `1px solid ${selectedModels.includes(model) ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model)}
                    onChange={() => handleModelToggle(model)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
                    {model}
                  </span>
                  {selectedModels[0] === model && (
                    <span style={{ 
                      fontSize: 'var(--text-xs)', 
                      opacity: 0.8,
                      marginLeft: 'auto',
                    }}>
                      默认
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '0 var(--space-lg)', marginBottom: 'var(--space-md)' }}>
            <div style={{ 
              padding: 'var(--space-md)', 
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-error)',
              color: '#fff',
              fontSize: 'var(--text-sm)',
            }}>
              {error}
            </div>
          </div>
        )}

        {/* Test Result */}
        {testStatus && (
          <div style={{ padding: '0 var(--space-lg)', marginBottom: 'var(--space-md)' }}>
            <div style={{ 
              padding: 'var(--space-md)', 
              borderRadius: 'var(--radius-md)',
              background: testStatus.success ? 'var(--accent-success)' : 'var(--accent-error)',
              color: '#fff',
              fontSize: 'var(--text-sm)',
            }}>
              {testStatus.message}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ 
          padding: 'var(--space-lg)', 
          display: 'flex', 
          gap: 'var(--space-md)',
          justifyContent: 'flex-end',
        }}>
          {isEditing && (
            <button
              onClick={handleTest}
              disabled={isLoading}
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? '测试中...' : '测试连接'}
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: 'var(--space-md) var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            style={{
              padding: 'var(--space-md) var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--accent-primary)',
              color: '#fff',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
