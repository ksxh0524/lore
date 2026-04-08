import { describe, it, expect, vi } from 'vitest';
import { RelationshipManager } from '../../src/agent/relationships.js';

function createMockRepo(relationships: any[] = []) {
  const relMap = new Map(relationships.map(r => [r.id, r]));
  return {
    getAgentRelationships: vi.fn().mockImplementation((agentId: string) =>
      Promise.resolve(relationships.filter(r => r.agentId === agentId)),
    ),
    createRelationship: vi.fn().mockImplementation((data: any) => {
      relMap.set(data.id, data);
      return Promise.resolve(data);
    }),
    updateRelationship: vi.fn().mockImplementation((id: string, data: any) => {
      const existing = relMap.get(id);
      const updated = { ...existing, ...data };
      relMap.set(id, updated);
      return Promise.resolve(updated);
    }),
  } as any;
}

describe('RelationshipManager', () => {
  it('should return null for non-existent relationship', async () => {
    const repo = createMockRepo();
    const rm = new RelationshipManager(repo);
    const result = await rm.get('a1', 'a2');
    expect(result).toBeNull();
  });

  it('should get all relationships for an agent', async () => {
    const rels = [
      { id: 'r1', agentId: 'a1', targetAgentId: 'a2', type: 'friend', intimacy: 40 },
      { id: 'r2', agentId: 'a1', targetAgentId: 'a3', type: 'stranger', intimacy: 0 },
    ];
    const repo = createMockRepo(rels);
    const rm = new RelationshipManager(repo);
    const result = await rm.getAll('a1');
    expect(result.length).toBe(2);
  });

  it('should get known agents (non-stranger)', async () => {
    const rels = [
      { id: 'r1', agentId: 'a1', targetAgentId: 'a2', type: 'friend', intimacy: 40 },
      { id: 'r2', agentId: 'a1', targetAgentId: 'a3', type: 'stranger', intimacy: 0 },
    ];
    const repo = createMockRepo(rels);
    const rm = new RelationshipManager(repo);
    const known = await rm.getKnownAgents('a1');
    expect(known).toEqual(['a2']);
  });

  it('should create bidirectional relationship on first update', async () => {
    const repo = createMockRepo();
    const rm = new RelationshipManager(repo);
    await rm.update('a1', 'a2', { intimacy: 5, type: 'acquaintance' });
    expect(repo.createRelationship).toHaveBeenCalledTimes(2);
  });

  it('should update existing relationship intimacy', async () => {
    const rels = [
      { id: 'r1', agentId: 'a1', targetAgentId: 'a2', type: 'friend', intimacy: 40 },
      { id: 'r2', agentId: 'a2', targetAgentId: 'a1', type: 'friend', intimacy: 35 },
    ];
    const repo = createMockRepo(rels);
    const rm = new RelationshipManager(repo);
    await rm.update('a1', 'a2', { intimacy: 10 });
    expect(repo.updateRelationship).toHaveBeenCalled();
  });
});
