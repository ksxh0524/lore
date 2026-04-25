import { createLogger } from '../../logger/index.js';

const logger = createLogger('virtuality-manager');

export type RunLevel = 'level0' | 'level1' | 'level2' | 'level3';

export interface EntityLocation {
  cityId?: string;
  countryId?: string;
  lat?: number;
  lng?: number;
}

export interface Entity {
  id: string;
  type: 'agent' | 'company' | 'city' | 'organization' | 'event';
  location?: EntityLocation;
  influenceLevel: number;
  name: string;
}

export interface UserContext {
  cityId: string;
  countryId: string;
  companyId?: string;
  relationships: Map<string, { intimacy: number; type: string }>;
  interests: string[];
}

export interface LevelScore {
  geoScore: number;
  influenceScore: number;
  relationScore: number;
  interestScore: number;
  totalScore: number;
  level: RunLevel;
}

export interface LevelChange {
  entityId: string;
  entityType: string;
  fromLevel: RunLevel;
  toLevel: RunLevel;
  trigger: string;
  timestamp: Date;
  reason: string;
}

export interface VirtualityConfig {
  levelThresholds: {
    level0: number;
    level1: number;
    level2: number;
  };
  geoScores: {
    sameCity: number;
    sameCountry: number;
    other: number;
  };
  influenceScores: {
    global: number;
    national: number;
    city: number;
    block: number;
  };
  relationScores: {
    direct: number;
    indirect: number;
    none: number;
  };
  interestScores: {
    match: number;
    partial: number;
    none: number;
  };
  downgradeDelayMs: number;
  autoDowngradeIntervalMs: number;
}

const DEFAULT_CONFIG: VirtualityConfig = {
  levelThresholds: { level0: 150, level1: 80, level2: 40 },
  geoScores: { sameCity: 100, sameCountry: 50, other: 10 },
  influenceScores: { global: 50, national: 30, city: 10, block: 5 },
  relationScores: { direct: 100, indirect: 30, none: 0 },
  interestScores: { match: 20, partial: 10, none: 0 },
  downgradeDelayMs: 1800000,
  autoDowngradeIntervalMs: 3600000,
};

export class VirtualityManager {
  private config: VirtualityConfig;
  private userContext: UserContext | null = null;
  private entityLevels: Map<string, RunLevel> = new Map();
  private entityScores: Map<string, LevelScore> = new Map();
  private levelHistory: LevelChange[] = [];
  private downgradeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private pendingDowngrades: Map<string, { scheduledLevel: RunLevel; scheduledTime: Date }> = new Map();
  private autoDowngradeInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<VirtualityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setUserContext(context: UserContext): void {
    this.userContext = context;
    logger.info({ cityId: context.cityId, countryId: context.countryId }, 'User context updated');
    this.recalculateAll();
  }

  updateUserLocation(cityId: string, countryId: string): void {
    if (!this.userContext) {
      this.userContext = {
        cityId,
        countryId,
        relationships: new Map(),
        interests: [],
      };
    } else {
      this.userContext.cityId = cityId;
      this.userContext.countryId = countryId;
    }

    logger.info({ cityId, countryId }, 'User location updated');
    this.recalculateAll();
    this.checkUpgradeTriggers('location_change', cityId);
  }

  updateUserCompany(companyId: string): void {
    if (!this.userContext) return;

    const oldCompanyId = this.userContext.companyId;
    this.userContext.companyId = companyId;

    logger.info({ companyId, oldCompanyId }, 'User company updated');

    if (oldCompanyId) {
      this.scheduleDowngrade(oldCompanyId, 'level2', 'user_left_company');
    }

    if (companyId) {
      this.triggerUpgrade(companyId, 'company', 'level0', 'user_joined_company');
    }
  }

  addUserRelationship(agentId: string, intimacy: number, type: string): void {
    if (!this.userContext) return;

    this.userContext.relationships.set(agentId, { intimacy, type });

    if (intimacy > 30) {
      this.triggerUpgrade(agentId, 'agent', 'level0', 'relationship_established');
    } else {
      this.triggerUpgrade(agentId, 'agent', 'level1', 'relationship_weak');
    }

    logger.debug({ agentId, intimacy, type }, 'Relationship added');
  }

  removeUserRelationship(agentId: string): void {
    if (!this.userContext) return;

    this.userContext.relationships.delete(agentId);
    this.scheduleDowngrade(agentId, 'level2', 'relationship_removed');

    logger.debug({ agentId }, 'Relationship removed');
  }

