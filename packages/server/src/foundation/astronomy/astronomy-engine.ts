import { createLogger } from '../../logger/index.js';

const logger = createLogger('astronomy-engine');

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type MoonPhaseType = 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' | 'full' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent';

export interface SunriseSunsetResult {
  sunrise: Date;
  sunset: Date;
  daylightHours: number;
  isPolarDay: boolean;
  isPolarNight: boolean;
}

export interface MoonPhaseResult {
  percent: number;
  type: MoonPhaseType;
  illumination: number;
  age: number;
}

export interface SeasonResult {
  season: Season;
  dayOfSeason: number;
  daysUntilNext: number;
}

export interface AstronomyConstants {
  MOON_CYCLE_DAYS: number;
  BASE_NEW_MOON: Date;
  SPRING_DAY: number;
  SUMMER_DAY: number;
  AUTUMN_DAY: number;
  WINTER_DAY: number;
  SOLAR_DECLINATION_MAX: number;
}

const CONSTANTS: AstronomyConstants = {
  MOON_CYCLE_DAYS: 29.53,
  BASE_NEW_MOON: new Date('2000-01-06T18:00:00Z'),
  SPRING_DAY: 80,
  SUMMER_DAY: 172,
  AUTUMN_DAY: 266,
  WINTER_DAY: 355,
  SOLAR_DECLINATION_MAX: 23.45,
};

export class AstronomyEngine {
  private constants: AstronomyConstants;

  constructor(constants?: Partial<AstronomyConstants>) {
    this.constants = { ...CONSTANTS, ...constants };
  }

  getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  getSeason(date: Date, lat: number): SeasonResult {
    const dayOfYear = this.getDayOfYear(date);
    const season = this.calculateSeason(dayOfYear, lat);
    const dayOfSeason = this.calculateDayOfSeason(dayOfYear, lat);
    const daysUntilNext = this.calculateDaysUntilNextSeason(dayOfYear, lat);

    return { season, dayOfSeason, daysUntilNext };
  }

  private calculateSeason(dayOfYear: number, lat: number): Season {
    if (lat >= 0) {
      if (dayOfYear >= this.constants.SPRING_DAY && dayOfYear < this.constants.SUMMER_DAY) return 'spring';
      if (dayOfYear >= this.constants.SUMMER_DAY && dayOfYear < this.constants.AUTUMN_DAY) return 'summer';
      if (dayOfYear >= this.constants.AUTUMN_DAY && dayOfYear < this.constants.WINTER_DAY) return 'autumn';
      return 'winter';
    } else {
      if (dayOfYear >= this.constants.SPRING_DAY && dayOfYear < this.constants.SUMMER_DAY) return 'autumn';
      if (dayOfYear >= this.constants.SUMMER_DAY && dayOfYear < this.constants.AUTUMN_DAY) return 'winter';
      if (dayOfYear >= this.constants.AUTUMN_DAY && dayOfYear < this.constants.WINTER_DAY) return 'spring';
      return 'summer';
    }
  }

  private calculateDayOfSeason(dayOfYear: number, lat: number): number {
    const seasonStarts = lat >= 0
      ? [this.constants.WINTER_DAY, this.constants.SPRING_DAY, this.constants.SUMMER_DAY, this.constants.AUTUMN_DAY]
      : [this.constants.SUMMER_DAY, this.constants.AUTUMN_DAY, this.constants.WINTER_DAY, this.constants.SPRING_DAY];

    for (let i = 0; i < seasonStarts.length; i++) {
      const start = seasonStarts[i]!;
      const next = seasonStarts[(i + 1) % 4]!;
      const effectiveNext = next > start ? next : next + 365;
      const effectiveDay = dayOfYear < start ? dayOfYear + 365 : dayOfYear;

      if (effectiveDay >= start && effectiveDay < effectiveNext) {
        return Math.floor(effectiveDay - start);
      }
    }
    return 0;
  }

  private calculateDaysUntilNextSeason(dayOfYear: number, lat: number): number {
    const seasonStarts = lat >= 0
      ? [this.constants.SPRING_DAY, this.constants.SUMMER_DAY, this.constants.AUTUMN_DAY, this.constants.WINTER_DAY]
      : [this.constants.AUTUMN_DAY, this.constants.WINTER_DAY, this.constants.SPRING_DAY, this.constants.SUMMER_DAY];

    for (const start of seasonStarts) {
      if (dayOfYear < start) {
        return start - dayOfYear;
      }
    }
    return 365 - dayOfYear + seasonStarts[0]!;
  }

  getMoonPhase(date: Date): MoonPhaseResult {
    const baseTime = this.constants.BASE_NEW_MOON.getTime();
    const currentTime = date.getTime();
    const daysSinceBase = (currentTime - baseTime) / (1000 * 60 * 60 * 24);

    const cyclePosition = daysSinceBase % this.constants.MOON_CYCLE_DAYS;
    const age = cyclePosition < 0 ? cyclePosition + this.constants.MOON_CYCLE_DAYS : cyclePosition;
    const percent = (age / this.constants.MOON_CYCLE_DAYS) * 100;
    const illumination = (1 - Math.cos(2 * Math.PI * percent / 100)) / 2;

    const type = this.getMoonPhaseType(percent);

    return { percent, type, illumination, age };
  }

