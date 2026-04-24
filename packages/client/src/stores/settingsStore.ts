import { create } from 'zustand';
import type { ProviderPreset, UserProvider } from '@lore/shared';
import { providerApi } from '../services/api';

interface SettingsState {
  // Provider settings
  presets: ProviderPreset[];
  providers: UserProvider[];
  selectedProviderId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
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
      const { data } = await providerApi.getPresets();
      set({ presets: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load presets' });
    }
  },

  loadProviders: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await providerApi.getProviders();
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
      
      const defaultModel = preset.defaultModels[0] ?? '';
      const enabledModels = models?.length ? models.filter((m): m is string => !!m) : [defaultModel];
      
      const result = await providerApi.createProvider({
        presetId,
        name: preset.name,
        apiKey,
        models: enabledModels,
        defaultModel: enabledModels[0],
      });
      
      if (!result.data?.id) throw new Error('Failed to create provider');
      await get().loadProviders();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to add provider', isLoading: false });
      throw err;
    }
  },

  updateProvider: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await providerApi.updateProvider(id, updates);
      await get().loadProviders();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update provider', isLoading: false });
      throw err;
    }
  },

  deleteProvider: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await providerApi.deleteProvider(id);
      await get().loadProviders();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete provider', isLoading: false });
      throw err;
    }
  },

  testProvider: async (id) => {
    try {
      const { data } = await providerApi.testProvider(id);
      return { success: data.success, message: data.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test failed';
      return { success: false, message };
    }
  },

  setSelectedProvider: (id) => set({ selectedProviderId: id }),
  
  clearError: () => set({ error: null }),
}));