  updateUserInterests(interests: string[]): void {
    if (!this.userContext) return;

    this.userContext.interests = interests;
    logger.debug({ interests }, 'User interests updated');
    this.recalculateAll();
  }

  calculateLevel(entity: Entity): LevelScore {
    if (!this.userContext) {
      return {
        geoScore: 0,
        influenceScore: 0,
        relationScore: 0,
        interestScore: 0,
        totalScore: 0,
        level: 'level3',
      };
    }

    const geoScore = this.calculateGeoScore(entity);
    const influenceScore = entity.influenceLevel;
    const relationScore = this.calculateRelationScore(entity);
    const interestScore = this.calculateInterestScore(entity);

    const totalScore = geoScore + influenceScore + relationScore + interestScore;
    const level = this.scoreToLevel(totalScore);

    return { geoScore, influenceScore, relationScore, interestScore, totalScore, level };
  }

  private calculateGeoScore(entity: Entity): number {
    if (!this.userContext || !entity.location) return 0;

    if (entity.location.cityId === this.userContext.cityId) {
      return this.config.geoScores.sameCity;
    }
    if (entity.location.countryId === this.userContext.countryId) {
      return this.config.geoScores.sameCountry;
    }
    return this.config.geoScores.other;
  }

  private calculateRelationScore(entity: Entity): number {
    if (!this.userContext) return 0;

    if (entity.type === 'agent') {
      const relation = this.userContext.relationships.get(entity.id);
      if (relation && relation.intimacy > 30) {
        return this.config.relationScores.direct;
      }
      if (relation) {
        return this.config.relationScores.indirect;
      }
    }

    if (entity.type === 'company') {
      if (this.userContext.companyId === entity.id) {
        return this.config.relationScores.direct;
      }
    }

    return this.config.relationScores.none;
  }

  private calculateInterestScore(entity: Entity): number {
    if (!this.userContext || this.userContext.interests.length === 0) return 0;

    const entityKeywords = this.getEntityKeywords(entity);
    const matchingInterests = this.userContext.interests.filter(i =>
      entityKeywords.some(k => k.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(k.toLowerCase()))
    );

    if (matchingInterests.length >= 2) {
      return this.config.interestScores.match;
    }
    if (matchingInterests.length === 1) {
      return this.config.interestScores.partial;
    }
    return this.config.interestScores.none;
  }

  private getEntityKeywords(entity: Entity): string[] {
    const keywords: string[] = [entity.name];

    if (entity.type === 'company') {
      keywords.push('公司', '工作', '职场');
    }
    if (entity.type === 'agent') {
      keywords.push('人', '社交');
    }

    return keywords;
  }

  private scoreToLevel(score: number): RunLevel {
    if (score >= this.config.levelThresholds.level0) return 'level0';
    if (score >= this.config.levelThresholds.level1) return 'level1';
    if (score >= this.config.levelThresholds.level2) return 'level2';
    return 'level3';
  }

  getEntityLevel(entityId: string): RunLevel {
    return this.entityLevels.get(entityId) || 'level3';
  }

  setEntityLevel(entityId: string, level: RunLevel, reason: string): void {
    const oldLevel = this.entityLevels.get(entityId) || 'level3';
    
    if (oldLevel !== level) {
      this.entityLevels.set(entityId, level);
      
      const change: LevelChange = {
        entityId,
        entityType: 'unknown',
        fromLevel: oldLevel,
        toLevel: level,
        trigger: 'manual',
        timestamp: new Date(),
        reason,
      };
      
      this.levelHistory.push(change);
      
      logger.info({ entityId, fromLevel: oldLevel, toLevel: level, reason }, 'Entity level changed');
    }
  }

  private triggerUpgrade(entityId: string, entityType: string, targetLevel: RunLevel, trigger: string): void {
    const currentLevel = this.entityLevels.get(entityId) || 'level3';
    
    if (this.levelToNumber(targetLevel) < this.levelToNumber(currentLevel)) {
      this.cancelPendingDowngrade(entityId);
      
      this.entityLevels.set(entityId, targetLevel);
      
      const change: LevelChange = {
        entityId,
        entityType,
        fromLevel: currentLevel,
        toLevel: targetLevel,
        trigger,
        timestamp: new Date(),
        reason: `Trigger: ${trigger}`,
      };
      
      this.levelHistory.push(change);
      
      logger.info({ entityId, entityType, fromLevel: currentLevel, toLevel: targetLevel, trigger }, 'Entity upgraded');
    }
  }

