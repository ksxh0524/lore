import { create } from 'zustand';
import type { ProviderPreset, UserProvider } from '@lore/shared';
import { provider } from '../services/api';

interface SettingsState {
  presets: ProviderPreset[];
  providers: UserProvider[];
  selectedProviderId: string | null;
  isLoading: boolean;
  error: string | null;

  loadPresets: () => Promise<void>;
  loadProviders: () => Promise<void>;
  addProvider: (presetId: string, apiKey: string, models?: string[]) => Promise<void>;
  updateProvider: (id: string, updates: Partial<UserProvider>) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
  testProvider: (id: string) => Promise<{ success: boolean; message: string }>;
  setSelectedProvider: (id: string | null) => void;
  clearError: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  presets: [],
  providers: [],
  selectedProviderId: null,
  isLoading: false,
  error: null,

  loadPresets: async () => {
    try {
      const data = await provider.listPresets();
      set({ presets: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load presets' });
    }
  },

  loadProviders: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await provider.list();
      set({ providers: data, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load providers', isLoading: false });
    }
  },

  addProvider: async (presetId, apiKey, models) => {
    set({ isLoading: true, error: null });
    try {
      const preset = get().presets.find(p => p.id === presetId);
      if (!preset) throw new Error('Preset not found');

      const defaultModel = preset.models?.[0] ?? '';
      const enabledModels = models?.length ? models.filter((m): m is string => !!m) : (defaultModel ? [defaultModel] : []);

      await provider.create({
        presetId,
        name: preset.name,
        apiKey,
        models: enabledModels,
        defaultModel: enabledModels[0],
      });

      await get().loadProviders();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to add provider', isLoading: false });
      throw err;
    }
  },

  updateProvider: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await provider.update(id, updates);
      await get().loadProviders();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update provider', isLoading: false });
      throw err;
    }
  },

  deleteProvider: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await provider.delete(id);
      await get().loadProviders();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete provider', isLoading: false });
      throw err;
    }
  },

  testProvider: async (id) => {
    try {
      const data = await provider.test(id);
      return { success: data.success, message: data.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test failed';
      return { success: false, message };
    }
  },

  setSelectedProvider: (id) => set({ selectedProviderId: id }),

  clearError: () => set({ error: null }),
}));