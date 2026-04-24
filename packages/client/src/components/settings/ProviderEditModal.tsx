import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import type { ProviderPreset, UserProvider } from '@lore/shared';
import './provider-edit-modal.css';

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
        await updateProvider(provider.id, updates);
      } else if (currentPreset) {
        await addProvider(currentPreset.id, apiKey.trim(), selectedModels);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  if (!currentPreset) return null;

  return (
    <div className="provider-edit-modal-overlay" onClick={onClose}>
      <div className="provider-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="provider-edit-modal-header">
          <h2 className="provider-edit-modal-title">
            {isEditing ? '编辑服务商' : `添加 ${currentPreset.name}`}
          </h2>
          <p className="provider-edit-modal-desc">{currentPreset.description}</p>
        </div>

        <div className="provider-edit-modal-form">
          <div className="provider-edit-modal-field">
            <label className="provider-edit-modal-label">显示名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={currentPreset.name}
              className="provider-edit-modal-input"
            />
          </div>

          <div className="provider-edit-modal-field">
            <label className="provider-edit-modal-label">
              API Key {isEditing && '(留空保持不变)'}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={isEditing ? '••••••••••••••••' : currentPreset.apiKeyPlaceholder || 'sk-...'}
              className="provider-edit-modal-input"
            />
            <p className="provider-edit-modal-input-hint">
              你的 API Key 将被加密存储在本地数据库中
            </p>
          </div>

          <div className="provider-edit-modal-field">
            <label className="provider-edit-modal-label">
              启用模型（第一个选中的将作为默认模型）
            </label>
            <div className="provider-edit-modal-models">
              {currentPreset.defaultModels.map((model) => (
                <label
                  key={model}
                  className={`provider-edit-modal-model-item ${selectedModels.includes(model) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model)}
                    onChange={() => handleModelToggle(model)}
                    className="provider-edit-modal-model-checkbox"
                  />
                  <span className="provider-edit-modal-model-name">{model}</span>
                  {selectedModels[0] === model && (
                    <span className="provider-edit-modal-model-default">默认</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="provider-edit-modal-error">
            <div className="provider-edit-modal-error-content">{error}</div>
          </div>
        )}

        {testStatus && (
          <div className="provider-edit-modal-test-result">
            <div
              className={`provider-edit-modal-test-result-content ${testStatus.success ? 'success' : 'error'}`}
            >
              {testStatus.message}
            </div>
          </div>
        )}

        <div className="provider-edit-modal-actions">
          {isEditing && (
            <button
              onClick={handleTest}
              disabled={isLoading}
              className="provider-edit-modal-btn default"
            >
              {isLoading ? '测试中...' : '测试连接'}
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="provider-edit-modal-btn default"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="provider-edit-modal-btn primary"
          >
            {isLoading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}