  private scheduleDowngrade(entityId: string, targetLevel: RunLevel, reason: string): void {
    const currentLevel = this.entityLevels.get(entityId) || 'level3';
    
    if (this.levelToNumber(targetLevel) <= this.levelToNumber(currentLevel)) {
      this.cancelPendingDowngrade(entityId);
      
      const scheduledTime = new Date(Date.now() + this.config.downgradeDelayMs);
      this.pendingDowngrades.set(entityId, { scheduledLevel: targetLevel, scheduledTime });
      
      const timer = setTimeout(() => {
        this.executeDowngrade(entityId, reason);
      }, this.config.downgradeDelayMs);
      
      this.downgradeTimers.set(entityId, timer);
      
      logger.debug({ entityId, targetLevel, scheduledTime, reason }, 'Downgrade scheduled');
    }
  }

  private executeDowngrade(entityId: string, reason: string): void {
    const pending = this.pendingDowngrades.get(entityId);
    if (!pending) return;
    
    const currentLevel = this.entityLevels.get(entityId) || 'level3';
    
    this.entityLevels.set(entityId, pending.scheduledLevel);
    
    const change: LevelChange = {
      entityId,
      entityType: 'unknown',
      fromLevel: currentLevel,
      toLevel: pending.scheduledLevel,
      trigger: 'auto_downgrade',
      timestamp: new Date(),
      reason,
    };
    
    this.levelHistory.push(change);
    
    this.pendingDowngrades.delete(entityId);
    this.downgradeTimers.delete(entityId);
    
    logger.info({ entityId, fromLevel: currentLevel, toLevel: pending.scheduledLevel, reason }, 'Entity downgraded');
  }

  private cancelPendingDowngrade(entityId: string): void {
    const timer = this.downgradeTimers.get(entityId);
    if (timer) {
      clearTimeout(timer);
      this.downgradeTimers.delete(entityId);
    }
    this.pendingDowngrades.delete(entityId);
  }

  private checkUpgradeTriggers(trigger: string, targetId: string): void {
    if (trigger === 'location_change') {
      this.triggerUpgrade(targetId, 'city', 'level0', 'user_arrived');
    }
  }

  private levelToNumber(level: RunLevel): number {
    switch (level) {
      case 'level0': return 0;
      case 'level1': return 1;
      case 'level2': return 2;
      case 'level3': return 3;
    }
  }

  private recalculateAll(): void {
    logger.debug('Recalculating all entity levels');
  }

  startAutoDowngrade(): void {
    if (this.autoDowngradeInterval) return;

    this.autoDowngradeInterval = setInterval(() => {
      this.performAutoDowngrade();
    }, this.config.autoDowngradeIntervalMs);

    logger.info('Auto downgrade started');
  }

  stopAutoDowngrade(): void {
    if (this.autoDowngradeInterval) {
      clearInterval(this.autoDowngradeInterval);
      this.autoDowngradeInterval = null;
      logger.info('Auto downgrade stopped');
    }
  }

  private performAutoDowngrade(): void {
    logger.debug('Performing auto downgrade check');
  }

  getLevelHistory(limit?: number): LevelChange[] {
    return limit ? this.levelHistory.slice(-limit) : [...this.levelHistory];
  }

  getStats(): {
    entityCount: number;
    levelDistribution: Record<RunLevel, number>;
    pendingDowngrades: number;
    historyCount: number;
  } {
    const levelDistribution: Record<RunLevel, number> = {
      level0: 0,
      level1: 0,
      level2: 0,
      level3: 0,
    };

    for (const level of this.entityLevels.values()) {
      levelDistribution[level]++;
    }

    return {
      entityCount: this.entityLevels.size,
      levelDistribution,
      pendingDowngrades: this.pendingDowngrades.size,
      historyCount: this.levelHistory.length,
    };
  }

  getConfig(): VirtualityConfig {
    return { ...this.config };
  }

  clear(): void {
    this.entityLevels.clear();
    this.entityScores.clear();
    this.levelHistory = [];
    
    for (const timer of this.downgradeTimers.values()) {
      clearTimeout(timer);
    }
    this.downgradeTimers.clear();
    this.pendingDowngrades.clear();
    
    logger.info('Virtuality manager cleared');
  }
}