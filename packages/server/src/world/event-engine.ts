import type { WorldEvent, EventConsequence } from '@lore/shared';
import type { WorldClock } from './clock.js';
import type { WorldAgent } from './world-agent.js';
import type { AgentManager } from '../agent/agent-manager.js';
import type { Repository } from '../db/repository.js';
import { nanoid } from 'nanoid';

interface AgentLike {
  id: string;
  worldId: string;
  profile: { name: string };
  stats: { mood: number; health: number; energy: number };
  state: { status: string; currentActivity: string };
}

const routineSchedule = [
  { hour: 7, category: 'morning', description: '新的一天开始了，该起床了', priority: 10 },
  { hour: 9, category: 'work', description: '上班时间到了', priority: 15 },
  { hour: 12, category: 'lunch', description: '午休时间，该吃午饭了', priority: 10 },
  { hour: 18, category: 'evening', description: '下班了，自由时间', priority: 15 },
  { hour: 22, category: 'night', description: '夜深了，该休息了', priority: 10 },
];

const randomEvents = [
  { category: 'overtime', description: '老板让你加班', probability: 0.10, priority: 40, statChanges: { energy: -10, mood: -5 } },
  { category: 'meet_acquaintance', description: '在街上遇到了一个熟人', probability: 0.05, priority: 35, relationshipDelta: 2 },
  { category: 'good_luck', description: '今天运气不错，捡到了一个小惊喜', probability: 0.01, priority: 45, statChanges: { mood: 10 } },
  { category: 'bad_luck', description: '今天真倒霉，出了点小状况', probability: 0.03, priority: 40, statChanges: { mood: -8 } },
  { category: 'illness', description: '身体有点不舒服', probability: 0.02, priority: 60, statChanges: { health: -15, energy: -10 } },
  { category: 'bonus', description: '意外收到了一笔奖金', probability: 0.02, priority: 50, statChanges: { mood: 15 } },
  { category: 'argument', description: '和人发生了口角', probability: 0.03, priority: 45, statChanges: { mood: -12 }, relationshipDelta: -5 },
  { category: 'gift', description: '收到了一份意外礼物', probability: 0.01, priority: 40, statChanges: { mood: 8 } },
];

export class EventEngine {
  private worldAgent: WorldAgent;
  private repo: Repository;
  private lastRoutineHour = -1;

  constructor(worldAgent: WorldAgent, repo: Repository) {
    this.worldAgent = worldAgent;
    this.repo = repo;
  }

  async generate(clock: WorldClock, agents: AgentLike[], worldState: { currentTick: number; currentTime: string; day: number; agentCount: number; worldId?: string | null }): Promise<WorldEvent[]> {
    const events: WorldEvent[] = [];
    const worldId = worldState.worldId ?? '';

    events.push(...this.generateRoutineEvents(clock, agents, worldId));
    events.push(...this.generateRandomEvents(agents, worldId));

    const worldEvents = await this.worldAgent.think(worldState);
    events.push(...worldEvents);

    for (const event of events) {
      if (!event.processed) {
        await this.repo.createEvent(event);
      }
    }

    return events;
  }

  async applyConsequences(event: WorldEvent, agentManager: AgentManager): Promise<void> {
    if (!event.consequences || event.processed) return;

    for (const c of event.consequences) {
      const agent = agentManager.get(c.agentId) as any;
      if (!agent) continue;

      if (c.statChanges) {
        agent.applyStatChanges(c.statChanges as any);

        if (agent.stats.health <= 0) {
          agent.state.status = 'dead';
          await agentManager.destroy(agent.id);
        }
      }
    }

    event.processed = true;
    await this.repo.updateEventProcessed(event.id);
  }

  private generateRoutineEvents(clock: WorldClock, agents: AgentLike[], worldId: string): WorldEvent[] {
    const events: WorldEvent[] = [];
    const time = clock.getTime();
    const currentHour = time.getHours();

    if (currentHour === this.lastRoutineHour) return events;
    this.lastRoutineHour = currentHour;

    const match = routineSchedule.find(r => r.hour === currentHour);
    if (!match) return events;

    const involved = agents.length > 0
      ? [agents[Math.floor(Math.random() * agents.length)]!.id]
      : [];

    events.push({
      id: nanoid(),
      worldId,
      type: 'routine',
      category: match.category,
      description: match.description,
      involvedAgents: involved,
      consequences: involved.map(id => ({
        agentId: id,
        statChanges: currentHour === 7 ? { energy: 20, mood: 5 } as any : currentHour === 22 ? { energy: -5 } as any : {},
      })),
      timestamp: new Date(),
      processed: false,
      priority: match.priority,
    });

    return events;
  }

  private generateRandomEvents(agents: AgentLike[], worldId: string): WorldEvent[] {
    const events: WorldEvent[] = [];
    for (const template of randomEvents) {
      if (Math.random() > template.probability) continue;
      if (agents.length === 0) continue;

      const agent = agents[Math.floor(Math.random() * agents.length)];
      if (!agent) continue;

      events.push({
        id: nanoid(),
        worldId,
        type: 'random',
        category: template.category,
        description: `${agent.profile.name}${template.description}`,
        involvedAgents: [agent.id],
        consequences: [{
          agentId: agent.id,
          statChanges: template.statChanges ?? {},
          ...(template.relationshipDelta ? { relationshipChange: { targetId: '', delta: template.relationshipDelta } } : {}),
        }],
        timestamp: new Date(),
        processed: false,
        priority: template.priority,
      });
    }
    return events;
  }
}
