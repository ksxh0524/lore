import { describe, it, expect, beforeEach } from 'vitest';
import { WeatherEngine, type WeatherState } from '../../src/foundation/weather/weather-engine.js';
import type { ClimateZone } from '../../src/foundation/geography/geography-db.js';

describe('WeatherEngine', () => {
  let engine: WeatherEngine;

  const mockClimateZone: ClimateZone = {
    id: 'temperate',
    name: '温带',
    tempRange: { summer: [20, 30], winter: [-5, 10] },
    precipitation: 'moderate',
    seasons: 'four',
  };

  beforeEach(() => {
    engine = new WeatherEngine();
  });

  describe('generateWeather', () => {
    it('should generate weather for temperate climate in summer', () => {
      const weather = engine.generateWeather(mockClimateZone, 'summer', 40, 0, 'test-city');
      
      expect(weather.temperature).toBeGreaterThanOrEqual(20);
      expect(weather.temperature).toBeLessThanOrEqual(35);
      expect(weather.humidity).toBeGreaterThanOrEqual(20);
      expect(weather.humidity).toBeLessThanOrEqual(95);
      expect(weather.description).toContain('气温');
    });

    it('should generate weather for temperate climate in winter', () => {
      const weather = engine.generateWeather(mockClimateZone, 'winter', 40, 0, 'test-city');
      
      expect(weather.temperature).toBeGreaterThanOrEqual(-15);
      expect(weather.temperature).toBeLessThanOrEqual(15);
    });

    it('should consider elevation', () => {
      const weatherLow = engine.generateWeather(mockClimateZone, 'summer', 40, 0, 'city-low');
      const weatherHigh = engine.generateWeather(mockClimateZone, 'summer', 40, 2000, 'city-high');
      
      expect(weatherHigh.temperature).toBeLessThan(weatherLow.temperature);
    });

    it('should generate valid weather states', () => {
      const validStates: WeatherState[] = ['sunny', 'cloudy', 'partly_cloudy', 'rainy', 'heavy_rain', 'snowy', 'heavy_snow', 'foggy', 'stormy', 'windy'];
      
      for (let i = 0; i < 50; i++) {
        const weather = engine.generateWeather(mockClimateZone, 'summer', 40, 0, `city-${i}`);
        expect(validStates).toContain(weather.state);
      }
    });

    it('should generate snowy weather in cold conditions', () => {
      const coldClimate: ClimateZone = {
        id: 'continental',
        name: '大陆性',
        tempRange: { summer: [20, 30], winter: [-30, -10] },
        precipitation: 'low',
        seasons: 'four',
      };

      const snowyCount = { snowy: 0, heavy_snow: 0 };
      
      for (let i = 0; i < 100; i++) {
        const weather = engine.generateWeather(coldClimate, 'winter', 50, 0, `city-${i}`);
        if (weather.state === 'snowy') snowyCount.snowy++;
        if (weather.state === 'heavy_snow') snowyCount.heavy_snow++;
      }

      expect(snowyCount.snowy + snowyCount.heavy_snow).toBeGreaterThan(0);
    });
  });

  describe('getLastWeather', () => {
    it('should cache last weather for a city', () => {
      const weather = engine.generateWeather(mockClimateZone, 'summer', 40, 0, 'test-city');
      const cached = engine.getLastWeather('test-city');
      
      expect(cached).toEqual(weather);
    });

    it('should return undefined for unknown city', () => {
      const cached = engine.getLastWeather('unknown-city');
      expect(cached).toBeUndefined();
    });
  });

  describe('shouldUpdate', () => {
    it('should return true for new city', () => {
      expect(engine.shouldUpdate('new-city')).toBe(true);
    });

    it('should return false for recently updated city', () => {
      engine.generateWeather(mockClimateZone, 'summer', 40, 0, 'test-city');
      expect(engine.shouldUpdate('test-city', 3600000)).toBe(false);
    });
  });

  describe('generateForecast', () => {
    it('should generate forecast for multiple days', () => {
      const forecast = engine.generateForecast(mockClimateZone, 'summer', 40, 0, 'test-city', 7);
      
      expect(forecast.length).toBe(7);
      expect(forecast[0]?.condition).toBeDefined();
      expect(forecast[6]?.condition).toBeDefined();
    });

    it('should have unique dates for each forecast', () => {
      const forecast = engine.generateForecast(mockClimateZone, 'summer', 40, 0, 'test-city', 3);
      
      const dates = forecast.map(f => f.date.getTime());
      expect(new Set(dates).size).toBe(3);
    });
  });

  describe('clear', () => {
    it('should clear cached weather', () => {
      engine.generateWeather(mockClimateZone, 'summer', 40, 0, 'test-city');
      engine.clear();
      
      expect(engine.getLastWeather('test-city')).toBeUndefined();
    });
  });
});