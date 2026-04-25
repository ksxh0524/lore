import type { LLMScheduler } from '../../llm/scheduler.js';
import type { LoreConfig } from '../../config/loader.js';
import type { Repository } from '../../db/repository.js';
import { createLogger } from '../../logger/index.js';

const logger = createLogger('on-demand-generator');

export type GenerationType = 'agent_profile' | 'company_detail' | 'city_detail' | 'historical_event' | 'organization';

export interface GenerationRequest {
  type: GenerationType;
  entityId: string;
  trigger: string;
  context?: Record<string, unknown>;
  priority: number;
}

export interface GenerationResult {
  success: boolean;
  entityId: string;
  type: GenerationType;
  content: Record<string, unknown>;
  generatedAt: Date;
  cached: boolean;
}

export interface GenerationQueueItem {
  request: GenerationRequest;
  resolve: (result: GenerationResult) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

const GENERATION_PROMPTS: Record<GenerationType, { system: string; userTemplate: string }> = {
  agent_profile: {
    system: `你是人物背景生成专家。为指定的人物生成完整、真实、有血有肉的生平故事。

返回JSON格式：
{
  "name": "人物姓名",
  "age": 年龄,
  "gender": "性别",
  "occupation": "职业",
  "personality": "性格描述（详细）",
  "background": "完整背景故事（包含家庭、成长、教育、工作经历）",
  "speechStyle": "说话风格",
  "likes": ["喜欢的事物"],
  "dislikes": ["讨厌的事物"],
  "skills": ["技能"],
  "goals": ["人生目标"],
  "fears": ["担忧"],
  "memories": ["重要记忆片段"]
}

要求：
- 背景故事要真实、有细节
- 性格要与背景匹配
- 不是模板化的内容`,
    userTemplate: `请为以下人物生成完整生平：

ID: {entityId}
基本信息: {context}

要求：生成独特的、真实的人物。`,
  },
  company_detail: {
    system: `你是公司信息生成专家。为指定公司生成详细的运营信息。

返回JSON格式：
{
  "name": "公司名称",
  "industry": "行业",
  "size": "规模（员工数量范围）",
  "foundedYear": 成立年份,
  "headquarters": "总部地点",
  "description": "公司描述",
  "products": ["主要产品/服务"],
  "culture": "企业文化",
  "benefits": ["员工福利"],
  "challenges": ["面临的挑战"],
  "opportunities": ["发展机会"],
  "departments": ["部门列表"],
  "hiring": {"positions": ["招聘职位"], "requirements": ["要求"]}
}

要求：
- 信息要真实、有细节
- 符合公司规模和行业`,
    userTemplate: `请为以下公司生成详细信息：

公司ID: {entityId}
基本信息: {context}

用户将入职该公司，请生成详细内容。`,
  },
  city_detail: {
    system: `你是城市信息生成专家。为指定城市生成详细的生活信息。

返回JSON格式：
{
  "name": "城市名称",
  "population": 人口数量,
  "climate": "气候描述",
  "culture": "文化特色",
  "transportation": "交通情况",
  "housing": {"avgRent": 平均租金, "areas": ["主要居住区"]},
  "education": {"schools": ["主要学校"], "universities": ["大学"]},
  "healthcare": ["主要医院"],
  "shopping": ["主要商圈"],
  "entertainment": ["娱乐场所"],
  "restaurants": ["特色餐厅"],
  "neighborhoods": [{"name": "街区名", "description": "描述"}],
  "costOfLiving": {"rent": 租金范围, "food": 餐饮成本, "transport": 交通成本}
}

要求：
- 信息要真实、有参考价值
- 符合城市规模和特点`,
    userTemplate: `请为以下城市生成详细生活信息：

城市ID: {entityId}
基本信息: {context}

用户将前往该城市，请生成详细内容。`,
  },
  historical_event: {
    system: `你是历史事件叙事专家。为指定的历史事件生成详细叙事。

返回JSON格式：
{
  "name": "事件名称",
  "year": 年份,
  "location": "地点",
  "participants": ["参与者"],
  "description": "事件描述（详细）",
  "causes": ["起因"],
  "consequences": ["后果"],
  "significance": "历史意义",
  "narrative": "完整叙事（故事形式）",
  "perspectives": [{"person": "人物", "viewpoint": "观点"}]
}

要求：
- 叙事要生动、有细节
- 符合历史背景`,
    userTemplate: `请为以下历史事件生成详细叙事：

事件ID: {entityId}
基本信息: {context}`,
  },
  organization: {
    system: `你是组织信息生成专家。为指定组织生成详细信息。

返回JSON格式：
{
  "name": "组织名称",
  "type": "类型",
  "foundedYear": 成立年份,
  "headquarters": "总部",
  "mission": "使命",
  "members": 估计成员数,
  "activities": ["主要活动"],
  "influence": "影响力范围",
  "keyFigures": ["关键人物"],
  "reputation": "声誉"
}`,
    userTemplate: `请为以下组织生成详细信息：

组织ID: {entityId}
基本信息: {context}`,
  },
};

export class OnDemandGenerator {
  private llmScheduler: LLMScheduler;
  private config: LoreConfig;
  private repo: Repository;
  private queue: GenerationQueueItem[] = [];
  private processing: boolean = false;
  private cache: Map<string, GenerationResult> = new Map();
  private maxQueueSize: number = 20;
  private generationCount: number = 0;
  private cacheHits: number = 0;

