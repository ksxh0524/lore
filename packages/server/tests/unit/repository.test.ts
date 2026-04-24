import { describe, it, expect, beforeEach } from 'vitest';
import { Repository } from '../../src/db/repository.js';
import { initTables } from '../../src/db/index.js';
import { nanoid } from 'nanoid';

describe('Repository', () => {
  let repo: Repository;

  beforeEach(() => {
    initTables();
    repo = new Repository();
  });

  describe('World operations', () => {
    it('should create a world', async () => {
      const world = await repo.createWorld({
        id: nanoid(),
        name: 'Test World',
        type: 'random',
      });
      expect(world).toBeDefined();
      expect(world.name).toBe('Test World');
      expect(world.status).toBe('initializing');
    });

    it('should get world by id', async () => {
      const id = nanoid();
      await repo.createWorld({
        id,
        name: 'Test World',
        type: 'random',
      });
      
      const world = await repo.getWorld(id);
      expect(world).toBeDefined();
      expect(world?.id).toBe(id);
    });

    it('should return null for non-existent world', async () => {
      const world = await repo.getWorld('non-existent');
      expect(world).toBeNull();
    });

    it('should list all worlds', async () => {
      await repo.createWorld({ id: nanoid(), name: 'World 1', type: 'random' });
      await repo.createWorld({ id: nanoid(), name: 'World 2', type: 'random' });
      
      const worlds = await repo.getAllWorlds();
      expect(worlds.length).toBeGreaterThanOrEqual(2);
    });

    it('should update world', async () => {
      const id = nanoid();
      await repo.createWorld({ id, name: 'Test World', type: 'random' });
      
      await repo.updateWorld(id, { status: 'running' });
      const world = await repo.getWorld(id);
      expect(world?.status).toBe('running');
    });
  });

  describe('Agent operations', () => {
    it('should create an agent', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const agent = await repo.createAgent({
        id: nanoid(),
        worldId,
        type: 'npc',
        profile: { name: 'Test Agent', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
        state: { status: 'idle', currentActivity: 'none', location: 'home' },
        stats: { mood: 70, health: 100, energy: 100, money: 1000 },
      });
      expect(agent).toBeDefined();
      expect(agent.profile.name).toBe('Test Agent');
    });

    it('should get agent by id', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const agentId = nanoid();
      await repo.createAgent({
        id: agentId,
        worldId,
        type: 'npc',
        profile: { name: 'Test Agent', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
        state: { status: 'idle', currentActivity: 'none', location: 'home' },
        stats: { mood: 70, health: 100, energy: 100, money: 1000 },
      });
      
      const agent = await repo.getAgent(agentId);
      expect(agent).toBeDefined();
      expect(agent?.id).toBe(agentId);
    });

    it('should get agents by world', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      await repo.createAgent({
        id: nanoid(),
        worldId,
        type: 'npc',
        profile: { name: 'Agent 1', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
        state: { status: 'idle', currentActivity: 'none', location: 'home' },
        stats: { mood: 70, health: 100, energy: 100, money: 1000 },
      });
      await repo.createAgent({
        id: nanoid(),
        worldId,
        type: 'npc',
        profile: { name: 'Agent 2', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
        state: { status: 'idle', currentActivity: 'none', location: 'home' },
        stats: { mood: 70, health: 100, energy: 100, money: 1000 },
      });
      
      const agents = await repo.getWorldAgents(worldId);
      expect(agents.length).toBe(2);
    });

    it('should update agent', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const agentId = nanoid();
      await repo.createAgent({
        id: agentId,
        worldId,
        type: 'npc',
        profile: { name: 'Old Name', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
        state: { status: 'idle', currentActivity: 'none', location: 'home' },
        stats: { mood: 70, health: 100, energy: 100, money: 1000 },
      });
      
      await repo.updateAgent(agentId, {
        profile: { name: 'New Name', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
      });
      
      const agent = await repo.getAgent(agentId);
      expect(agent?.profile.name).toBe('New Name');
    });
  });

  describe('Event operations', () => {
    it('should create an event', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const event = await repo.createEvent({
        id: nanoid(),
        worldId,
        type: 'world',
        description: 'Test event description',
        priority: 1,
        timestamp: new Date(),
      });
      expect(event).toBeDefined();
      expect(event.type).toBe('world');
      expect(event.description).toBe('Test event description');
    });

    it('should get events by world', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      await repo.createEvent({
        id: nanoid(), worldId, type: 'world', description: 'Event 1', timestamp: new Date(),
      });
      await repo.createEvent({
        id: nanoid(), worldId, type: 'world', description: 'Event 2', timestamp: new Date(),
      });
      
      const events = await repo.getWorldEvents(worldId);
      expect(events.length).toBe(2);
    });

    it('should mark event as processed', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const eventId = nanoid();
      await repo.createEvent({
        id: eventId, worldId, type: 'world', description: 'Test', timestamp: new Date(),
      });
      
      await repo.updateEventProcessed(eventId);
      const events = await repo.getWorldEvents(worldId);
      expect(events[0]?.processed).toBe(true);
    });
  });

  describe('Economy operations', () => {
    it('should create economy record', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const eco = await repo.createEconomy({
        id: nanoid(),
        worldId,
        agentId: nanoid(),
        balance: 1000,
      });
      expect(eco).toBeDefined();
      expect(eco.balance).toBe(1000);
    });

    it('should get agent economy', async () => {
      const worldId = nanoid();
      const agentId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      await repo.createEconomy({
        id: nanoid(),
        worldId,
        agentId,
        balance: 500,
      });
      
      const eco = await repo.getAgentEconomy(agentId);
      expect(eco).toBeDefined();
      expect(eco?.balance).toBe(500);
    });

    it('should update economy', async () => {
      const worldId = nanoid();
      const agentId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const ecoId = nanoid();
      await repo.createEconomy({
        id: ecoId,
        worldId,
        agentId,
        balance: 500,
      });
      
      await repo.updateEconomy(ecoId, { balance: 800, income: 200 });
      const eco = await repo.getAgentEconomy(agentId);
      expect(eco?.balance).toBe(800);
      expect(eco?.income).toBe(200);
    });
  });

  describe('Relationship operations', () => {
    it('should create relationship', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const agent1 = nanoid();
      const agent2 = nanoid();
      await repo.createAgent({
        id: agent1, worldId, type: 'npc',
        profile: { name: 'A1', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
        state: { status: 'idle', currentActivity: 'none', location: 'home' },
        stats: { mood: 70, health: 100, energy: 100, money: 1000 },
      });
      await repo.createAgent({
        id: agent2, worldId, type: 'npc',
        profile: { name: 'A2', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
        state: { status: 'idle', currentActivity: 'none', location: 'home' },
        stats: { mood: 70, health: 100, energy: 100, money: 1000 },
      });
      
      const rel = await repo.createRelationship({
        id: nanoid(),
        agentId: agent1,
        targetAgentId: agent2,
        worldId,
        type: 'friend',
        intimacy: 50,
      });
      expect(rel).toBeDefined();
      expect(rel.type).toBe('friend');
    });

    it('should get all relationships for an agent', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const agent1 = nanoid();
      const agent2 = nanoid();
      const agent3 = nanoid();
      await repo.createAgent({
        id: agent1, worldId, type: 'npc',
        profile: { name: 'A1', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
        state: { status: 'idle', currentActivity: 'none', location: 'home' },
        stats: { mood: 70, health: 100, energy: 100, money: 1000 },
      });
      await repo.createAgent({
        id: agent2, worldId, type: 'npc',
        profile: { name: 'A2', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
        state: { status: 'idle', currentActivity: 'none', location: 'home' },
        stats: { mood: 70, health: 100, energy: 100, money: 1000 },
      });
      await repo.createAgent({
        id: agent3, worldId, type: 'npc',
        profile: { name: 'A3', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
        state: { status: 'idle', currentActivity: 'none', location: 'home' },
        stats: { mood: 70, health: 100, energy: 100, money: 1000 },
      });
      
      await repo.createRelationship({
        id: nanoid(), agentId: agent1, targetAgentId: agent2, worldId, type: 'friend', intimacy: 50,
      });
      await repo.createRelationship({
        id: nanoid(), agentId: agent1, targetAgentId: agent3, worldId, type: 'colleague', intimacy: 30,
      });
      
      const rels = await repo.getAgentRelationships(agent1);
      expect(rels.length).toBe(2);
    });

    it('should update relationship', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const agent1 = nanoid();
      const agent2 = nanoid();
      await repo.createAgent({
        id: agent1, worldId, type: 'npc',
        profile: { name: 'A1', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
        state: { status: 'idle', currentActivity: 'none', location: 'home' },
        stats: { mood: 70, health: 100, energy: 100, money: 1000 },
      });
      await repo.createAgent({
        id: agent2, worldId, type: 'npc',
        profile: { name: 'A2', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
        state: { status: 'idle', currentActivity: 'none', location: 'home' },
        stats: { mood: 70, health: 100, energy: 100, money: 1000 },
      });
      
      const relId = nanoid();
      await repo.createRelationship({
        id: relId, agentId: agent1, targetAgentId: agent2, worldId, type: 'friend', intimacy: 50,
      });
      
      await repo.updateRelationship(relId, { intimacy: 80 });
      const rels = await repo.getAgentRelationships(agent1);
      expect(rels[0]?.intimacy).toBe(80);
    });
  });

  describe('Platform operations', () => {
    it('should create platform', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const platform = await repo.createPlatform({
        id: nanoid(),
        worldId,
        name: 'Test Platform',
        type: 'social',
      });
      expect(platform).toBeDefined();
      expect(platform.name).toBe('Test Platform');
    });

    it('should get world platforms', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      await repo.createPlatform({ id: nanoid(), worldId, name: 'Platform 1', type: 'social' });
      await repo.createPlatform({ id: nanoid(), worldId, name: 'Platform 2', type: 'video_short' });
      
      const platforms = await repo.getWorldPlatforms(worldId);
      expect(platforms.length).toBe(2);
    });

    it('should create platform post', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const platformId = nanoid();
      await repo.createPlatform({ id: platformId, worldId, name: 'Test', type: 'social' });
      
      const post = await repo.createPlatformPost({
        id: nanoid(),
        platformId,
        worldId,
        authorId: 'user',
        authorType: 'user',
        content: 'Test post',
      });
      expect(post).toBeDefined();
      expect(post.content).toBe('Test post');
    });

    it('should get platform posts', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const platformId = nanoid();
      await repo.createPlatform({ id: platformId, worldId, name: 'Test', type: 'social' });
      
      await repo.createPlatformPost({
        id: nanoid(), platformId, worldId, authorId: 'user', authorType: 'user', content: 'Post 1',
      });
      await repo.createPlatformPost({
        id: nanoid(), platformId, worldId, authorId: 'user', authorType: 'user', content: 'Post 2',
      });
      
      const posts = await repo.getPlatformPosts(platformId);
      expect(posts.length).toBe(2);
    });

    it('should update platform post', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const platformId = nanoid();
      await repo.createPlatform({ id: platformId, worldId, name: 'Test', type: 'social' });
      
      const postId = nanoid();
      await repo.createPlatformPost({
        id: postId, platformId, worldId, authorId: 'user', authorType: 'user', content: 'Test',
      });
      
      await repo.updatePlatformPost(postId, { likes: 10 });
      const post = await repo.getPlatformPost(postId);
      expect(post?.likes).toBe(10);
    });
  });

  describe('Memory operations', () => {
    it('should insert memory', async () => {
      const worldId = nanoid();
      const agentId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      await repo.createAgent({
        id: agentId, worldId, type: 'npc',
        profile: { name: 'Test', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
        state: { status: 'idle', currentActivity: 'none', location: 'home' },
        stats: { mood: 70, health: 100, energy: 100, money: 1000 },
      });
      
      const memory = await repo.insertMemory({
        id: nanoid(),
        agentId,
        type: 'recent',
        content: 'Test memory',
        importance: 0.5,
        memoryType: 'event',
        timestamp: new Date(),
      });
      expect(memory).toBeDefined();
      expect(memory.content).toBe('Test memory');
    });

    it('should get agent memories', async () => {
      const worldId = nanoid();
      const agentId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      await repo.createAgent({
        id: agentId, worldId, type: 'npc',
        profile: { name: 'Test', age: 25, gender: 'male', occupation: 'test', personality: 'happy', speechStyle: 'normal', backstory: '', likes: [], dislikes: [] },
        state: { status: 'idle', currentActivity: 'none', location: 'home' },
        stats: { mood: 70, health: 100, energy: 100, money: 1000 },
      });
      
      await repo.insertMemory({
        id: nanoid(), agentId, type: 'recent', content: 'Memory 1', importance: 0.5, memoryType: 'event', timestamp: new Date(),
      });
      await repo.insertMemory({
        id: nanoid(), agentId, type: 'recent', content: 'Memory 2', importance: 0.3, memoryType: 'action', timestamp: new Date(),
      });
      
      const memories = await repo.getAgentMemories(agentId);
      expect(memories.length).toBe(2);
    });
  });

  describe('Message operations', () => {
    it('should create message', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const msg = await repo.createMessage({
        id: nanoid(),
        worldId,
        fromAgentId: 'agent1',
        toAgentId: 'agent2',
        content: 'Hello!',
        type: 'chat',
      });
      expect(msg).toBeDefined();
      expect(msg.content).toBe('Hello!');
    });

    it('should get agent messages', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      await repo.createMessage({
        id: nanoid(), worldId, fromAgentId: 'agent1', toAgentId: 'agent2', content: 'Msg 1', type: 'chat',
      });
      await repo.createMessage({
        id: nanoid(), worldId, fromAgentId: 'agent2', toAgentId: 'agent1', content: 'Msg 2', type: 'chat',
      });
      
      const messages = await repo.getAgentMessages('agent1');
      expect(messages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Save operations', () => {
    it('should create save', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const save = await repo.createSave({
        id: nanoid(),
        worldId,
        name: 'Test Save',
        snapshot: { tick: 100 },
      });
      expect(save).toBeDefined();
      expect(save.name).toBe('Test Save');
    });

    it('should get saves', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      await repo.createSave({ id: nanoid(), worldId, name: 'Save 1', snapshot: {} });
      await repo.createSave({ id: nanoid(), worldId, name: 'Save 2', snapshot: {} });
      
      const saves = await repo.getSaves(worldId);
      expect(saves.length).toBe(2);
    });

    it('should get save by id', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const saveId = nanoid();
      await repo.createSave({ id: saveId, worldId, name: 'Test', snapshot: {} });
      
      const save = await repo.getSave(saveId);
      expect(save).toBeDefined();
      expect(save?.id).toBe(saveId);
    });

    it('should delete save', async () => {
      const worldId = nanoid();
      await repo.createWorld({ id: worldId, name: 'Test', type: 'random' });
      
      const saveId = nanoid();
      await repo.createSave({ id: saveId, worldId, name: 'Test', snapshot: {} });
      
      await repo.deleteSave(saveId);
      const save = await repo.getSave(saveId);
      expect(save).toBeNull();
    });
  });
});