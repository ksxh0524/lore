import type { WorldEvent } from '@lore/shared';
import type { LLMScheduler } from '../llm/scheduler.js';
import { nanoid } from 'nanoid';

export class WorldAgent {
  private llmScheduler: LLMScheduler;
  private lastThinkTick = 0;

  constructor(llmScheduler: LLMScheduler) {
    this.llmScheduler = llmScheduler;
  }

  async think(worldState: { currentTick: number; currentTime: string; day: number; agentCount: number }): Promise<WorldEvent[]> {
    if (worldState.currentTick - this.lastThinkTick < 10) return [];
    this.lastThinkTick = worldState.currentTick;

    if (Math.random() > 0.3) return [];

    const events: WorldEvent[] = [];
    const types = ['晴天', '下雨', '起风', '气温骤降', '艳阳高照'];
    const desc = types[Math.floor(Math.random() * types.length)] ?? '风和日丽';

    events.push({
      id: nanoid(),
      worldId: '',
      type: 'world' as const,
      category: 'weather',
      description: desc,
      involvedAgents: [],
      timestamp: new Date(),
      processed: false,
      priority: 30,
    });

    return events;
  }
}
