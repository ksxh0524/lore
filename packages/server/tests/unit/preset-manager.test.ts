import { describe, it, expect, beforeEach } from 'vitest';
import { PresetManager, HistoricalPresetSchema, RandomWorldPresetSchema } from '../../src/presets/preset-manager.js';

describe('PresetManager', () => {
  let presetManager: PresetManager;

  beforeEach(() => {
    presetManager = new PresetManager();
  });

  describe('Get presets', () => {
    it('should return historical presets', () => {
      const presets = presetManager.getAllHistoricalPresets();
      expect(Array.isArray(presets)).toBe(true);
    });

    it('should return random presets', () => {
      const presets = presetManager.getAllRandomPresets();
      expect(Array.isArray(presets)).toBe(true);
    });

    it('should return undefined for non-existent historical preset', () => {
      const preset = presetManager.getHistoricalPreset('non-existent');
      expect(preset).toBeUndefined();
    });

    it('should return undefined for non-existent random preset', () => {
      const preset = presetManager.getRandomPreset('non-existent');
      expect(preset).toBeUndefined();
    });
  });

  describe('Preset structure', () => {
    it('should have required historical preset properties if exists', () => {
      const presets = presetManager.getAllHistoricalPresets();
      if (presets.length > 0) {
        const preset = presets[0];
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('era');
        expect(preset).toHaveProperty('description');
        expect(preset).toHaveProperty('timeRange');
        expect(preset).toHaveProperty('location');
        expect(preset).toHaveProperty('socialContext');
        expect(preset).toHaveProperty('commonOccupations');
      }
    });

    it('should have required random preset properties if exists', () => {
      const presets = presetManager.getAllRandomPresets();
      if (presets.length > 0) {
        const preset = presets[0];
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('era');
        expect(preset).toHaveProperty('description');
        expect(preset).toHaveProperty('location');
        expect(preset).toHaveProperty('socialContext');
      }
    });

    it('should have socialContext with required fields', () => {
      const presets = presetManager.getAllHistoricalPresets();
      if (presets.length > 0) {
        const preset = presets[0];
        expect(preset.socialContext).toHaveProperty('politics');
        expect(preset.socialContext).toHaveProperty('economy');
        expect(preset.socialContext).toHaveProperty('culture');
        expect(preset.socialContext).toHaveProperty('technology');
      }
    });

    it('should have notableFigures array', () => {
      const presets = presetManager.getAllHistoricalPresets();
      if (presets.length > 0) {
        const preset = presets[0];
        expect(Array.isArray(preset.notableFigures)).toBe(true);
      }
    });

    it('should have dailyLife with required fields', () => {
      const presets = presetManager.getAllHistoricalPresets();
      if (presets.length > 0) {
        const preset = presets[0];
        expect(preset.dailyLife).toHaveProperty('schedule');
        expect(preset.dailyLife).toHaveProperty('challenges');
        expect(preset.dailyLife).toHaveProperty('opportunities');
      }
    });

    it('should have currency', () => {
      const presets = presetManager.getAllHistoricalPresets();
      if (presets.length > 0) {
        const preset = presets[0];
        expect(preset.currency).toHaveProperty('name');
        expect(preset.currency).toHaveProperty('relativeValue');
      }
    });
  });

  describe('Search presets', () => {
    it('should search presets', () => {
      const result = presetManager.searchPresets('test');
      expect(result).toHaveProperty('historical');
      expect(result).toHaveProperty('random');
      expect(Array.isArray(result.historical)).toBe(true);
      expect(Array.isArray(result.random)).toBe(true);
    });
  });

  describe('Schema validation', () => {
    it('should validate historical preset schema', () => {
      const validPreset = {
        id: 'test',
        name: 'Test',
        era: 'Test Era',
        description: 'Test description',
        timeRange: { start: '100', end: '200' },
        location: 'Test location',
        socialContext: {
          politics: 'test',
          economy: 'test',
          culture: 'test',
          technology: 'test',
        },
        notableFigures: [{
          name: 'Test Figure',
          role: 'Test role',
          personality: 'test',
          background: 'test',
          occupation: 'test',
          ageAtStart: 30,
          importance: 'major',
        }],
        commonOccupations: ['test'],
        commonEvents: [{
          year: 100,
          type: 'political',
          description: 'test',
          impact: 'test',
        }],
        dailyLife: {
          schedule: [],
          challenges: [],
          opportunities: [],
        },
        currency: {
          name: 'test',
          relativeValue: 1,
        },
      };

      const result = HistoricalPresetSchema.safeParse(validPreset);
      expect(result.success).toBe(true);
    });

    it('should reject invalid historical preset', () => {
      const invalidPreset = {
        id: 'test',
        name: 'Test',
      };

      const result = HistoricalPresetSchema.safeParse(invalidPreset);
      expect(result.success).toBe(false);
    });

    it('should validate random preset schema', () => {
      const validPreset = {
        id: 'test',
        name: 'Test',
        location: 'Test location',
        era: 'modern',
        description: 'Test description',
        socialContext: {
          politics: 'test',
          economy: 'test',
          culture: 'test',
          technology: 'test',
        },
        commonOccupations: ['test'],
        commonEvents: [{
          type: 'social',
          description: 'test',
          probability: 0.5,
          impact: 'test',
        }],
        dailyLife: {
          schedule: [],
          challenges: [],
          opportunities: [],
        },
        currency: {
          name: 'test',
          relativeValue: 1,
        },
        demographics: {
          ageRange: { min: 18, max: 65 },
        },
      };

      const result = RandomWorldPresetSchema.safeParse(validPreset);
      expect(result.success).toBe(true);
    });

    it('should reject invalid random preset', () => {
      const invalidPreset = {
        id: 'test',
        era: 'invalid-era',
      };

      const result = RandomWorldPresetSchema.safeParse(invalidPreset);
      expect(result.success).toBe(false);
    });
  });

  describe('Notable figures', () => {
    it('should have notable figure with required fields if exists', () => {
      const presets = presetManager.getAllHistoricalPresets();
      if (presets.length > 0 && presets[0].notableFigures.length > 0) {
        const figure = presets[0].notableFigures[0];
        expect(figure).toHaveProperty('name');
        expect(figure).toHaveProperty('role');
        expect(figure).toHaveProperty('personality');
        expect(figure).toHaveProperty('occupation');
        expect(figure).toHaveProperty('ageAtStart');
        expect(figure).toHaveProperty('importance');
      }
    });
  });
});