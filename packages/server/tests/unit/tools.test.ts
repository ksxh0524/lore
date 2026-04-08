import { describe, it, expect, test } from 'vitest';
import { createFindJobTool, from '../agent/default-tools';
import type { AgentRuntime } from '../agent/agent-runtime';

vi.mock('../db/repository.js');
vi.mock('../agent/agent-runtime.js');

describe('Tools', () => {
  let repo: any;
  repo = { createEvent: vi.fn() };
  
  const tool = createFindJobTool(repo);
  
  it('should have correct name and description', () => {
    expect(tool.name).toBe('find_job');
    expect(tool.description).toContain('找工作');
  });
  
  it('should have parameters schema', () => {
    expect(tool.parameters).toHaveProperty('type');
    expect(tool.parameters).toHaveProperty('properties');
    expect(tool.parameters.properties).toHaveProperty('jobType');
    expect(tool.parameters.properties.jobType).toHaveProperty('type', 'string');
  });
  
  it('should execute and handle success', async () => {
    const agent = { id: 'a1', worldId: 'w1', profile: {} } as any;
    const result = await tool.execute({ jobType: '程序员' }, agent);
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(result.message).toContain('程序员');
  });
  
  it('should execute and handle failure', async () => {
    const agent = { id: 'a1', worldId: 'w1', profile: {} } as any;
    const result = await tool.execute({ jobType: '程序员', company: '失败 company' }, agent);
    
    expect(result.success).toBe(false);
  });
});
