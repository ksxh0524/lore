import { describe, it, expect, beforeEach } from 'vitest';
import { AstronomyEngine, type Season, type MoonPhaseType } from '../../src/foundation/astronomy/astronomy-engine.js';

describe('AstronomyEngine', () => {
  let engine: AstronomyEngine;

  beforeEach(() => {
    engine = new AstronomyEngine();
  });

  describe('getDayOfYear', () => {
    it('should return correct day for Jan 1', () => {
      const date = new Date('2024-01-01');
      expect(engine.getDayOfYear(date)).toBe(1);
    });

    it('should return correct day for Dec 31 (leap year)', () => {
      const date = new Date('2024-12-31');
      expect(engine.getDayOfYear(date)).toBe(366);
    });

    it('should return 365 for Dec 31 in non-leap year', () => {
      const date = new Date('2023-12-31');
      expect(engine.getDayOfYear(date)).toBe(365);
    });

    it('should handle leap year', () => {
      const date = new Date('2024-02-29');
      expect(engine.getDayOfYear(date)).toBe(60);
    });
  });

  describe('getSeason', () => {
    it('should return spring for March in northern hemisphere', () => {
      const date = new Date('2024-03-21');
      const result = engine.getSeason(date, 40);
      expect(result.season).toBe('spring');
    });

    it('should return summer for July in northern hemisphere', () => {
      const date = new Date('2024-07-01');
      const result = engine.getSeason(date, 40);
      expect(result.season).toBe('summer');
    });

    it('should return autumn for October in northern hemisphere', () => {
      const date = new Date('2024-10-01');
      const result = engine.getSeason(date, 40);
      expect(result.season).toBe('autumn');
    });

    it('should return winter for January in northern hemisphere', () => {
      const date = new Date('2024-01-15');
      const result = engine.getSeason(date, 40);
      expect(result.season).toBe('winter');
    });

    it('should return inverted seasons for southern hemisphere', () => {
      const date = new Date('2024-03-21');
      const result = engine.getSeason(date, -40);
      expect(result.season).toBe('autumn');
    });
  });

  describe('getMoonPhase', () => {
    it('should return new moon for base date', () => {
      const result = engine.getMoonPhase(new Date('2000-01-06T18:00:00Z'));
      expect(result.type).toBe('new');
      expect(result.percent).toBeCloseTo(0, 5);
    });

    it('should return full moon approximately 14-15 days after new moon', () => {
      const phases: MoonPhaseType[] = [];
      for (let i = 14; i <= 16; i++) {
        const date = new Date(Date.UTC(2000, 0, 6 + i, 18, 0, 0));
        phases.push(engine.getMoonPhase(date).type);
      }
      expect(phases).toContain('full');
    });

    it('should cycle through phases', () => {
      const phases: MoonPhaseType[] = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(2000, 0, 6 + i);
        phases.push(engine.getMoonPhase(date).type);
      }
      
      expect(phases).toContain('new');
      expect(phases).toContain('full');
      expect(phases).toContain('first_quarter');
      expect(phases).toContain('last_quarter');
    });
  });

  describe('getSunriseSunset', () => {
    it('should calculate sunrise and sunset for Shanghai', () => {
      const date = new Date('2024-06-21T12:00:00Z');
      const result = engine.getSunriseSunset(date, 31.23, 121.47);
      
      expect(result.isPolarDay).toBe(false);
      expect(result.isPolarNight).toBe(false);
      expect(result.daylightHours).toBeGreaterThan(10);
      expect(result.daylightHours).toBeLessThan(20);
    });

    it('should handle polar regions in summer', () => {
      const date = new Date('2024-06-21T12:00:00Z');
      const result = engine.getSunriseSunset(date, 80, 0);
      
      expect(result.isPolarDay).toBe(true);
      expect(result.daylightHours).toBe(24);
    });

    it('should handle polar regions in winter', () => {
      const date = new Date('2024-12-21T12:00:00Z');
      const result = engine.getSunriseSunset(date, 80, 0);
      
      expect(result.isPolarNight).toBe(true);
    });
  });

  describe('isDaylight', () => {
    it('should return true during daytime for Shanghai summer', () => {
      const noonUtc = new Date('2024-06-21T04:00:00Z');
      const result = engine.getSunriseSunset(noonUtc, 31.23, 121.47);
      const daylight = engine.isDaylight(noonUtc, 31.23, 121.47);
      expect(result.daylightHours).toBeGreaterThan(10);
    });

    it('should detect polar day correctly', () => {
      const date = new Date('2024-06-21T12:00:00Z');
      const result = engine.getSunriseSunset(date, 80, 0);
      expect(result.isPolarDay).toBe(true);
    });
  });

  describe('getTimeOfDay', () => {
    it('should return morning at 8am', () => {
      const date = new Date('2024-06-21T08:00:00');
      expect(engine.getTimeOfDay(date, 31, 121)).toBe('morning');
    });

    it('should return afternoon at 14pm', () => {
      const date = new Date('2024-06-21T14:00:00');
      expect(engine.getTimeOfDay(date, 31, 121)).toBe('afternoon');
    });

    it('should return evening at 19pm', () => {
      const date = new Date('2024-06-21T19:00:00');
      expect(engine.getTimeOfDay(date, 31, 121)).toBe('evening');
    });

    it('should return night at 2am', () => {
      const date = new Date('2024-06-21T02:00:00');
      expect(engine.getTimeOfDay(date, 31, 121)).toBe('night');
    });
  });

  describe('getSeasonName', () => {
    it('should return Chinese names', () => {
      expect(engine.getSeasonName('spring', 'zh')).toBe('春季');
      expect(engine.getSeasonName('summer', 'zh')).toBe('夏季');
      expect(engine.getSeasonName('autumn', 'zh')).toBe('秋季');
      expect(engine.getSeasonName('winter', 'zh')).toBe('冬季');
    });

    it('should return English names', () => {
      expect(engine.getSeasonName('spring', 'en')).toBe('Spring');
      expect(engine.getSeasonName('summer', 'en')).toBe('Summer');
    });
  });

  describe('getMoonPhaseName', () => {
    it('should return Chinese names', () => {
      expect(engine.getMoonPhaseName('new', 'zh')).toBe('新月');
      expect(engine.getMoonPhaseName('full', 'zh')).toBe('满月');
    });

    it('should return English names', () => {
      expect(engine.getMoonPhaseName('new', 'en')).toBe('New Moon');
      expect(engine.getMoonPhaseName('full', 'en')).toBe('Full Moon');
    });
  });
});