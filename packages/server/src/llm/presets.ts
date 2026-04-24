import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  type: 'openai' | 'anthropic';
  dynamicModels: boolean;
  models?: string[];
}

function getPresetsPath(): string {
  const dataDir = process.env.LORE_DATA_DIR || join(homedir(), '.lore');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return join(dataDir, 'presets.json');
}

function getDefaultPresets(): Record<string, ProviderPreset> {
  return {
    dashscope: {
      id: 'dashscope',
      name: '阿里云百炼 (通用)',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      type: 'openai',
      dynamicModels: true,
    },
    'dashscope-coding': {
      id: 'dashscope-coding',
      name: '阿里云百炼 (Coding Plan)',
      baseUrl: 'https://coding.dashscope.aliyuncs.com/v1',
      type: 'openai',
      dynamicModels: false,
      models: [
        'qwen3.5-plus',
        'qwen3-coder-plus',
        'qwen3-coder-next',
        'glm-5',
        'glm-4.7',
        'kimi-k2.5',
        'minimax-m2.5',
      ],
    },
    openai: {
      id: 'openai',
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      type: 'openai',
      dynamicModels: true,
    },
    gemini: {
      id: 'gemini',
      name: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      type: 'openai',
      dynamicModels: true,
    },
    claude: {
      id: 'claude',
      name: 'Anthropic Claude',
      baseUrl: 'https://api.anthropic.com/v1',
      type: 'anthropic',
      dynamicModels: false,
      models: [
        'claude-sonnet-4-20250514',
        'claude-opus-4-20250514',
        'claude-3-5-sonnet-20241022',
      ],
    },
  };
}

function loadPresetsFromFile(): Record<string, ProviderPreset> {
  const presetsPath = getPresetsPath();
  
  if (!existsSync(presetsPath)) {
    const defaultPresets = getDefaultPresets();
    writeFileSync(presetsPath, JSON.stringify(defaultPresets, null, 2));
    return defaultPresets;
  }
  
  try {
    const content = readFileSync(presetsPath, 'utf-8');
    const parsed = JSON.parse(content);
    
    const presets: Record<string, ProviderPreset> = {};
    for (const [id, preset] of Object.entries(parsed)) {
      const p = preset as any;
      presets[id] = {
        id,
        name: p.name || id,
        baseUrl: p.baseUrl || '',
        type: p.type || 'openai',
        dynamicModels: p.dynamicModels !== false,
        models: p.models,
      };
    }
    
    return presets;
  } catch {
    const defaultPresets = getDefaultPresets();
    writeFileSync(presetsPath, JSON.stringify(defaultPresets, null, 2));
    return defaultPresets;
  }
}

let cachedPresets: Record<string, ProviderPreset> | null = null;

export function getPresets(): Record<string, ProviderPreset> {
  if (!cachedPresets) {
    cachedPresets = loadPresetsFromFile();
  }
  return cachedPresets;
}

export function reloadPresets(): void {
  cachedPresets = null;
}

export function getPresetById(id: string): ProviderPreset | undefined {
  return getPresets()[id];
}

export function getAllPresets(): ProviderPreset[] {
  return Object.entries(getPresets()).map(([id, preset]) => ({
    id,
    ...preset,
  }));
}

export function savePresets(presets: Record<string, ProviderPreset>): void {
  const presetsPath = getPresetsPath();
  const toSave: Record<string, any> = {};
  for (const [id, preset] of Object.entries(presets)) {
    toSave[id] = {
      name: preset.name,
      baseUrl: preset.baseUrl,
      type: preset.type,
      dynamicModels: preset.dynamicModels,
      models: preset.models,
    };
  }
  writeFileSync(presetsPath, JSON.stringify(toSave, null, 2));
  cachedPresets = presets;
}