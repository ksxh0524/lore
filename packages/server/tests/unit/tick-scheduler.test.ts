import { describe, it, expect, vi } from 'vitest';
import { TickScheduler } from '../../src/scheduler/tick-scheduler.js';

describe('TickScheduler', () => {
  it('should call onTick on interval', async () => {
    const onTick = vi.fn();
    const scheduler = new TickScheduler(100, onTick);
    scheduler.start();
    await new Promise(r => setTimeout(r, 350));
    scheduler.stop();
    expect(onTick.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('should not tick when paused', async () => {
    const onTick = vi.fn();
    const scheduler = new TickScheduler(50, onTick);
    scheduler.start();
    await new Promise(r => setTimeout(r, 120));
    scheduler.pause();
    const count = onTick.mock.calls.length;
    await new Promise(r => setTimeout(r, 150));
    scheduler.stop();
    expect(onTick.mock.calls.length).toBe(count);
  });

  it('should report correct state', () => {
    const scheduler = new TickScheduler(1000, vi.fn());
    expect(scheduler.isRunning()).toBe(false);
    scheduler.start();
    expect(scheduler.isRunning()).toBe(true);
    scheduler.pause();
    expect(scheduler.isRunning()).toBe(false);
    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });
});
