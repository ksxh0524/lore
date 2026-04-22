import type { AgentStats } from '@lore/shared';
import { agentEventBus } from './event-bus.js';

export interface StatChange {
  stat: keyof AgentStats;
  delta: number;
  reason?: string;
}

export interface StatModifier {
  id: string;
  stat: keyof AgentStats;
  value: number;
  type: 'add' | 'multiply' | 'set';
  duration?: number;
  source: string;
}

export class StatsManager {
  private stats: AgentStats;
  private modifiers: Map<string, StatModifier> = new Map();
  private readonly agentId: string;

  private readonly bounds: Record<keyof AgentStats, { min: number; max: number }> = {
    mood: { min: 0, max: 100 },
    health: { min: 0, max: 100 },
    energy: { min: 0, max: 100 },
    money: { min: 0, max: Infinity },
  };

  private readonly decayRates: Partial<Record<keyof AgentStats, number>> = {
    energy: -0.3,
  };

  private readonly recoveryRates: Partial<Record<keyof AgentStats, number>> = {
    energy: 5,
    health: 0.5,
    mood: 0.2,
  };

  constructor(agentId: string, initialStats: AgentStats) {
    this.agentId = agentId;
    this.stats = { ...initialStats };
  }

  getStats(): AgentStats {
    return { ...this.stats };
  }

  getStat(stat: keyof AgentStats): number {
    return this.stats[stat];
  }

  setStat(stat: keyof AgentStats, value: number, reason?: string): void {
    const oldValue = this.stats[stat];
    const bounded = this.applyBounds(stat, value);
    if (oldValue !== bounded) {
      this.stats[stat] = bounded;
      this.emitStatChange(stat, oldValue, bounded, bounded - oldValue, reason);
    }
  }

  changeStat(stat: keyof AgentStats, delta: number, reason?: string): void {
    if (delta === 0) return;
    const oldValue = this.stats[stat];
    const newValue = this.applyBounds(stat, oldValue + delta);
    if (oldValue !== newValue) {
      this.stats[stat] = newValue;
      this.emitStatChange(stat, oldValue, newValue, newValue - oldValue, reason);
    }
  }

  applyChanges(changes: StatChange[]): void {
    for (const change of changes) {
      this.changeStat(change.stat, change.delta, change.reason);
    }
  }

  private applyBounds(stat: keyof AgentStats, value: number): number {
    const bound = this.bounds[stat];
    if (bound) {
      return Math.max(bound.min, Math.min(bound.max, value));
    }
    return value;
  }

  private emitStatChange(
    stat: keyof AgentStats,
    oldValue: number,
    newValue: number,
    delta: number,
    reason?: string,
  ): void {
    agentEventBus.emitEvent({
      agentId: this.agentId,
      type: 'stat_changed',
      timestamp: new Date(),
      payload: {
        stat,
        oldValue,
        newValue,
        delta,
        reason,
      },
    });
  }

  addModifier(modifier: StatModifier): void {
    this.modifiers.set(modifier.id, modifier);
    this.recalculateStats();
  }

  removeModifier(id: string): void {
    if (this.modifiers.delete(id)) {
      this.recalculateStats();
    }
  }

  private recalculateStats(): void {
    for (const modifier of this.modifiers.values()) {
      if (modifier.type === 'add') {
        this.stats[modifier.stat] += modifier.value;
      } else if (modifier.type === 'multiply') {
        this.stats[modifier.stat] *= modifier.value;
      } else if (modifier.type === 'set') {
        this.stats[modifier.stat] = modifier.value;
      }
    }
  }

  update(isSleeping: boolean): void {
    if (isSleeping) {
      for (const [stat, rate] of Object.entries(this.recoveryRates)) {
        if (rate && this.stats[stat as keyof AgentStats] < this.bounds[stat as keyof AgentStats].max) {
          this.changeStat(stat as keyof AgentStats, rate, 'natural_recovery');
        }
      }
    } else {
      for (const [stat, rate] of Object.entries(this.decayRates)) {
        if (rate) {
          this.changeStat(stat as keyof AgentStats, rate, 'natural_decay');
        }
      }
      const moodBaseline = this.calculateMoodBaseline();
      const currentMood = this.stats.mood;
      if (currentMood > moodBaseline) {
        this.changeStat('mood', -0.2, 'mood_normalization');
      } else if (currentMood < moodBaseline) {
        this.changeStat('mood', 0.15, 'mood_normalization');
      }
    }
    for (const [id, modifier] of this.modifiers.entries()) {
      if (modifier.duration !== undefined) {
        modifier.duration--;
        if (modifier.duration <= 0) {
          this.removeModifier(id);
        }
      }
    }
  }

  private calculateMoodBaseline(): number {
    const healthFactor = this.stats.health / 100;
    const energyFactor = this.stats.energy / 100;
    const moneyFactor = Math.min(1, this.stats.money / 5000);
    return 30 + healthFactor * 20 + energyFactor * 20 + moneyFactor * 10;
  }

  isCritical(stat: keyof AgentStats): boolean {
    const value = this.stats[stat];
    const bound = this.bounds[stat];
    if (!bound) return false;
    const criticalThreshold = (bound.max - bound.min) * 0.15;
    return value <= bound.min + criticalThreshold;
  }

  isHealthy(): boolean {
    return this.stats.health > 50 && this.stats.energy > 30 && this.stats.mood > 30;
  }

  shouldSleep(): boolean {
    return this.stats.energy < 15 || (this.stats.energy < 30 && this.stats.health < 50);
  }

  canWakeUp(): boolean {
    return this.stats.energy >= 80;
  }

  serialize(): AgentStats {
    return { ...this.stats };
  }
}
