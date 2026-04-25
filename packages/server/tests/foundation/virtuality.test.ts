import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualityManager, type RunLevel } from '../../src/foundation/virtuality/virtuality-manager.js';

describe('VirtualityManager', () => {
  let manager: VirtualityManager;

  beforeEach(() => {
    manager = new VirtualityManager();
  });

  describe('setUserContext', () => {
    it('should set user context', () => {
      manager.setUserContext({
        cityId: 'CN-SH-SHANGHAI',
        countryId: 'CN',
        relationships: new Map(),
        interests: [],
      });

      const stats = manager.getStats();
      expect(stats.entityCount).toBe(0);
    });
  });

  describe('updateUserLocation', () => {
    it('should update location', () => {
      manager.updateUserLocation('CN-SH-SHANGHAI', 'CN');

      const stats = manager.getStats();
      expect(stats.entityCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateLevel', () => {
    it('should return level3 for no user context', () => {
      const entity = {
        id: 'test-agent',
        type: 'agent',
        influenceLevel: 10,
        name: 'Test Agent',
        location: { cityId: 'CN-BJ-BEIJING', countryId: 'CN' },
      };

      const result = manager.calculateLevel(entity);
      expect(result.level).toBe('level3');
    });

    it('should return level0 for same city with high influence', () => {
      manager.setUserContext({
        cityId: 'CN-SH-SHANGHAI',
        countryId: 'CN',
        relationships: new Map(),
        interests: [],
      });

      const entity = {
        id: 'test-agent',
        type: 'agent',
        influenceLevel: 60,
        name: 'Test Agent',
        location: { cityId: 'CN-SH-SHANGHAI', countryId: 'CN' },
      };

      const result = manager.calculateLevel(entity);
      expect(result.level).toBe('level0');
      expect(result.geoScore).toBe(100);
      expect(result.totalScore).toBe(160);
    });

    it('should return level1 for same city with low influence', () => {
      manager.setUserContext({
        cityId: 'CN-SH-SHANGHAI',
        countryId: 'CN',
        relationships: new Map(),
        interests: [],
      });

      const entity = {
        id: 'test-agent',
        type: 'agent',
        influenceLevel: 10,
        name: 'Test Agent',
        location: { cityId: 'CN-SH-SHANGHAI', countryId: 'CN' },
      };

      const result = manager.calculateLevel(entity);
      expect(result.level).toBe('level1');
      expect(result.geoScore).toBe(100);
    });

    it('should return level1 for same country with moderate influence', () => {
      manager.setUserContext({
        cityId: 'CN-SH-SHANGHAI',
        countryId: 'CN',
        relationships: new Map(),
        interests: [],
      });

      const entity = {
        id: 'test-agent',
        type: 'agent',
        influenceLevel: 40,
        name: 'Test Agent',
        location: { cityId: 'CN-BJ-BEIJING', countryId: 'CN' },
      };

      const result = manager.calculateLevel(entity);
      expect(result.level).toBe('level1');
      expect(result.geoScore).toBe(50);
      expect(result.totalScore).toBe(90);
    });

    it('should return level2 for same country with low influence', () => {
      manager.setUserContext({
        cityId: 'CN-SH-SHANGHAI',
        countryId: 'CN',
        relationships: new Map(),
        interests: [],
      });

      const entity = {
        id: 'test-agent',
        type: 'agent',
        influenceLevel: 10,
        name: 'Test Agent',
        location: { cityId: 'CN-BJ-BEIJING', countryId: 'CN' },
      };

      const result = manager.calculateLevel(entity);
      expect(result.level).toBe('level2');
      expect(result.geoScore).toBe(50);
    });

    it('should handle global influence', () => {
      manager.setUserContext({
        cityId: 'CN-SH-SHANGHAI',
        countryId: 'CN',
        relationships: new Map(),
        interests: [],
      });

      const globalCompany = {
        id: 'google',
        type: 'company',
        influenceLevel: 50,
        name: 'Google',
        location: { countryId: 'US' },
      };

      const result = manager.calculateLevel(globalCompany);
      expect(result.influenceScore).toBe(50);
    });
  });

  describe('getEntityLevel', () => {
    it('should return level3 for unknown entity', () => {
      expect(manager.getEntityLevel('unknown')).toBe('level3');
    });

    it('should return stored level', () => {
      manager.setEntityLevel('test-entity', 'level0', 'test');
      expect(manager.getEntityLevel('test-entity')).toBe('level0');
    });
  });

  describe('setEntityLevel', () => {
    it('should set entity level', () => {
      manager.setEntityLevel('test-entity', 'level1', 'manual adjustment');

      expect(manager.getEntityLevel('test-entity')).toBe('level1');
    });

    it('should record level change history', () => {
      manager.setEntityLevel('test-entity', 'level1', 'test reason');

      const history = manager.getLevelHistory(1);
      expect(history.length).toBe(1);
      expect(history[0]?.toLevel).toBe('level1');
    });
  });

  describe('addUserRelationship', () => {
    it('should add relationship', () => {
      manager.setUserContext({
        cityId: 'CN-SH-SHANGHAI',
        countryId: 'CN',
        relationships: new Map(),
        interests: [],
      });

      manager.addUserRelationship('agent-1', 60, 'friend');

      const stats = manager.getStats();
      expect(stats.historyCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getStats', () => {
    it('should return stats', () => {
      const stats = manager.getStats();

      expect(stats).toHaveProperty('entityCount');
      expect(stats).toHaveProperty('levelDistribution');
      expect(stats).toHaveProperty('pendingDowngrades');
      expect(stats).toHaveProperty('historyCount');
      expect(stats.levelDistribution).toHaveProperty('level0');
      expect(stats.levelDistribution).toHaveProperty('level1');
      expect(stats.levelDistribution).toHaveProperty('level2');
      expect(stats.levelDistribution).toHaveProperty('level3');
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      manager.setEntityLevel('test-entity', 'level0', 'test');
      manager.clear();

      expect(manager.getEntityLevel('test-entity')).toBe('level3');
      expect(manager.getStats().entityCount).toBe(0);
    });
  });

  describe('startAutoDowngrade', () => {
    it('should start auto downgrade', () => {
      manager.startAutoDowngrade();
      manager.stopAutoDowngrade();
    });
  });
});