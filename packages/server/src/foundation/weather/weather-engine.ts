import type { Season } from '../astronomy/astronomy-engine.js';
import type { ClimateZone } from '../geography/geography-db.js';
import { createLogger } from '../../logger/index.js';

const logger = createLogger('weather-engine');

export type WeatherState = 'sunny' | 'cloudy' | 'partly_cloudy' | 'rainy' | 'heavy_rain' | 'snowy' | 'heavy_snow' | 'foggy' | 'stormy' | 'windy';

export interface WeatherCondition {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  cloudCover: number;
  state: WeatherState;
  description: string;
  feelsLike: number;
}

export interface WeatherForecast {
  date: Date;
  condition: WeatherCondition;
}

const WEATHER_DESCRIPTIONS: Record<WeatherState, string[]> = {
  sunny: ['今天阳光明媚', '天气晴朗', '万里无云', '阳光灿烂'],
  cloudy: ['天空多云', '阴天', '云层较厚', '天空灰蒙蒙'],
  partly_cloudy: ['多云天气', '偶尔有阳光', '云层时聚时散'],
  rainy: ['下雨了', '有小雨', '正在下雨', '雨声淅沥'],
  heavy_rain: ['大雨倾盆', '暴雨来袭', '雨势很大'],
  snowy: ['下雪了', '飘起了雪花', '小雪纷飞'],
  heavy_snow: ['大雪纷飞', '暴雪来袭', '雪很大'],
  foggy: ['有雾', '雾气较重', '能见度低', '晨雾弥漫'],
  stormy: ['暴风雨', '雷电交加', '狂风暴雨'],
  windy: ['风力较大', '大风天气', '狂风呼啸'],
};

const SEASON_ADJUSTMENTS: Record<Season, { tempAdjust: number; precipAdjust: number }> = {
  spring: { tempAdjust: 0, precipAdjust: 0.1 },
  summer: { tempAdjust: 5, precipAdjust: 0.2 },
  autumn: { tempAdjust: -2, precipAdjust: 0.1 },
  winter: { tempAdjust: -10, precipAdjust: 0 },
};

export class WeatherEngine {
  private lastWeather: Map<string, WeatherCondition> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();
  private randomSeed: number = Date.now();

  generateWeather(
    climateZone: ClimateZone,
    season: Season,
    lat: number,
    elevation: number = 0,
    cityId: string,
  ): WeatherCondition {
    const tempRange = climateZone.tempRange[season === 'summer' ? 'summer' : 'winter'];
    const seasonAdj = SEASON_ADJUSTMENTS[season] || { tempAdjust: 0, precipAdjust: 0 };

    let baseTemp = this.randomInRange(tempRange[0], tempRange[1]);
    baseTemp += seasonAdj.tempAdjust;
    baseTemp -= elevation * 0.6;

    const humidity = this.calculateHumidity(climateZone, season);
    const precipProbability = this.calculatePrecipProbability(climateZone, season) + seasonAdj.precipAdjust;
    const state = this.generateWeatherState(precipProbability, baseTemp, humidity);
    const precipitation = this.calculatePrecipitation(state, climateZone);
    const cloudCover = this.calculateCloudCover(state);
    const wind = this.generateWind();

    const feelsLike = this.calculateFeelsLike(baseTemp, humidity, wind.speed);

    const description = this.generateDescription(state, baseTemp, humidity);

    const condition: WeatherCondition = {
      temperature: Math.round(baseTemp),
      humidity: Math.round(humidity),
      windSpeed: wind.speed,
      windDirection: wind.direction,
      precipitation,
      cloudCover,
      state,
      description,
      feelsLike: Math.round(feelsLike),
    };

    this.lastWeather.set(cityId, condition);
    this.lastUpdateTime.set(cityId, Date.now());

    logger.debug({
      cityId,
      temp: condition.temperature,
      state: condition.state,
      season,
    }, 'Weather generated');

    return condition;
  }

  private randomInRange(min: number, max: number): number {
    this.randomSeed = (this.randomSeed * 9301 + 49297) % 233280;
    const random = this.randomSeed / 233280;
    return min + random * (max - min);
  }

  private calculateHumidity(climateZone: ClimateZone, season: Season): number {
    const baseHumidity = {
      'very_low': 30,
      'low': 40,
      'moderate': 50,
      'high': 70,
      'very_high': 85,
    };

    let humidity = baseHumidity[climateZone.precipitation] || 50;

    if (season === 'summer') humidity += 10;
    if (season === 'winter') humidity -= 5;

    return Math.max(20, Math.min(95, humidity + this.randomInRange(-10, 10)));
  }

  private calculatePrecipProbability(climateZone: ClimateZone, season: Season): number {
    const baseProbability = {
      'very_low': 0.05,
      'low': 0.15,
      'moderate': 0.25,
      'high': 0.45,
      'very_high': 0.6,
    };

    let probability = baseProbability[climateZone.precipitation] || 0.25;

    if (climateZone.seasons === 'wet_dry') {
      if (season === 'summer') probability += 0.2;
      if (season === 'winter') probability -= 0.3;
    }

    return Math.max(0, Math.min(0.8, probability));
  }

