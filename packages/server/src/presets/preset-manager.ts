import { z } from 'zod';
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createLogger } from '../logger/index.js';

const logger = createLogger('presets');

export const HistoricalPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  era: z.string(),
  description: z.string(),
  timeRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  location: z.string(),
  socialContext: z.object({
    politics: z.string(),
    economy: z.string(),
    culture: z.string(),
    technology: z.string(),
  }),
  notableFigures: z.array(z.object({
    name: z.string(),
    role: z.string(),
    birthYear: z.number().optional(),
    deathYear: z.number().optional(),
    personality: z.string(),
    background: z.string(),
    occupation: z.string(),
    ageAtStart: z.number(),
    importance: z.enum(['major', 'moderate', 'minor']),
  })),
  commonOccupations: z.array(z.string()),
  commonEvents: z.array(z.object({
    year: z.number(),
    type: z.enum(['political', 'economic', 'social', 'military', 'natural', 'cultural']),
    description: z.string(),
    impact: z.string(),
  })),
  dailyLife: z.object({
    schedule: z.array(z.object({
      hour: z.number(),
      activity: z.string(),
      commonFor: z.array(z.string()),
    })),
    challenges: z.array(z.string()),
    opportunities: z.array(z.string()),
  }),
  currency: z.object({
    name: z.string(),
    relativeValue: z.number(),
  }),
  metadata: z.object({
    author: z.string().optional(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

export const RandomWorldPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  era: z.enum(['modern', 'future', 'fantasy', 'post-apocalyptic']),
  description: z.string(),
  socialContext: z.object({
    politics: z.string(),
    economy: z.string(),
    culture: z.string(),
    technology: z.string(),
  }),
  commonOccupations: z.array(z.string()),
  commonEvents: z.array(z.object({
    type: z.enum(['social', 'economic', 'political', 'natural', 'technological', 'cultural']),
    description: z.string(),
    probability: z.number(),
    impact: z.string(),
  })),
  dailyLife: z.object({
    schedule: z.array(z.object({
      hour: z.number(),
      activity: z.string(),
      commonFor: z.array(z.string()),
    })),
    challenges: z.array(z.string()),
    opportunities: z.array(z.string()),
  }),
  currency: z.object({
    name: z.string(),
    relativeValue: z.number(),
  }),
  demographics: z.object({
    ageRange: z.object({
      min: z.number(),
      max: z.number(),
    }),
    genderRatio: z.number().optional(),
    employmentRate: z.number().optional(),
  }).optional(),
  metadata: z.object({
    author: z.string().optional(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

export type HistoricalPreset = z.infer<typeof HistoricalPresetSchema>;
export type RandomWorldPreset = z.infer<typeof RandomWorldPresetSchema>;

const DEFAULT_PRESETS_DIR = join(process.env.HOME ?? '.', '.lore', 'presets');

const defaultHistoricalPresets: HistoricalPreset[] = [
  {
    id: 'ancient-china-qin',
    name: '秦朝',
    era: 'ancient',
    description: '公元前221年-公元前207年，秦始皇统一六国，建立中国第一个大一统王朝',
    timeRange: { start: '-221', end: '-207' },
    location: '中国',
    socialContext: {
      politics: '中央集权制，皇帝专制',
      economy: '农业为主，统一度量衡',
      culture: '焚书坑儒，统一文字',
      technology: '青铜器、铁器发展',
    },
    notableFigures: [
      { name: '秦始皇', role: '皇帝', personality: '雄才大略、刚毅果断', background: '秦国君主，统一六国', occupation: '皇帝', ageAtStart: 39, importance: 'major' },
      { name: '李斯', role: '丞相', personality: '智慧、善于谋略', background: '秦国丞相，推行法治', occupation: '丞相', ageAtStart: 45, importance: 'major' },
      { name: '蒙恬', role: '将军', personality: '忠诚、勇敢', background: '秦国名将，修筑长城', occupation: '将军', ageAtStart: 35, importance: 'moderate' },
    ],
    commonOccupations: ['农夫', '士兵', '官员', '商人', '工匠', '书生'],
    commonEvents: [
      { year: -221, type: 'political', description: '秦始皇统一六国', impact: '结束战国乱世，建立大一统王朝' },
      { year: -213, type: 'cultural', description: '焚书坑儒', impact: '统一思想，摧残文化' },
      { year: -210, type: 'political', description: '秦始皇驾崩', impact: '王朝动荡，二世即位' },
    ],
    dailyLife: {
      schedule: [
        { hour: 6, activity: '日出而作', commonFor: ['农夫', '工匠'] },
        { hour: 12, activity: '午休', commonFor: ['农夫', '工匠', '官员'] },
        { hour: 18, activity: '日落而息', commonFor: ['农夫', '工匠'] },
      ],
      challenges: ['赋税沉重', '徭役繁重', '严刑峻法'],
      opportunities: ['科举入仕', '经商致富', '军功升迁'],
    },
    currency: { name: '秦半两', relativeValue: 100 },
  },
  {
    id: 'tang-china',
    name: '唐朝',
    era: 'medieval',
    description: '公元618年-907年，中国历史上最繁荣的朝代之一',
    timeRange: { start: '618', end: '907' },
    location: '中国',
    socialContext: {
      politics: '三省六部制，科举取士',
      economy: '丝绸之路繁荣，商贸发达',
      culture: '诗词盛世，开放包容',
      technology: '印刷术发明，农业进步',
    },
    notableFigures: [
      { name: '李白', role: '诗人', personality: '豪放洒脱、才华横溢', background: '唐代著名诗人，诗仙', occupation: '诗人', ageAtStart: 25, importance: 'major' },
      { name: '杜甫', role: '诗人', personality: '忧国忧民、深沉稳重', background: '唐代著名诗人，诗圣', occupation: '诗人', ageAtStart: 30, importance: 'major' },
      { name: '杨贵妃', role: '贵妃', personality: '美丽聪慧、善解人意', background: '唐玄宗宠妃', occupation: '贵妃', ageAtStart: 20, importance: 'major' },
    ],
    commonOccupations: ['官员', '商人', '农夫', '诗人', '僧侣', '武将'],
    commonEvents: [
      { year: 618, type: 'political', description: '唐朝建立', impact: '结束隋朝乱世' },
      { year: 755, type: 'military', description: '安史之乱', impact: '唐朝衰落' },
      { year: 907, type: 'political', description: '唐朝灭亡', impact: '五代十国开始' },
    ],
    dailyLife: {
      schedule: [
        { hour: 5, activity: '晨读', commonFor: ['诗人', '官员', '书生'] },
        { hour: 7, activity: '早市', commonFor: ['商人', '官员'] },
        { hour: 19, activity: '夜宴', commonFor: ['官员', '诗人', '贵族'] },
      ],
      challenges: ['战乱威胁', '科举竞争', '官场倾轧'],
      opportunities: ['科举入仕', '经商致富', '诗词成名'],
    },
    currency: { name: '开元通宝', relativeValue: 50 },
  },
  {
    id: 'modern-china-1980s',
    name: '改革开放时代',
    era: 'modern',
    description: '1980年代中国改革开放初期，经济腾飞的起点',
    timeRange: { start: '1980', end: '1990' },
    location: '中国',
    socialContext: {
      politics: '改革开放政策实施',
      economy: '市场经济起步，国企改革',
      culture: '流行文化涌入，思想解放',
      technology: '电视普及，通讯发展',
    },
    notableFigures: [],
    commonOccupations: ['工人', '农民', '教师', '医生', '个体户', '工程师'],
    commonEvents: [
      { year: 1980, type: 'economic', description: '深圳特区成立', impact: '经济改革试点' },
      { year: 1984, type: 'economic', description: '国企改革启动', impact: '市场经济深化' },
    ],
    dailyLife: {
      schedule: [
        { hour: 7, activity: '上班', commonFor: ['工人', '教师', '工程师'] },
        { hour: 12, activity: '午休', commonFor: ['工人', '教师', '工程师'] },
        { hour: 17, activity: '下班', commonFor: ['工人', '教师', '工程师'] },
      ],
      challenges: ['改革阵痛', '就业转型', '物价上涨'],
      opportunities: ['创业致富', '个体经营', '技术学习'],
    },
    currency: { name: '人民币', relativeValue: 1 },
  },
  {
    id: 'victorian-england',
    name: '维多利亚时代',
    era: 'modern',
    description: '1837年-1901年，英国工业革命高峰期',
    timeRange: { start: '1837', end: '1901' },
    location: '英国',
    socialContext: {
      politics: '君主立宪，帝国扩张',
      economy: '工业革命，资本主义发展',
      culture: '绅士文化，道德保守',
      technology: '蒸汽机、铁路发展',
    },
    notableFigures: [
      { name: '维多利亚女王', role: '君主', personality: '端庄威严', background: '英国女王，帝国象征', occupation: '女王', ageAtStart: 18, importance: 'major' },
      { name: '达尔文', role: '科学家', personality: '理性、好奇', background: '进化论创始人', occupation: '科学家', ageAtStart: 28, importance: 'major' },
    ],
    commonOccupations: ['工厂工人', '商人', '贵族', '教师', '医生', '工程师'],
    commonEvents: [
      { year: 1851, type: 'cultural', description: '伦敦世博会', impact: '展示工业成就' },
      { year: 1875, type: 'economic', description: '工会合法化', impact: '工人权益改善' },
    ],
    dailyLife: {
      schedule: [
        { hour: 6, activity: '工厂开工', commonFor: ['工厂工人'] },
        { hour: 8, activity: '晨茶', commonFor: ['贵族', '商人'] },
        { hour: 19, activity: '晚宴', commonFor: ['贵族', '商人'] },
      ],
      challenges: ['阶级分化', '工业污染', '童工问题'],
      opportunities: ['工业致富', '殖民地发展', '科技进步'],
    },
    currency: { name: '英镑', relativeValue: 10 },
  },
];

export class PresetManager {
  private presetsDir: string;
  private historicalPresets: Map<string, HistoricalPreset> = new Map();
  private randomPresets: Map<string, RandomWorldPreset> = new Map();

  constructor(presetsDir?: string) {
    this.presetsDir = presetsDir ?? DEFAULT_PRESETS_DIR;
    this.init();
  }

  private init(): void {
    if (!existsSync(this.presetsDir)) {
      mkdirSync(this.presetsDir, { recursive: true });
      mkdirSync(join(this.presetsDir, 'historical'), { recursive: true });
      mkdirSync(join(this.presetsDir, 'random'), { recursive: true });
      this.saveDefaultPresets();
    }

    this.loadAllPresets();
  }

  private saveDefaultPresets(): void {
    for (const preset of defaultHistoricalPresets) {
      const filePath = join(this.presetsDir, 'historical', `${preset.id}.yaml`);
      if (!existsSync(filePath)) {
        const yamlContent = this.toYaml(preset);
        writeFileSync(filePath, yamlContent, 'utf-8');
        logger.info({ presetId: preset.id }, 'Default preset saved');
      }
    }
  }

  private toYaml(data: unknown): string {
    const obj = data as Record<string, unknown>;
    let yaml = '';
    for (const [key, value] of Object.entries(obj)) {
      yaml += this.toYamlField(key, value, 0);
    }
    return yaml;
  }

  private toYamlField(key: string, value: unknown, indent: number): string {
    const spaces = '  '.repeat(indent);
    if (value === null || value === undefined) {
      return `${spaces}${key}: null\n`;
    }
    if (typeof value === 'string') {
      return `${spaces}${key}: "${value}"\n`;
    }
    if (typeof value === 'number') {
      return `${spaces}${key}: ${value}\n`;
    }
    if (typeof value === 'boolean') {
      return `${spaces}${key}: ${value}\n`;
    }
    if (Array.isArray(value)) {
      let result = `${spaces}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          result += `${spaces}  -\n`;
          for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
            result += this.toYamlField(k, v, indent + 2);
          }
        } else {
          result += `${spaces}  - ${item}\n`;
        }
      }
      return result;
    }
    if (typeof value === 'object') {
      let result = `${spaces}${key}:\n`;
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        result += this.toYamlField(k, v, indent + 1);
      }
      return result;
    }
    return `${spaces}${key}: ${value}\n`;
  }

  private loadAllPresets(): void {
    this.loadHistoricalPresets();
    this.loadRandomPresets();
  }

  private loadHistoricalPresets(): void {
    const historicalDir = join(this.presetsDir, 'historical');
    if (!existsSync(historicalDir)) return;

    const files = readdirSync(historicalDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of files) {
      try {
        const content = readFileSync(join(historicalDir, file), 'utf-8');
        const parsed = this.parseYaml(content);
        const validated = HistoricalPresetSchema.parse(parsed);
        this.historicalPresets.set(validated.id, validated);
        logger.debug({ presetId: validated.id, file }, 'Historical preset loaded');
      } catch (err) {
        logger.warn({ file, err }, 'Failed to load historical preset');
      }
    }

    for (const preset of defaultHistoricalPresets) {
      if (!this.historicalPresets.has(preset.id)) {
        this.historicalPresets.set(preset.id, preset);
      }
    }
  }

  private loadRandomPresets(): void {
    const randomDir = join(this.presetsDir, 'random');
    if (!existsSync(randomDir)) return;

    const files = readdirSync(randomDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of files) {
      try {
        const content = readFileSync(join(randomDir, file), 'utf-8');
        const parsed = this.parseYaml(content);
        const validated = RandomWorldPresetSchema.parse(parsed);
        this.randomPresets.set(validated.id, validated);
        logger.debug({ presetId: validated.id, file }, 'Random preset loaded');
      } catch (err) {
        logger.warn({ file, err }, 'Failed to load random preset');
      }
    }
  }

  private parseYaml(content: string): unknown {
    const result: Record<string, unknown> = {};
    const lines = content.split('\n');
    const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [{ obj: result, indent: -1 }];

    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('#')) continue;

      const indent = line.search(/\S/);
      const trimmed = line.trim();

      while (stack.length > 1 && stack[stack.length - 1]!.indent >= indent) {
        stack.pop();
      }

      const current = stack[stack.length - 1]!.obj;

      if (trimmed.startsWith('- ')) {
        const itemValue = trimmed.slice(2);
        if (!Array.isArray(current)) {
          const lastKey = Object.keys(current).pop();
          if (lastKey && !Array.isArray(current[lastKey])) {
            current[lastKey] = [];
          }
          const arr = current[lastKey!] as Array<unknown>;
          if (itemValue.includes(':')) {
            const itemObj: Record<string, unknown> = {};
            const [k, v] = itemValue.split(':').map(s => s.trim());
            if (v) {
              itemObj[k!] = this.parseValue(v);
            }
            arr.push(itemObj);
            stack.push({ obj: itemObj, indent });
          } else {
            arr.push(this.parseValue(itemValue));
          }
        }
        continue;
      }

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();

      if (value === '') {
        current[key] = {};
        stack.push({ obj: current[key] as Record<string, unknown>, indent });
      } else {
        current[key] = this.parseValue(value);
      }
    }

    return result;
  }

  private parseValue(value: string): unknown {
    if (value === 'null') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
    return value;
  }

  getHistoricalPreset(id: string): HistoricalPreset | undefined {
    return this.historicalPresets.get(id);
  }

  getRandomPreset(id: string): RandomWorldPreset | undefined {
    return this.randomPresets.get(id);
  }

  getAllHistoricalPresets(): HistoricalPreset[] {
    return [...this.historicalPresets.values()];
  }

  getAllRandomPresets(): RandomWorldPreset[] {
    return [...this.randomPresets.values()];
  }

  searchPresets(query: string): { historical: HistoricalPreset[]; random: RandomWorldPreset[] } {
    const q = query.toLowerCase();
    return {
      historical: this.getAllHistoricalPresets().filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.era.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
      ),
      random: this.getAllRandomPresets().filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
      ),
    };
  }

  addPreset(preset: HistoricalPreset | RandomWorldPreset): void {
    if (HistoricalPresetSchema.safeParse(preset).success) {
      this.historicalPresets.set(preset.id, preset as HistoricalPreset);
      const filePath = join(this.presetsDir, 'historical', `${preset.id}.yaml`);
      writeFileSync(filePath, this.toYaml(preset), 'utf-8');
      logger.info({ presetId: preset.id }, 'Historical preset added');
    } else if (RandomWorldPresetSchema.safeParse(preset).success) {
      this.randomPresets.set(preset.id, preset as RandomWorldPreset);
      const filePath = join(this.presetsDir, 'random', `${preset.id}.yaml`);
      writeFileSync(filePath, this.toYaml(preset), 'utf-8');
      logger.info({ presetId: preset.id }, 'Random preset added');
    }
  }

  removePreset(id: string): boolean {
    if (this.historicalPresets.has(id)) {
      this.historicalPresets.delete(id);
      return true;
    }
    if (this.randomPresets.has(id)) {
      this.randomPresets.delete(id);
      return true;
    }
    return false;
  }

  validatePreset(data: unknown): { valid: boolean; errors?: string[] } {
    const historicalResult = HistoricalPresetSchema.safeParse(data);
    if (historicalResult.success) {
      return { valid: true };
    }

    const randomResult = RandomWorldPresetSchema.safeParse(data);
    if (randomResult.success) {
      return { valid: true };
    }

    return {
      valid: false,
      errors: [
        ...historicalResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        ...randomResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      ],
    };
  }
}