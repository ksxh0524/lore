import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  type: 'openai' | 'anthropic';
  models?: string[];
}

function getPresetsPath(): string {
  const dataDir = process.env.LORE_DATA_DIR || join(homedir(), '.lore');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return join(dataDir, 'presets.json');
}

function loadPresetsFromFile(): Record<string, ProviderPreset> {
  const presetsPath = getPresetsPath();
  
  if (!existsSync(presetsPath)) {
    return {};
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
        models: p.models,
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
  return Object.entries(getPresets()).map(([id, preset]) => ({ id, ...preset }));
}