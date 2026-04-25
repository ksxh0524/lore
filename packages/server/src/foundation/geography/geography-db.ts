import { createLogger } from '../../logger/index.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

const logger = createLogger('geography-db');

export interface Country {
  id: string;
  name: string;
  nameEn: string;
  continent: string;
  timezone: string;
  population?: number;
  gdp?: number;
  area?: number;
}

export interface Province {
  id: string;
  countryId: string;
  name: string;
  timezone?: string;
  population?: number;
  capital?: string;
}

export interface City {
  id: string;
  provinceId: string;
  countryId: string;
  name: string;
  nameEn?: string;
  lat: number;
  lng: number;
  elevation?: number;
  timezone?: string;
  population?: number;
  climateType?: string;
  cityType?: 'capital' | 'major' | 'minor';
}

export interface TimeZone {
  id: string;
  name: string;
  offset: number;
  offsetStr: string;
}

export interface ClimateZone {
  id: string;
  name: string;
  tempRange: { summer: [number, number]; winter: [number, number] };
  precipitation: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  seasons: 'two' | 'four' | 'wet_dry';
}

const DATA_DIR = join(process.env.HOME || '~', '.lore', 'data', 'geography');
const EMBEDDED_DATA_DIR = join(process.cwd(), 'packages', 'server', 'src', 'data', 'geography');

export class GeographyDB {
  private countries: Map<string, Country> = new Map();
  private provinces: Map<string, Province> = new Map();
  private cities: Map<string, City> = new Map();
  private timezones: Map<string, TimeZone> = new Map();
  private climateZones: Map<string, ClimateZone> = new Map();
  private loaded: boolean = false;
  private userCountry: string | null = null;
  private userCity: string | null = null;

  async loadEssential(): Promise<void> {
    if (this.loaded) return;

    try {
      await this.loadCountries();
      await this.loadTimezones();
      await this.loadClimateZones();

      this.loaded = true;
      logger.info({
        countries: this.countries.size,
        timezones: this.timezones.size,
        climateZones: this.climateZones.size,
      }, 'Essential geography data loaded');
    } catch (err) {
      logger.warn({ err }, 'Failed to load external data, using embedded defaults');
      this.loadDefaultData();
    }
  }

  async loadUserCountry(countryId: string): Promise<void> {
    this.userCountry = countryId;

    try {
      await this.loadProvinces(countryId);
      await this.loadCities(countryId);

      logger.info({
        countryId,
        provinces: this.provinces.size,
        cities: this.cities.size,
      }, 'User country data loaded');
    } catch (err) {
      logger.warn({ err, countryId }, 'Failed to load country data');
    }
  }

  private async loadCountries(): Promise<void> {
    const data = await this.loadData('countries.json');
    if (data && Array.isArray(data)) {
      for (const c of data as Country[]) {
        this.countries.set(c.id, c);
      }
    }
  }

  private async loadProvinces(countryId: string): Promise<void> {
    const fileName = countryId === 'CN' ? 'provinces-china.json' : `provinces-${countryId.toLowerCase()}.json`;
    const data = await this.loadData(fileName);
    if (data && Array.isArray(data)) {
      for (const p of data as Province[]) {
        this.provinces.set(p.id, p);
      }
    }
  }

  private async loadCities(countryId: string): Promise<void> {
    const fileName = countryId === 'CN' ? 'cities-china.json' : `cities-${countryId.toLowerCase()}.json`;
    const data = await this.loadData(fileName);
    if (data && Array.isArray(data)) {
      for (const c of data as City[]) {
        this.cities.set(c.id, c);
      }
    }
  }

  private async loadTimezones(): Promise<void> {
    const data = await this.loadData('timezones.json');
    if (data && Array.isArray(data)) {
      for (const t of data as TimeZone[]) {
        this.timezones.set(t.id, t);
      }
    }
  }

  private async loadClimateZones(): Promise<void> {
    const data = await this.loadData('climate-zones.json');
    if (data && Array.isArray(data)) {
      for (const c of data as ClimateZone[]) {
        this.climateZones.set(c.id, c);
      }
    }
  }

