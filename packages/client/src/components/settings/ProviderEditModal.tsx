import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { providerApi } from '../../services/api';
import type { ProviderPreset, UserProvider } from '@lore/shared';
import { RefreshCw, Plus, X, Loader2, Zap } from 'lucide-react';
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
  const [models, setModels] = useState<string[]>(provider?.models || []);
  const [customModel, setCustomModel] = useState('');
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing && currentPreset?.models?.length) {
      setAvailableModels(currentPreset.models);
    }
  }, [currentPreset, isEditing]);

  const handleFetchModels = async () => {
    if (!apiKey || !currentPreset) return;
    
    setFetchingModels(true);
    setError(null);
    
    try {
      const result = await providerApi.fetchModels(currentPreset.id, apiKey);
      setAvailableModels(result.data.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取模型失败');
    } finally {
      setFetchingModels(false);
    }
  };

  const handleAddModel = (model: string) => {
    if (!model || models.includes(model)) return;
    setModels([...models, model]);
  };

  const handleRemoveModel = (model: string) => {
    if (models.length <= 1) {
      setError('至少保留一个模型');
      return;
    }
    setModels(models.filter(m => m !== model));
  };

  const handleAddCustomModel = () => {
    if (!customModel.trim()) return;
    handleAddModel(customModel.trim());
    setCustomModel('');
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

    if (models.length === 0) {
      setError('请至少添加一个模型');
      return;
    }

    try {
      if (isEditing && provider) {
        await updateProvider(provider.id, { name: name.trim(), models, defaultModel: models[0] });
      } else if (currentPreset) {
        await addProvider(currentPreset.id, apiKey.trim(), models);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  if (!currentPreset) return null;

  const isDynamic = currentPreset.dynamicModels !== false;
  const fixedModels = currentPreset.models || [];
  const allModels = isDynamic ? availableModels : fixedModels;

  return (
    <div className="provider-edit-modal-overlay" onClick={onClose}>
      <div className="provider-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="provider-edit-modal-header">
          <h2 className="provider-edit-modal-title">
            {isEditing ? '编辑服务商' : `添加 ${currentPreset.name}`}
          </h2>
          <p className="provider-edit-modal-desc">{currentPreset.baseUrl}</p>
          {!isDynamic && (
            <div className="provider-edit-modal-plan-badge">
              <Zap size={14} />
              <span>订阅套餐 · 模型固定</span>
            </div>
          )}
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
            <div className="provider-edit-modal-input-group">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isEditing ? '••••••••••••••••' : 'sk-...'}
                className="provider-edit-modal-input"
              />
              {isDynamic && !isEditing && (
                <button
                  type="button"
                  onClick={handleFetchModels}
                  disabled={!apiKey || fetchingModels}
                  className="provider-edit-modal-fetch-btn"
                >
                  {fetchingModels ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                  <span>获取模型</span>
                </button>
              )}
            </div>
            <p className="provider-edit-modal-input-hint">
              {isDynamic 
                ? '输入 API Key 后点击"获取模型"自动加载可用模型'
                : '订阅套餐模型列表固定，直接选择即可'}
            </p>
          </div>

          <div className="provider-edit-modal-field">
            <label className="provider-edit-modal-label">已选模型</label>
            
            {models.length > 0 ? (
              <div className="provider-edit-modal-selected-models">
                {models.map((model, index) => (
                  <div key={model} className="provider-edit-modal-selected-model">
                    <span className="provider-edit-modal-model-name">{model}</span>
                    {index === 0 && <span className="provider-edit-modal-model-default-badge">默认</span>}
                    <button
                      type="button"
                      onClick={() => handleRemoveModel(model)}
                      className="provider-edit-modal-remove-model-btn"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="provider-edit-modal-no-models">
                点击下方模型添加
              </div>
            )}

            {!isEditing && allModels.length > 0 && (
              <div className="provider-edit-modal-available-section">
                <div className="provider-edit-modal-available-header">
                  {isDynamic ? '可用模型（从 API 获取）' : '套餐模型'}
                </div>
                <div className="provider-edit-modal-available-models">
                  {allModels.filter(m => !models.includes(m)).map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => handleAddModel(model)}
                      className="provider-edit-modal-available-model"
                    >
                      <Plus size={14} />
                      <span>{model}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isDynamic && (
              <div className="provider-edit-modal-custom-section">
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="手动输入其他模型名称..."
                  className="provider-edit-modal-input"
                />
                <button
                  type="button"
                  onClick={handleAddCustomModel}
                  disabled={!customModel.trim()}
                  className="provider-edit-modal-add-custom-btn"
                >
                  添加
                </button>
              </div>
            )}
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
            disabled={isLoading || models.length === 0}
            className="provider-edit-modal-btn primary"
          >
            {isLoading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}