  private getMoonPhaseType(percent: number): MoonPhaseType {
    if (percent < 6.25 || percent >= 93.75) return 'new';
    if (percent >= 6.25 && percent < 25) return 'waxing_crescent';
    if (percent >= 25 && percent < 31.25) return 'first_quarter';
    if (percent >= 31.25 && percent < 50) return 'waxing_gibbous';
    if (percent >= 50 && percent < 56.25) return 'full';
    if (percent >= 56.25 && percent < 75) return 'waning_gibbous';
    if (percent >= 75 && percent < 81.25) return 'last_quarter';
    return 'waning_crescent';
  }

  getSunriseSunset(date: Date, lat: number, lng: number): SunriseSunsetResult {
    const dayOfYear = this.getDayOfYear(date);

    const declination = -this.constants.SOLAR_DECLINATION_MAX * Math.cos(
      (360 / 365) * (dayOfYear + 10) * Math.PI / 180
    );

    const latRad = lat * Math.PI / 180;
    const decRad = declination * Math.PI / 180;
    const sunAngleRad = -0.833 * Math.PI / 180;

    const cosHourAngle = (
      Math.sin(sunAngleRad) - Math.sin(latRad) * Math.sin(decRad)
    ) / (Math.cos(latRad) * Math.cos(decRad));

    if (cosHourAngle > 1) {
      return {
        sunrise: new Date(date),
        sunset: new Date(date),
        daylightHours: 0,
        isPolarDay: false,
        isPolarNight: true,
      };
    }

    if (cosHourAngle < -1) {
      return {
        sunrise: new Date(date.setHours(0, 0, 0, 0)),
        sunset: new Date(date.setHours(23, 59, 59, 999)),
        daylightHours: 24,
        isPolarDay: true,
        isPolarNight: false,
      };
    }

    const hourAngle = Math.acos(cosHourAngle) * 180 / Math.PI;
    const sunriseHour = 12 - hourAngle / 15;
    const sunsetHour = 12 + hourAngle / 15;
    const daylightHours = sunsetHour - sunriseHour;

    const timezoneOffset = lng / 15;
    const sunriseDate = this.hourToDate(sunriseHour - timezoneOffset, date);
    const sunsetDate = this.hourToDate(sunsetHour - timezoneOffset, date);

    return {
      sunrise: sunriseDate,
      sunset: sunsetDate,
      daylightHours,
      isPolarDay: false,
      isPolarNight: false,
    };
  }

  private hourToDate(hour: number, baseDate: Date): Date {
    const h = Math.floor(hour);
    const m = Math.floor((hour - h) * 60);
    const s = Math.floor(((hour - h) * 60 - m) * 60);

    const result = new Date(baseDate);
    result.setHours(h, m, s, 0);
    return result;
  }

  isDaylight(date: Date, lat: number, lng: number): boolean {
    const result = this.getSunriseSunset(date, lat, lng);
    const currentTime = date.getTime();
    return currentTime >= result.sunrise.getTime() && currentTime <= result.sunset.getTime();
  }

  getTimeOfDay(date: Date, lat: number, lng: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = date.getHours();

    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  getSolarDeclination(date: Date): number {
    const dayOfYear = this.getDayOfYear(date);
    return -this.constants.SOLAR_DECLINATION_MAX * Math.cos(
      (360 / 365) * (dayOfYear + 10) * Math.PI / 180
    );
  }

  getTideHeight(date: Date, lat: number): number {
    const moonPhase = this.getMoonPhase(date);
    const declination = this.getSolarDeclination(date);

    const moonFactor = Math.cos(2 * Math.PI * moonPhase.percent / 100);
    const sunFactor = Math.cos(declination * Math.PI / 180);
    const latFactor = Math.cos(lat * Math.PI / 180);

    const baseHeight = 1.0;
    const tidalRange = 0.5;

    return baseHeight + tidalRange * (moonFactor * 0.7 + sunFactor * 0.3) * latFactor;
  }

  getSeasonName(season: Season, lang: 'zh' | 'en' = 'zh'): string {
    const names: Record<'zh' | 'en', Record<Season, string>> = {
      zh: { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' },
      en: { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' },
    };
    return names[lang]?.[season] || season;
  }

  getMoonPhaseName(type: MoonPhaseType, lang: 'zh' | 'en' = 'zh'): string {
    const names: Record<'zh' | 'en', Record<MoonPhaseType, string>> = {
      zh: {
        new: '新月',
        waxing_crescent: '盈月',
        first_quarter: '上弦月',
        waxing_gibbous: '盈凸月',
        full: '满月',
        waning_gibbous: '亏凸月',
        last_quarter: '下弦月',
        waning_crescent: '亏月',
      },
      en: {
        new: 'New Moon',
        waxing_crescent: 'Waxing Crescent',
        first_quarter: 'First Quarter',
        waxing_gibbous: 'Waxing Gibbous',
        full: 'Full Moon',
        waning_gibbous: 'Waning Gibbous',
        last_quarter: 'Last Quarter',
        waning_crescent: 'Waning Crescent',
      },
    };
    return names[lang]?.[type] || type;
  }

  getInfo(date: Date, lat: number, lng: number): {
    dayOfYear: number;
    season: SeasonResult;
    moonPhase: MoonPhaseResult;
    sunriseSunset: SunriseSunsetResult;
    isDaylight: boolean;
    timeOfDay: string;
    tideHeight: number;
  } {
    return {
      dayOfYear: this.getDayOfYear(date),
      season: this.getSeason(date, lat),
      moonPhase: this.getMoonPhase(date),
      sunriseSunset: this.getSunriseSunset(date, lat, lng),
      isDaylight: this.isDaylight(date, lat, lng),
      timeOfDay: this.getTimeOfDay(date, lat, lng),
      tideHeight: this.getTideHeight(date, lat),
    };
  }
}