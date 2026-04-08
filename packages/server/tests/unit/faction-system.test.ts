import { describe, it, expect, vi } from 'vitest';
import { FactionSystem } from '../../src/world/faction-system.js';

function createMockRepo(factions: any[] = []) {
  return {
    createFaction: vi.fn().mockImplementation((data: any) => Promise.resolve({ ...data, reputation: 50 })),
    getWorldFactions: vi.fn().mockImplementation((worldId: string) => {
      if (!worldId) return Promise.resolve(factions);
      return Promise.resolve(factions.filter(f => f.worldId === worldId));
    }),
    updateFaction: vi.fn().mockResolvedValue({}),
  } as any;
}

describe('FactionSystem', () => {
  it('should create a faction with leader as member', async () => {
    const repo = createMockRepo();
    const fs = new FactionSystem(repo);
    const faction = await fs.createFaction('w1', 'Test Clan', 'A test clan', 'leader-1');
    expect(faction.name).toBe('Test Clan');
    expect(repo.createFaction).toHaveBeenCalledWith(
      expect.objectContaining({ leaderId: 'leader-1', members: ['leader-1'] }),
    );
  });

  it('should add member to faction', async () => {
    const factions = [{ id: 'f1', worldId: 'w1', name: 'Clan', members: ['leader-1'], reputation: 50 }];
    const repo = createMockRepo(factions);
    const fs = new FactionSystem(repo);
    await fs.addMember('f1', 'agent-2');
    expect(repo.updateFaction).toHaveBeenCalledWith('f1', { members: ['leader-1', 'agent-2'] });
  });

  it('should not add duplicate member', async () => {
    const factions = [{ id: 'f1', worldId: 'w1', name: 'Clan', members: ['leader-1'], reputation: 50 }];
    const repo = createMockRepo(factions);
    const fs = new FactionSystem(repo);
    await fs.addMember('f1', 'leader-1');
    expect(repo.updateFaction).not.toHaveBeenCalled();
  });

  it('should remove member from faction', async () => {
    const factions = [{ id: 'f1', worldId: 'w1', name: 'Clan', members: ['a1', 'a2'], reputation: 50 }];
    const repo = createMockRepo(factions);
    const fs = new FactionSystem(repo);
    await fs.removeMember('f1', 'a1');
    expect(repo.updateFaction).toHaveBeenCalledWith('f1', { members: ['a2'] });
  });

  it('should update reputation with clamping', async () => {
    const factions = [{ id: 'f1', worldId: 'w1', name: 'Clan', members: ['a1'], reputation: 95 }];
    const repo = createMockRepo(factions);
    const fs = new FactionSystem(repo);
    await fs.updateReputation('f1', 20);
    expect(repo.updateFaction).toHaveBeenCalledWith('f1', { reputation: 100 });
  });

  it('should get agent factions by filtering members', async () => {
    const factions = [
      { id: 'f1', worldId: 'w1', name: 'Clan A', members: ['a1', 'a2'], reputation: 50 },
      { id: 'f2', worldId: 'w1', name: 'Clan B', members: ['a3'], reputation: 50 },
    ];
    const repo = createMockRepo(factions);
    const fs = new FactionSystem(repo);
    const agentFactions = await fs.getAgentFactions('a1');
    expect(agentFactions.length).toBe(1);
    expect(agentFactions[0].id).toBe('f1');
  });
});