  private async loadData(fileName: string): Promise<unknown[] | null> {
    const embeddedPath = join(EMBEDDED_DATA_DIR, fileName);
    const externalPath = join(DATA_DIR, fileName);

    try {
      const content = await readFile(embeddedPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      try {
        const content = await readFile(externalPath, 'utf-8');
        return JSON.parse(content);
      } catch {
        return null;
      }
    }
  }

  private loadDefaultData(): void {
    this.loadDefaultCountries();
    this.loadDefaultTimezones();
    this.loadDefaultClimateZones();
    this.loaded = true;
  }

  private loadDefaultCountries(): void {
    const defaults: Country[] = [
      { id: 'CN', name: '中国', nameEn: 'China', continent: 'Asia', timezone: 'Asia/Shanghai', population: 1400000000 },
      { id: 'US', name: '美国', nameEn: 'United States', continent: 'North America', timezone: 'America/New_York', population: 330000000 },
      { id: 'JP', name: '日本', nameEn: 'Japan', continent: 'Asia', timezone: 'Asia/Tokyo', population: 125000000 },
      { id: 'UK', name: '英国', nameEn: 'United Kingdom', continent: 'Europe', timezone: 'Europe/London', population: 67000000 },
      { id: 'DE', name: '德国', nameEn: 'Germany', continent: 'Europe', timezone: 'Europe/Berlin', population: 83000000 },
      { id: 'FR', name: '法国', nameEn: 'France', continent: 'Europe', timezone: 'Europe/Paris', population: 67000000 },
      { id: 'AU', name: '澳大利亚', nameEn: 'Australia', continent: 'Oceania', timezone: 'Australia/Sydney', population: 26000000 },
      { id: 'CA', name: '加拿大', nameEn: 'Canada', continent: 'North America', timezone: 'America/Toronto', population: 38000000 },
      { id: 'KR', name: '韩国', nameEn: 'South Korea', continent: 'Asia', timezone: 'Asia/Seoul', population: 52000000 },
      { id: 'IN', name: '印度', nameEn: 'India', continent: 'Asia', timezone: 'Asia/Kolkata', population: 1400000000 },
    ];

    for (const c of defaults) {
      this.countries.set(c.id, c);
    }
  }

  private loadDefaultTimezones(): void {
    const defaults: TimeZone[] = [
      { id: 'UTC-12', name: 'UTC-12', offset: -12, offsetStr: '-12:00' },
      { id: 'UTC-11', name: 'UTC-11', offset: -11, offsetStr: '-11:00' },
      { id: 'UTC-10', name: 'UTC-10', offset: -10, offsetStr: '-10:00' },
      { id: 'UTC-9', name: 'UTC-9', offset: -9, offsetStr: '-09:00' },
      { id: 'UTC-8', name: 'UTC-8/PST', offset: -8, offsetStr: '-08:00' },
      { id: 'UTC-7', name: 'UTC-7/MST', offset: -7, offsetStr: '-07:00' },
      { id: 'UTC-6', name: 'UTC-6/CST', offset: -6, offsetStr: '-06:00' },
      { id: 'UTC-5', name: 'UTC-5/EST', offset: -5, offsetStr: '-05:00' },
      { id: 'UTC-4', name: 'UTC-4', offset: -4, offsetStr: '-04:00' },
      { id: 'UTC-3', name: 'UTC-3', offset: -3, offsetStr: '-03:00' },
      { id: 'UTC-2', name: 'UTC-2', offset: -2, offsetStr: '-02:00' },
      { id: 'UTC-1', name: 'UTC-1', offset: -1, offsetStr: '-01:00' },
      { id: 'UTC+0', name: 'UTC+0/GMT', offset: 0, offsetStr: '+00:00' },
      { id: 'UTC+1', name: 'UTC+1/CET', offset: 1, offsetStr: '+01:00' },
      { id: 'UTC+2', name: 'UTC+2', offset: 2, offsetStr: '+02:00' },
      { id: 'UTC+3', name: 'UTC+3', offset: 3, offsetStr: '+03:00' },
      { id: 'UTC+4', name: 'UTC+4', offset: 4, offsetStr: '+04:00' },
      { id: 'UTC+5', name: 'UTC+5', offset: 5, offsetStr: '+05:00' },
      { id: 'UTC+6', name: 'UTC+6', offset: 6, offsetStr: '+06:00' },
      { id: 'UTC+7', name: 'UTC+7', offset: 7, offsetStr: '+07:00' },
      { id: 'UTC+8', name: 'UTC+8/CST', offset: 8, offsetStr: '+08:00' },
      { id: 'UTC+9', name: 'UTC+9/JST', offset: 9, offsetStr: '+09:00' },
      { id: 'UTC+10', name: 'UTC+10', offset: 10, offsetStr: '+10:00' },
      { id: 'UTC+11', name: 'UTC+11', offset: 11, offsetStr: '+11:00' },
      { id: 'UTC+12', name: 'UTC+12', offset: 12, offsetStr: '+12:00' },
    ];

    for (const t of defaults) {
      this.timezones.set(t.id, t);
    }
  }

  private loadDefaultClimateZones(): void {
    const defaults: ClimateZone[] = [
      { id: 'tropical', name: '热带', tempRange: { summer: [25, 35], winter: [20, 30] }, precipitation: 'high', seasons: 'wet_dry' },
      { id: 'subtropical', name: '亚热带', tempRange: { summer: [25, 35], winter: [10, 20] }, precipitation: 'moderate', seasons: 'four' },
      { id: 'temperate', name: '温带', tempRange: { summer: [20, 30], winter: [-5, 10] }, precipitation: 'moderate', seasons: 'four' },
      { id: 'continental', name: '大陆性', tempRange: { summer: [25, 35], winter: [-20, 5] }, precipitation: 'low', seasons: 'four' },
      { id: 'polar', name: '极地', tempRange: { summer: [0, 10], winter: [-40, -20] }, precipitation: 'very_low', seasons: 'two' },
      { id: 'desert', name: '沙漠', tempRange: { summer: [35, 45], winter: [15, 25] }, precipitation: 'very_low', seasons: 'two' },
    ];

    for (const c of defaults) {
      this.climateZones.set(c.id, c);
    }
  }

  getCountry(id: string): Country | undefined {
    return this.countries.get(id);
  }

  getAllCountries(): Country[] {
    return Array.from(this.countries.values());
  }

  getProvince(id: string): Province | undefined {
    return this.provinces.get(id);
  }

  getProvincesByCountry(countryId: string): Province[] {
    return Array.from(this.provinces.values()).filter(p => p.countryId === countryId);
  }

  getCity(id: string): City | undefined {
    return this.cities.get(id);
  }

  getCitiesByCountry(countryId: string): City[] {
    return Array.from(this.cities.values()).filter(c => c.countryId === countryId);
  }

  getCitiesByProvince(provinceId: string): City[] {
    return Array.from(this.cities.values()).filter(c => c.provinceId === provinceId);
  }

  getTimezone(id: string): TimeZone | undefined {
    return this.timezones.get(id);
  }

  getAllTimezones(): TimeZone[] {
    return Array.from(this.timezones.values());
  }

  getClimateZone(id: string): ClimateZone | undefined {
    return this.climateZones.get(id);
  }

  calculateDistance(city1Id: string, city2Id: string): number {
    const city1 = this.cities.get(city1Id);
    const city2 = this.cities.get(city2Id);

    if (!city1 || !city2) return Infinity;

    return this.haversineDistance(city1.lat, city1.lng, city2.lat, city2.lng);
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  findNearestCity(lat: number, lng: number): City | undefined {
    let nearest: City | undefined;
    let minDistance = Infinity;

    for (const city of this.cities.values()) {
      const distance = this.haversineDistance(lat, lng, city.lat, city.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = city;
      }
    }

    return nearest;
  }

  getCitiesWithinRadius(centerCityId: string, radiusKm: number): City[] {
    const center = this.cities.get(centerCityId);
    if (!center) return [];

    const result: City[] = [];
    for (const city of this.cities.values()) {
      const distance = this.haversineDistance(center.lat, center.lng, city.lat, city.lng);
      if (distance <= radiusKm && city.id !== centerCityId) {
        result.push(city);
      }
    }

    return result;
  }

  getStats(): {
    countries: number;
    provinces: number;
    cities: number;
    timezones: number;
    climateZones: number;
    loaded: boolean;
  } {
    return {
      countries: this.countries.size,
      provinces: this.provinces.size,
      cities: this.cities.size,
      timezones: this.timezones.size,
      climateZones: this.climateZones.size,
      loaded: this.loaded,
    };
  }
}