  constructor(llmScheduler: LLMScheduler, config: LoreConfig, repo: Repository) {
    this.llmScheduler = llmScheduler;
    this.config = config;
    this.repo = repo;
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const cached = this.cache.get(`${request.type}:${request.entityId}`);
    if (cached) {
      this.cacheHits++;
      logger.debug({ type: request.type, entityId: request.entityId }, 'Generation result cached');
      return { ...cached, cached: true };
    }

    if (this.queue.length >= this.maxQueueSize) {
      const lowestPriority = this.queue.reduce((min, item) => Math.min(min, item.request.priority), Infinity);
      
      if (request.priority > lowestPriority) {
        const lowestIndex = this.queue.findIndex(item => item.request.priority === lowestPriority);
        if (lowestIndex !== -1) {
          const dropped = this.queue.splice(lowestIndex, 1)[0];
          if (dropped) {
            dropped.reject(new Error('Generation request dropped due to queue overload'));
            logger.warn({ type: dropped.request.type, entityId: dropped.request.entityId }, 'Generation request dropped');
          }
        }
      } else {
        throw new Error('Generation queue overloaded');
      }
    }

    return new Promise<GenerationResult>((resolve, reject) => {
      this.queue.push({
        request,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      this.queue.sort((a, b) => b.request.priority - a.request.priority);

      this.processQueue();
    });
  }

  async generateImmediate(request: GenerationRequest): Promise<GenerationResult> {
    const cached = this.cache.get(`${request.type}:${request.entityId}`);
    if (cached) {
      this.cacheHits++;
      return { ...cached, cached: true };
    }

    return this.executeGeneration(request);
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        const result = await this.executeGeneration(item.request);
        item.resolve(result);
      } catch (err) {
        item.reject(err instanceof Error ? err : new Error('Generation failed'));
      }
    }

    this.processing = false;
  }

  private async executeGeneration(request: GenerationRequest): Promise<GenerationResult> {
    const promptTemplate = GENERATION_PROMPTS[request.type];
    if (!promptTemplate) {
      throw new Error(`Unknown generation type: ${request.type}`);
    }

    const contextStr = request.context ? JSON.stringify(request.context) : '{}';
    const userPrompt = promptTemplate.userTemplate
      .replace('{entityId}', request.entityId)
      .replace('{context}', contextStr);

    const messages = [
      { role: 'system' as const, content: promptTemplate.system },
      { role: 'user' as const, content: userPrompt },
    ];

    logger.debug({
      type: request.type,
      entityId: request.entityId,
      trigger: request.trigger,
    }, 'Executing generation');

    try {
      const result = await this.llmScheduler.submit({
        agentId: 'on-demand-generator',
        callType: 'creative',
        model: this.config.llm.defaults.standardModel,
        messages,
        maxTokens: 4000,
      });

      const content = JSON.parse(result.content);
      this.generationCount++;

      const generationResult: GenerationResult = {
        success: true,
        entityId: request.entityId,
        type: request.type,
        content,
        generatedAt: new Date(),
        cached: false,
      };

      this.cache.set(`${request.type}:${request.entityId}`, generationResult);

      logger.info({
        type: request.type,
        entityId: request.entityId,
        tokens: result.usage.promptTokens + result.usage.completionTokens,
      }, 'Generation completed');

      return generationResult;
    } catch (err) {
      logger.error({
        type: request.type,
        entityId: request.entityId,
        err,
      }, 'Generation failed');

      throw err instanceof Error ? err : new Error('Generation failed');
    }
  }

  getCachedResult(type: GenerationType, entityId: string): GenerationResult | undefined {
    return this.cache.get(`${type}:${entityId}`);
  }

  hasCache(type: GenerationType, entityId: string): boolean {
    return this.cache.has(`${type}:${entityId}`);
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Generation cache cleared');
  }

  clearCacheForEntity(type: GenerationType, entityId: string): void {
    this.cache.delete(`${type}:${entityId}`);
    logger.debug({ type, entityId }, 'Cache cleared for entity');
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getStats(): {
    queueLength: number;
    generationCount: number;
    cacheHits: number;
    cacheSize: number;
    processing: boolean;
  } {
    return {
      queueLength: this.queue.length,
      generationCount: this.generationCount,
      cacheHits: this.cacheHits,
      cacheSize: this.cache.size,
      processing: this.processing,
    };
  }

  resetStats(): void {
    this.generationCount = 0;
    this.cacheHits = 0;
  }
}