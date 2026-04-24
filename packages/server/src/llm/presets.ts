import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  type: 'openai' | 'anthropic';
}

function getPresetsPath(): string {
  const dataDir = process.env.LORE_DATA_DIR || join(homedir(), '.lore');
  return join(dataDir, 'presets.json');
}

function loadPresetsFromFile(): Record<string, ProviderPreset> {
  const presetsPath = getPresetsPath();
  
  if (!existsSync(presetsPath)) {
    const defaultPresets: Record<string, ProviderPreset> = {
      dashscope: {
        id: 'dashscope',
        name: '阿里云百炼 (通用)',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        type: 'openai',
      },
      'dashscope-coding': {
        id: 'dashscope-coding',
        name: '阿里云百炼 (Coding Plan)',
        baseUrl: 'https://coding.dashscope.aliyuncs.com/v1',
        type: 'openai',
      },
      openai: {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        type: 'openai',
      },
      gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        type: 'openai',
      },
      claude: {
        id: 'claude',
        name: 'Anthropic Claude',
        baseUrl: 'https://api.anthropic.com/v1',
        type: 'anthropic',
      },
    };
    
    writeFileSync(presetsPath, JSON.stringify(defaultPresets, null, 2));
    return defaultPresets;
  }
  
  try {
    const content = readFileSync(presetsPath, 'utf-8');
    const parsed = JSON.parse(content);
    
    const presets: Record<string, ProviderPreset> = {};
    for (const [id, preset] of Object.entries(parsed)) {
      presets[id] = {
        id,
        ...(preset as Omit<ProviderPreset, 'id'>),
      };
    }
    
    return presets;
  } catch {
    return {};
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
  writeFileSync(presetsPath, JSON.stringify(presets, null, 2));
  cachedPresets = presets;
}

export function addPreset(preset: ProviderPreset): void {
  const presets = getPresets();
  presets[preset.id] = preset;
  savePresets(presets);
}

export function removePreset(id: string): void {
  const presets = getPresets();
  delete presets[id];
  savePresets(presets);
}