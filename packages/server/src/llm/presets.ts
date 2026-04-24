import { existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { PRESET_DEFAULTS } from './preset-defaults.js';

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

interface PresetOverride {
  models?: string[];
}

function loadOverridesFromFile(): Record<string, PresetOverride> {
  const presetsPath = getPresetsPath();
  
  if (!existsSync(presetsPath)) {
    return {};
  }
  
  try {
    const content = readFileSync(presetsPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

let cachedPresets: Record<string, ProviderPreset> | null = null;
let cachedOverrides: Record<string, PresetOverride> | null = null;

function buildPresets(): Record<string, ProviderPreset> {
  const overrides = cachedOverrides ?? loadOverridesFromFile();
  const presets: Record<string, ProviderPreset> = {};
  
  for (const [id, defaults] of Object.entries(PRESET_DEFAULTS)) {
    presets[id] = {
      id,
      name: defaults.name,
      baseUrl: defaults.baseUrl,
      type: defaults.type,
      models: overrides[id]?.models ?? defaults.models,
    };
  }
  
  return presets;
}

export function getPresets(): Record<string, ProviderPreset> {
  if (!cachedPresets) {
    cachedPresets = buildPresets();
  }
  return cachedPresets;
}

export function reloadPresets(): void {
  cachedPresets = null;
  cachedOverrides = null;
}

export function getPresetById(id: string): ProviderPreset | undefined {
  return getPresets()[id];
}

export function getAllPresets(): ProviderPreset[] {
  return Object.entries(getPresets()).map(([id, preset]) => ({ ...preset, id }));
}