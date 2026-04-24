import { describe, it, expect, vi } from 'vitest';

describe('Default Tools', () => {
  it('should create find_job tool', async () => {
    const { createFindJobTool } = await import('../../src/agent/default-tools.js');
    const repo: any = {};
    const tool = createFindJobTool(repo);
    expect(tool.name).toBe('find_job');
    expect(tool.parameters).toHaveProperty('properties');
    const agent: any = { id: 'a1', worldId: 'w1', profile: { name: 'Test' }, state: {}, stats: {} };
    const result = await tool.execute({ jobType: '程序员' }, agent);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
  });

  it('should create buy_item tool and reject insufficient funds', async () => {
    const { createBuyItemTool } = await import('../../src/agent/default-tools.js');
    const repo: any = {};
    const tool = createBuyItemTool(repo);
    const agent: any = { id: 'a1', worldId: 'w1', profile: { name: 'Test' }, state: {}, stats: { money: 10 } };
    const result = await tool.execute({ item: 'iPhone', price: 9999 }, agent);
    expect(result.success).toBe(false);
  });

  it('should create rest tool and recover energy', async () => {
    const { createRestTool } = await import('../../src/agent/default-tools.js');
    const tool = createRestTool();
    const context: any = { id: 'a1', worldId: 'w1', profile: { name: 'Test' }, state: { status: 'idle' }, stats: { energy: 50 } };
    const result = await tool.execute({ duration: 4, type: '睡觉' }, context);
    expect(result.success).toBe(true);
    expect(result.statChanges).toBeDefined();
    expect(result.statChanges?.some((c: any) => c.stat === 'energy' && c.delta > 0)).toBe(true);
  });

  it('should register all default tools', async () => {
    const { registerDefaultTools } = await import('../../src/agent/default-tools.js');
    const registered: string[] = [];
    const registry = { register: (tool: any) => registered.push(tool.name) };
    registerDefaultTools(registry, {} as any);
    expect(registered).toContain('find_job');
    expect(registered).toContain('buy_item');
    expect(registered).toContain('socialize');
    expect(registered).toContain('rest');
    expect(registered).toContain('work');
  });
});