  private generateWeatherState(precipProbability: number, temp: number, humidity: number): WeatherState {
    const random = this.randomInRange(0, 1);

    if (random < precipProbability * 0.3 && temp < 0) {
      return random < 0.1 ? 'heavy_snow' : 'snowy';
    }

    if (random < precipProbability) {
      if (humidity > 80) {
        return random < precipProbability * 0.1 ? 'heavy_rain' : 'stormy';
      }
      return random < precipProbability * 0.2 ? 'heavy_rain' : 'rainy';
    }

    if (humidity > 90 && temp < 15) {
      return 'foggy';
    }

    if (random > 0.95) {
      return 'windy';
    }

    if (random > 0.7) {
      return 'cloudy';
    }

    if (random > 0.5) {
      return 'partly_cloudy';
    }

    return 'sunny';
  }

  private calculatePrecipitation(state: WeatherState, climateZone: ClimateZone): number {
    const basePrecip = {
      sunny: 0,
      cloudy: 0,
      partly_cloudy: 0,
      windy: 0,
      foggy: 0,
      rainy: 5,
      heavy_rain: 15,
      snowy: 3,
      heavy_snow: 10,
      stormy: 20,
    };

    let precip = basePrecip[state] || 0;

    if (climateZone.precipitation === 'high' || climateZone.precipitation === 'very_high') {
      precip *= 1.5;
    }

    return Math.round(precip + this.randomInRange(-2, 2));
  }

  private calculateCloudCover(state: WeatherState): number {
    const baseCover = {
      sunny: 10,
      partly_cloudy: 40,
      cloudy: 80,
      rainy: 90,
      heavy_rain: 95,
      snowy: 85,
      heavy_snow: 95,
      foggy: 100,
      stormy: 100,
      windy: 30,
    };

    return baseCover[state] || 50;
  }

  private generateWind(): { speed: number; direction: string } {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const speed = Math.round(this.randomInRange(0, 30));
    const directionIndex = Math.floor(this.randomInRange(0, 8));
    const direction = directions[directionIndex >= 0 && directionIndex < directions.length ? directionIndex : 0] || 'N';

    return { speed, direction };
  }

  private calculateFeelsLike(temp: number, humidity: number, windSpeed: number): number {
    let feelsLike = temp;

    if (temp > 27 && humidity > 60) {
      feelsLike += (humidity - 60) * 0.1;
    }

    if (temp < 10 && windSpeed > 5) {
      feelsLike -= windSpeed * 0.3;
    }

    return feelsLike;
  }

  private generateDescription(state: WeatherState, temp: number, humidity: number): string {
    const templates = WEATHER_DESCRIPTIONS[state];
    if (!templates || templates.length === 0) {
      return `气温${Math.round(temp)}°C`;
    }

    const base = templates[Math.floor(this.randomInRange(0, templates.length))] || templates[0]!;
    const tempDesc = `气温${Math.round(temp)}°C`;

    if (humidity > 80 && state !== 'rainy' && state !== 'foggy') {
      return `${base}，${tempDesc}，空气潮湿`;
    }

    return `${base}，${tempDesc}`;
  }

  getLastWeather(cityId: string): WeatherCondition | undefined {
    return this.lastWeather.get(cityId);
  }

  getWeatherAge(cityId: string): number {
    const lastTime = this.lastUpdateTime.get(cityId);
    if (!lastTime) return Infinity;
    return Date.now() - lastTime;
  }

  shouldUpdate(cityId: string, maxAgeMs: number = 3600000): boolean {
    return this.getWeatherAge(cityId) > maxAgeMs;
  }

  generateForecast(
    climateZone: ClimateZone,
    season: Season,
    lat: number,
    elevation: number,
    cityId: string,
    days: number,
  ): WeatherForecast[] {
    const forecast: WeatherForecast[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const condition = this.generateWeather(climateZone, season, lat, elevation, `${cityId}-forecast-${i}`);
      forecast.push({ date, condition });
    }

    return forecast;
  }

  generateExtremeWeather(
    climateZone: ClimateZone,
    season: Season,
    cityId: string,
  ): WeatherCondition | null {
    const probability = 0.01;

    if (this.randomInRange(0, 1) > probability) {
      return null;
    }

    const extremeTypes: WeatherState[] = ['stormy', 'heavy_rain', 'heavy_snow', 'foggy'];
    const state = extremeTypes[Math.floor(this.randomInRange(0, extremeTypes.length))] || 'stormy';

    const condition = this.generateWeather(climateZone, season, 0, 0, `${cityId}-extreme`);
    condition.state = state;
    condition.description = `极端天气：${WEATHER_DESCRIPTIONS[state]?.[0] || state}`;

    logger.warn({
      cityId,
      extremeType: state,
      season,
    }, 'Extreme weather generated');

    return condition;
  }

  clear(): void {
    this.lastWeather.clear();
    this.lastUpdateTime.clear();
  }
}