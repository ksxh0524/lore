import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('logger', () => {
  const testDir = join(tmpdir(), `lore-test-logger-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('initLogger', () => {
    it('should return a logger instance', async () => {
      const { initLogger } = await import('../../src/logger/index.js');
      const logger = initLogger({ dir: testDir, console: false });
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.warn).toBe('function');
    });

    it('should return the same logger on subsequent calls', async () => {
      const { initLogger } = await import('../../src/logger/index.js');
      const logger1 = initLogger({ dir: testDir, console: false });
      const logger2 = initLogger({ dir: testDir, console: false });
      expect(logger1).toBe(logger2);
    });
  });

  describe('createLogger', () => {
    it('should return a child logger with context', async () => {
      const { initLogger, createLogger } = await import('../../src/logger/index.js');
      initLogger({ dir: testDir, console: false });
      const childLogger = createLogger('test-context');
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });
  });

  describe('cleanOldLogs', () => {
    it('should delete oldest files when exceeding maxFiles', async () => {
      const { initLogger } = await import('../../src/logger/index.js');
      for (let i = 0; i < 5; i++) {
        writeFileSync(join(testDir, `lore-2020-01-0${i + 1}.log`), 'test');
      }

      initLogger({ dir: testDir, maxFiles: 3, console: false });

      const remaining = readdirSync(testDir).filter(f => f.endsWith('.log'));
      expect(remaining.length).toBe(3);
    });

    it('should delete old files when total size exceeds maxSizeMB', async () => {
      const largeContent = 'x'.repeat(1024 * 1024);
      for (let i = 0; i < 4; i++) {
        writeFileSync(join(testDir, `lore-2020-01-0${i + 1}.log`), largeContent);
      }

      const { initLogger } = await import('../../src/logger/index.js');
      initLogger({ dir: testDir, maxFiles: 10, maxSizeMB: 2, console: false });

      const remaining = readdirSync(testDir).filter(f => f.endsWith('.log'));
      expect(remaining.length).toBeLessThan(5);
    });
  });
});
